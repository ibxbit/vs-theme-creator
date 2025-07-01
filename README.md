# VS Code Theme Creator

A modern web app to design, preview, and export your own custom Visual Studio Code themes—no coding required!

---

## ✨ Features

- **Live Theme Customization:** Instantly adjust background, foreground, accent, sidebar, status bar, and syntax colors.
- **Real-Time Code Preview:** See your theme applied to code with live syntax highlighting.
- **Preset Themes:** Start from popular color schemes like Dark+, Monokai, Light+, and Obsidian-inspired.
- **Save & Load Themes:** Securely save your custom themes to the cloud (Firebase) and reload them anytime.
- **Export to VS Code:** Download your theme as a ready-to-use `.json` file for Visual Studio Code.
- **Import Existing Themes:** Load and edit any VS Code theme JSON file.
- **User Authentication:** Anonymous sign-in for saving and managing your themes.

---

## 🚀 Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/ibxbit/vs-theme-creator.git
   cd vs-theme-creator
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Start the development server:**
   ```sh
   npm run dev
   ```

4. **Open in your browser:**  
   Visit [http://localhost:5173](http://localhost:5173) (or the URL shown in your terminal).

---

## 🖌️ How It Works

- Use the sidebar to customize your theme's colors.
- Preview your changes in real time with the code editor.
- Save your favorite themes to your account.
- Export your theme as a VS Code theme JSON file and use it in your editor.

---

## 📦 Exporting & Using Your Theme in VS Code

1. Click **Export** to download your theme as a `.json` file.
2. In VS Code, open the Command Palette and select `Preferences: Color Theme`.
3. Use the `Developer: Inspect Editor Tokens and Scopes` command to fine-tune your theme if needed.
4. For personal use, place your theme file in your `.vscode/extensions` folder or package it as a VS Code extension.

---

## 🛠️ Built With

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Firebase](https://firebase.google.com/) (for authentication and cloud storage)
- [Vite](https://vitejs.dev/) (for fast development)

---

## 📄 License

This project is licensed under the MIT License.

---
