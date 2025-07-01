import { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CodePreview from './components/CodePreview';

// Main App component
function App() {
  // Access global Firebase configuration and app ID from the Canvas environment.
  // These are provided directly by the environment and parsed from strings.
  // We explicitly check for __firebase_config and __app_id to avoid errors if they are not defined.
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  const projectIdFromCanvas = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // Log the loaded Firebase config for debugging.
  console.log("DEBUG: firebaseConfig loaded (from global vars):", firebaseConfig);
  console.log("DEBUG: projectId (from global __app_id):", projectIdFromCanvas);

  // State for Firebase instances and user authentication status
  const [db, setDb] = useState(null); // Firestore database instance
  const [auth, setAuth] = useState(null); // Firebase Auth instance
  const [userId, setUserId] = useState(null); // Current authenticated user's ID
  const [loadingFirebase, setLoadingFirebase] = useState(true); // Loading state for Firebase initialization
  const [userThemes, setUserThemes] = useState([]); // State to store user's saved themes
  const [feedbackMessage, setFeedbackMessage] = useState(''); // State for UI feedback messages (e.g., "Theme saved!")

  // Effect hook to dynamically load Firebase SDK scripts from CDN
  // This approach is used for environments where direct npm imports might not be resolved,
  // relying on Firebase populating a global 'window.firebase' object.
  useEffect(() => {
    console.log('Firebase useEffect running');

    // Helper function to dynamically load a script from a given URL
    const loadScript = (src, id) => {
      return new Promise((resolve, reject) => {
        // Prevent double loading if the script tag already exists in the document head
        if (document.getElementById(id)) {
          console.log(`Script ${id} already loaded.`);
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = true; // Load asynchronously
        script.defer = true; // Defer execution until HTML is parsed
        script.onload = () => {
          console.log(`Script ${id} loaded successfully.`);
          resolve();
        };
        script.onerror = () => {
          console.error(`Failed to load script: ${src}`);
          reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script); // Append the script to the document's head
      });
    };

    const loadFirebaseScriptsAndInit = async () => {
      try {
        setFeedbackMessage('Loading Firebase services...');

        // Load Firebase core, authentication, and Firestore compatibility builds from CDN.
        // These compatibility builds make Firebase functions available globally on 'window.firebase'.
        await loadScript('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js', 'firebase-app-script');
        await loadScript('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth-compat.js', 'firebase-auth-script');
        await loadScript('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore-compat.js', 'firebase-firestore-script');

        // Introduce a small delay to ensure that the CDN scripts are fully processed and
        // the global 'window.firebase' object and its modules are completely ready.
        await new Promise(resolve => setTimeout(resolve, 100));

        // After loading, verify that the necessary Firebase global objects are available.
        if (window.firebase && window.firebase.initializeApp && window.firebase.firestore && window.firebase.auth) {
          console.log("Firebase CDN scripts loaded successfully. Initializing Firebase app (compatibility API).");

          // Initialize the Firebase app with the provided configuration.
          const appInstance = window.firebase.initializeApp(firebaseConfig);
          // Get instances of Firestore and Auth services using the compatibility API.
          const firestoreDb = window.firebase.firestore(appInstance);
          const firebaseAuth = window.firebase.auth(appInstance);

          setDb(firestoreDb); // Store the Firestore instance in component state
          setAuth(firebaseAuth); // Store the Auth instance in component state

          // Listen for authentication state changes (user login/logout/initial state).
          // onAuthStateChanged is a method directly available on the auth instance from the compatibility build.
          const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
              // If a user is logged in, set their UID and fetch their saved themes.
              setUserId(user.uid);
              const themes = await fetchUserThemes(firestoreDb, user.uid);
              setUserThemes(themes);
            } else {
              // If no user is logged in, attempt to sign in anonymously or with a custom token.
              try {
                // If an initial custom authentication token is provided (e.g., by the hosting environment), use it.
                // Otherwise, fall back to anonymous sign-in.
                if (initialAuthToken) {
                  await firebaseAuth.signInWithCustomToken(initialAuthToken);
                } else {
                  await firebaseAuth.signInAnonymously();
                }
                // Set the user ID after successful sign-in.
                setUserId(firebaseAuth.currentUser.uid);
                // Fetch themes for the newly authenticated user.
                const themes = await fetchUserThemes(firestoreDb, firebaseAuth.currentUser.uid);
                setUserThemes(themes);
              } catch (error) {
                console.error("Error during Firebase authentication:", error);
                setFeedbackMessage('Error: Could not sign in to save themes. ' + error.message);
              }
            }
            setLoadingFirebase(false); // Firebase initialization and initial auth check are complete.
          });

          // Return a cleanup function for the effect: unsubscribe from auth state changes
          // when the component unmounts or the dependencies change.
          return () => unsubscribe();
        } else {
          // If Firebase global objects are not found after attempting to load scripts, throw an error.
          throw new Error("Firebase global objects not found after CDN script loading. Check CDN URLs or compatibility builds.");
        }
      } catch (scriptLoadError) {
        // Catch and log any errors that occur during script loading or Firebase initialization.
        console.error("Failed to load Firebase CDN scripts or initialize Firebase:", scriptLoadError);
        setFeedbackMessage(`Error: Firebase services could not be loaded. Theme saving/loading will not work. Details: ${scriptLoadError.message}`);
        setDb(null); // Clear Firestore instance state on error.
        setAuth(null); // Clear Auth instance state on error.
        setLoadingFirebase(false); // Set loading to false as initialization failed.
      }
    };

    // This condition prevents redundant Firebase initialization if it's already set up.
    // It checks if `window.firebase` is available or if `db` and `auth` states are already populated.
    if (!window.firebase || !window.firebase.initializeApp || !db || !auth) {
      loadFirebaseScriptsAndInit();
    } else {
       // If Firebase is already available (e.g., on a hot reload), ensure current user state is updated.
      const firebaseAuth = window.firebase.auth(); // Get auth instance from global firebase
      if (firebaseAuth.currentUser) {
        setUserId(firebaseAuth.currentUser.uid);
        // Use compatibility API for firestore to fetch themes for the current user.
        window.firebase.firestore().collection(`artifacts/${projectIdFromCanvas}/users/${firebaseAuth.currentUser.uid}/themes`).get()
          .then(snapshot => {
            const themes = [];
            snapshot.forEach(doc => themes.push(doc.data().name));
            setUserThemes(themes);
          })
          .catch(e => console.error("Error fetching themes on re-init:", e))
          .finally(() => setLoadingFirebase(false));
      } else {
        // If no user on re-init, re-attempt anonymous sign-in.
        firebaseAuth.signInAnonymously()
          .then(userCredential => {
            setUserId(userCredential.user.uid);
            // Use compatibility API for firestore to fetch themes for the newly signed-in user.
            return window.firebase.firestore().collection(`artifacts/${projectIdFromCanvas}/users/${userCredential.user.uid}/themes`).get();
          })
          .then(snapshot => {
            const themes = [];
            snapshot.forEach(doc => themes.push(doc.data().name));
            setUserThemes(themes);
          })
          .catch(e => console.error("Error signing in anonymously on re-init:", e))
          .finally(() => setLoadingFirebase(false));
      }
      setDb(window.firebase.firestore()); // Set Firestore instance from global object
      setAuth(firebaseAuth); // Set Auth instance from global object
    }

    console.log('Firebase useEffect finished');
  }, [initialAuthToken, firebaseConfig.apiKey]); // Re-run effect if auth token or API key changes.


  // --- Theme State Management ---
  // These states hold the current values of the theme properties, allowing real-time updates.
  const [themeName, setThemeName] = useState('My Awesome Theme');
  const [background, setBackground] = useState('#1e1e1e');
  const [foreground, setForeground] = useState('#d4d4d4');
  const [accent, setAccent] = useState('#569cd6');
  const [sidebarBackground, setSidebarBackground] = useState('#252526');
  const [statusBarBackground, setStatusBarBackground] = useState('#007ACC');
  const [commentColor, setCommentColor] = useState('#6A9955');
  const [stringColor, setStringColor] = useState('#CE9178');
  const fileInputRef = useRef(null); // Ref for the hidden file input element, used for importing themes.

  // State for the editable code snippet displayed in the preview area.
  // Updated to precisely match the user's provided image
  const initialCode = `import { Plugin } from "obsidian";
export default class SystemDarkMode extends Plugin {
async onload() {
// Watch for system changes to color theme
const media = window.matchMedia("(prefers-color-scheme: dark)");

const callback = () => {
if (media.matches) {
console.log("Dark mode active");
this.updateStyle(true);
} else {
console.log("Light mode active");
this.updateStyle(false);
}
};
media.addEventListener("change", callback);

// Remove listener when we unload
this.register(() => media.removeEventListener("change", callback));

callback();
}
}
`;
  const [editableCode, setEditableCode] = useState(initialCode);

  // Helper to HTML escape text content
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  };

  // Manual syntax highlighting function - Revised for clean, single-pass processing
  const highlightCode = (codeString) => {
    let finalHtml = [];
    const lines = codeString.split('\n');

    // Define patterns with distinct 'type' for clarity and easier processing.
    // Order matters in terms of priority for matching (more specific first).
    const patterns = [
      { regex: /(\/\/.*)/g, type: 'comment', style: { color: commentColor, fontStyle: 'italic' } },
      { regex: /("|`|')(?:(?=(\\?))\2.)*?\1/g, type: 'string', style: { color: stringColor } },
      { regex: /\b(import|export|default|class|extends|async|function|const|let|if|else|return|this|window|Plugin)\b/g, type: 'keyword', style: { color: accent } },
      { regex: /\b(console|media|callback)\b/g, type: 'builtin', style: { color: '#9CDCFE' } },
      { regex: /\b(log|matchMedia|addEventListener|removeEventListener|register|onload|updateStyle)\b/g, type: 'method-prop', style: { color: '#DCDCAA' } },
      { regex: /\b(true|false|null|undefined)\b/g, type: 'boolean', style: { color: accent } },
      { regex: /\b(\d+)\b/g, type: 'number', style: { color: '#b8d7a3' } },
      { regex: /\b([A-Z][a-zA-Z0-9_]*)\b/g, type: 'class-name', style: { color: '#4EC9B0' } },
      { regex: /(\{|\}|\(|\)|\[|\]|;|,|:|=|\+|-|\*|\/|\.)/g, style: { color: foreground } },
    ];

    lines.forEach(line => {
      let currentLine = line; // Work with the original line to match regexes
      let highlightedSegments = [];
      let lastIndex = 0;

      // Collect all potential matches for the current line
      let matches = [];
      patterns.forEach(p => {
        let regex = new RegExp(p.regex.source, 'g');
        let match;
        while ((match = regex.exec(currentLine)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            style: p.style
          });
        }
      });

      // Sort matches by their starting index, then by length (longer matches preferred for overlaps)
      matches.sort((a, b) => {
        if (a.start !== b.start) {
          return a.start - b.start;
        }
        return b.end - a.end; // Prioritize longer matches that start at the same point
      });

      // Process the line, adding plain text and then highlighted segments
      matches.forEach(match => {
        // Add any text before this match that hasn't been processed
        if (match.start > lastIndex) {
          highlightedSegments.push(escapeHtml(currentLine.substring(lastIndex, match.start)));
        }

        // Only add the highlight if it doesn't overlap with a previously added segment
        // This is a simplified overlap check, assuming sorted, non-overlapping adds.
        // A more robust solution might involve a `segments` array where each segment is {start, end, type, content}.
        // For current patterns, this sequential check is generally sufficient if patterns are well-ordered.
        const styleProps = Object.entries(match.style).map(([key, value]) => `${key}:${value}`).join(';');
        highlightedSegments.push(`<span style="${styleProps}">${escapeHtml(match.text)}</span>`);
        lastIndex = Math.max(lastIndex, match.end); // Advance lastIndex past the end of the current match
      });

      // Add any remaining text at the end of the line
      if (lastIndex < currentLine.length) {
        highlightedSegments.push(escapeHtml(currentLine.substring(lastIndex)));
      }

      finalHtml.push(highlightedSegments.join(''));
    });

    return finalHtml.join('<br />');
  };


  // --- Theme Presets ---
  // An array of predefined theme configurations for users to quickly apply.
  const presets = [
    {
      name: 'Dark+ (Default)',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      accent: '#569cd6',
      sidebarBackground: '#252526',
      statusBarBackground: '#007ACC',
      commentColor: '#6A9955',
      stringColor: '#CE9178',
    },
    {
      name: 'Monokai',
      background: '#272822',
      foreground: '#F8F8F2',
      accent: '#F92672',
      sidebarBackground: '#272822',
      statusBarBackground: '#49483E',
      commentColor: '#75715E',
      stringColor: '#E6DB74',
    },
    {
      name: 'Light+',
      background: '#FFFFFF',
      foreground: '#000000',
      accent: '#007ACC',
      sidebarBackground: '#F3F3F3',
      statusBarBackground: '#007ACC',
      commentColor: '#008000',
      stringColor: '#A31515',
    },
    {
      name: 'Obsidian Inspired', // Updated colors for better clarity and contrast
      background: '#292b2e', // Dark charcoal/blue-grey
      foreground: '#E0E0E0', // Lighter off-white for general text
      accent: '#82B1FF',     // Brighter blue for keywords/functions
      sidebarBackground: '#292b2e',
      statusBarBackground: '#3a3a3a', // Slightly darker than background for contrast
      commentColor: '#808080',      // Clearer grey for comments
      stringColor: '#FFCC66',      // Yellow-orange for strings (more distinct)
    },
  ];

  // Function to apply a selected preset's colors and name to the current theme state.
  const loadPreset = (preset) => {
    setThemeName(preset.name);
    setBackground(preset.background);
    setForeground(preset.foreground);
    setAccent(preset.accent);
    setSidebarBackground(preset.sidebarBackground);
    setStatusBarBackground(preset.statusBarBackground);
    setCommentColor(preset.commentColor);
    setStringColor(preset.stringColor);
    setFeedbackMessage(`Preset "${preset.name}" loaded!`); // Display confirmation message to the user.
    setTimeout(() => setFeedbackMessage(''), 3000); // Clear the message after 3 seconds.
  };

  // --- Firestore Operations ---
  // Function to save the current theme's configuration to Firestore.
  const saveTheme = async () => {
    console.log('db:', db, 'auth:', auth, 'userId:', userId); // Log current Firebase states for debugging.
    if (!db || !userId || !auth) {
      setFeedbackMessage("Error: Firebase services not available. Cannot save theme.");
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }
    // Create a URL-friendly slug from the theme name to use as a document ID in Firestore.
    const themeSlug = themeName.replace(/\s+/g, '_').toLowerCase() || 'untitled_theme';
    try {
      // Access the Firestore collection for user-specific themes and get a reference to the specific document.
      // The path follows the pattern: `artifacts/{projectId}/users/${userId}/themes/{themeSlug}`.
      const themeDocRef = db.collection(`artifacts/${projectIdFromCanvas}/users/${userId}/themes`).doc(themeSlug);
      // Use `set()` to save the theme data. This will create the document if it doesn't exist or overwrite it if it does.
      await themeDocRef.set({
        name: themeName,
        background,
        foreground,
        accent,
        sidebarBackground,
        statusBarBackground,
        commentColor,
        stringColor,
        editableCode,
        timestamp: new Date().toISOString() // Store a timestamp for when the theme was last saved.
      });
      setFeedbackMessage('Theme saved successfully!');
      // After successfully saving, re-fetch the list of user's themes to update the sidebar's display.
      const updatedThemes = await fetchUserThemes(db, userId);
      setUserThemes(updatedThemes);
    } catch (e) {
      console.error("Error saving document: ", e);
      setFeedbackMessage('Error saving theme: ' + e.message);
    } finally {
      setTimeout(() => setFeedbackMessage(''), 3000); // Clear the feedback message after a delay.
    }
  };

  // Function to load a previously saved theme's configuration from Firestore.
  const loadSavedTheme = async (selectedThemeName) => {
    if (!db || !userId || !auth) { // Ensure Firebase services and user are available.
      setFeedbackMessage("Error: Firebase services not available. Cannot load theme.");
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }
    // Create the slug from the selected theme name to retrieve the correct document.
    const themeSlug = selectedThemeName.replace(/\s+/g, '_').toLowerCase();
    try {
      const themeDocRef = db.collection(`artifacts/${projectIdFromCanvas}/users/${userId}/themes`).doc(themeSlug);
      const docSnap = await themeDocRef.get(); // Fetch the document snapshot from Firestore.
      if (docSnap.exists) { // Check if the document actually exists in Firestore.
        const data = docSnap.data(); // Retrieve the data from the document.
        // Update all the theme state variables with the loaded data.
        // Provide default fallback values in case a property is missing in the saved data.
        setThemeName(data.name || '');
        setBackground(data.background || '#1e1e1e');
        setForeground(data.foreground || '#d4d4d4');
        setAccent(data.accent || '#569cd6');
        setSidebarBackground(data.sidebarBackground || '#252526');
        setStatusBarBackground(data.statusBarBackground || '#007ACC');
        setCommentColor(data.commentColor || '#6A9955');
        setStringColor(data.stringColor || '#CE9178');
        setEditableCode(data.editableCode || initialCode); // Load saved code, or the initial example code.
        setFeedbackMessage(`Theme "${data.name}" loaded!`); // Confirm to the user.
      } else {
        setFeedbackMessage('Theme not found!'); // Inform user if theme doesn't exist.
      }
    } catch (e) {
      console.error("Error loading document: ", e);
      setFeedbackMessage('Error loading theme: ' + e.message);
    } finally {
      setTimeout(() => setFeedbackMessage(''), 3000); // Clear feedback after a delay.
    }
  };

  // Function to fetch the names of all themes saved by the current user from Firestore.
  const fetchUserThemes = async (firestoreDb, currentUserId) => {
    if (!firestoreDb || !currentUserId) {
      console.warn("Firestore not initialized or user not authenticated for fetching themes.");
      return [];
    }
    try {
      // Get a reference to the collection containing all themes for the current user.
      const themesCollectionRef = firestoreDb.collection(`artifacts/${projectIdFromCanvas}/users/${currentUserId}/themes`);
      const querySnapshot = await themesCollectionRef.get(); // Get all documents in that collection.
      const themes = [];
      querySnapshot.forEach((doc) => {
        themes.push(doc.data().name); // Extract only the name of each theme.
      });
      return themes;
    } catch (e) {
      console.error("Error fetching themes: ", e);
      setFeedbackMessage('Error fetching saved themes: ' + e.message);
      setTimeout(() => setFeedbackMessage(''), 3000);
      return [];
    }
  };

  // --- Export and Import Functions ---
  // Handles exporting the current theme's configuration as a VS Code compatible JSON file.
  function handleExport() {
    // Construct the JSON object in the format expected by VS Code themes.
    const themeJson = {
      name: themeName,
      type: 'dark', // Most VS Code themes specify 'dark' or 'light'. For this app, we default to dark.
      colors: {
        'editor.background': background,
        'editor.foreground': foreground,
        'activityBarBadge.background': accent,
        'activityBarBadge.foreground': foreground,
        'sideBar.background': sidebarBackground,
        'sideBar.foreground': foreground,
        'statusBar.background': statusBarBackground,
        'statusBar.foreground': foreground,
        'tab.activeBackground': background,
        'tab.activeForeground': accent,
      },
      // Define colors for various syntax token scopes.
      tokenColors: [
        { scope: 'comment', settings: { foreground: commentColor, fontStyle: 'italic' } },
        { scope: 'string', settings: { foreground: stringColor } },
        { scope: 'keyword, function, boolean', settings: { foreground: accent } },
        { scope: 'number, builtin, variable, operator, punctuation', settings: { foreground: foreground } },
        { scope: 'class-name, property, tag', settings: { foreground: '#4EC9B0' } }, // Example hardcoded syntax color
        { scope: 'attr-name', settings: { foreground: '#9CDCFE' } }, // Example hardcoded syntax color
      ],
    };

    // Create a Blob containing the JSON data, formatted for readability.
    const blob = new Blob([JSON.stringify(themeJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); // Create a temporary URL for the Blob.
    const a = document.createElement('a'); // Create a dummy anchor (<a>) element.
    a.href = url; // Set its href to the Blob URL.
    a.download = `${themeName.replace(/\s+/g, '_').toLowerCase() || 'theme'}.json`; // Set the suggested filename for download.
    document.body.appendChild(a); // Temporarily append the anchor to the body (required for some browsers).
    a.click(); // Programmatically click the anchor to trigger the download.
    document.body.removeChild(a); // Remove the temporary anchor from the DOM.
    URL.revokeObjectURL(url); // Clean up the Blob URL to free memory.
    setFeedbackMessage('Theme exported successfully!');
    setTimeout(() => setFeedbackMessage(''), 3000);
  }

  // Triggers the hidden file input element when the "Import" button is clicked.
  function handleImportClick() {
    if (fileInputRef.current) fileInputRef.current.value = ''; // Clear previous file selection, if any.
    fileInputRef.current?.click(); // Programmatically click the hidden file input.
  }

  // Handles reading the selected JSON file for theme import.
  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0]; // Get the first file selected by the user.
    if (!file) {
      console.warn('No file selected.');
      return;
    }
    const reader = new FileReader(); // Create a new FileReader object.
    reader.onload = (event) => { // Define what happens when the file is successfully read.
      try {
        const json = JSON.parse(event.target.result); // Parse the file content as a JSON object.
        // Update the application's theme states with the imported JSON data.
        // Provide checks for property existence to prevent errors from malformed JSON.
        if (json.name) setThemeName(json.name);
        if (json.colors) {
          if (json.colors['editor.background']) setBackground(json.colors['editor.background']);
          if (json.colors['editor.foreground']) setForeground(json.colors['editor.foreground']);
          if (json.colors['activityBarBadge.background']) setAccent(json.colors['activityBarBadge.background']);
          if (json.colors['sideBar.background']) setSidebarBackground(json.colors['sideBar.background']);
          if (json.colors['statusBar.background']) setStatusBarBackground(json.colors['statusBar.background']);
        }
        if (json.tokenColors) {
          // Find and apply specific token colors like comment and string.
          const commentToken = json.tokenColors.find(tc => tc.scope === 'comment');
          if (commentToken && commentToken.settings && commentToken.settings.foreground) {
            setCommentColor(commentToken.settings.foreground);
          }
          const stringToken = json.tokenColors.find(tc => tc.scope === 'string');
          if (stringToken && stringToken.settings && stringToken.settings.foreground) {
            setStringColor(stringToken.settings.foreground);
          }
        }
        setFeedbackMessage('Theme imported successfully!');
      } catch (err) {
        console.error('Error parsing JSON file:', err);
        setFeedbackMessage('Invalid VS Code theme JSON file. Please check the file format.');
      } finally {
        setTimeout(() => setFeedbackMessage(''), 3000); // Clear feedback message.
      }
    };
    reader.readAsText(file); // Start reading the file as plain text.
  }

  return (
    // Main container div for the entire application layout.
    // Applies a full screen height, centers content, and uses a gradient background with animation.
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-gray-900 to-gray-800 animate-gradient font-sans">
      {/* Inline style block for defining the CSS gradient animation. */}
      <style>
        {`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradient {
            background-size: 400% 400%; /* Large background size for smooth animation */
            animation: gradient 15s ease infinite; /* Apply the animation */
          }
        `}
      </style>
      {/* Inner container for the main content (Sidebar and CodePreview).
          Uses flexbox for responsive layout: column on small screens, row on medium and up. */}
      <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-12 p-6 md:p-12">
        {/* Sidebar component, responsible for theme customization inputs and controls.
            All necessary state variables and handler functions are passed as props. */}
        <Sidebar
          themeName={themeName} setThemeName={setThemeName}
          background={background} setBackground={setBackground}
          foreground={foreground} setForeground={setForeground}
          accent={accent} setAccent={setAccent}
          sidebarBackground={sidebarBackground} setSidebarBackground={setSidebarBackground}
          statusBarBackground={statusBarBackground} setStatusBarBackground={statusBarBackground}
          commentColor={commentColor} setCommentColor={setCommentColor}
          stringColor={stringColor} setStringColor={setStringColor}
          handleExport={handleExport}
          handleImportClick={handleImportClick}
          presets={presets}
          loadPreset={loadPreset}
          userThemes={userThemes}
          loadSavedTheme={loadSavedTheme}
          saveTheme={saveTheme}
          feedbackMessage={feedbackMessage}
          loadingFirebase={loadingFirebase}
          userId={userId} // Pass userId to Sidebar for display purposes.
        />
        {/* CodePreview component, which displays the live, syntax-highlighted code.
            It receives the code content, updater, highlighter function, and current theme colors. */}
        <CodePreview
          code={editableCode}
          setCode={setEditableCode}
          highlightCode={highlightCode}
          background={background}
          foreground={foreground}
          accent={accent}
        />
      </div>
    </div>
  );
}

export default App;
