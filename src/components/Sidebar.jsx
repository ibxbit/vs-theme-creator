import React from 'react';

const Sidebar = ({
  themeName, setThemeName,
  background, setBackground,
  foreground, setForeground,
  accent, setAccent,
  sidebarBackground, setSidebarBackground,
  statusBarBackground, setStatusBarBackground,
  commentColor, setCommentColor,
  stringColor, setStringColor,
  handleExport, handleImportClick, fileInputRef, handleFileChange,
  presets, loadPreset,
  userThemes, loadSavedTheme, saveTheme,
  feedbackMessage, loadingFirebase, userId
}) => {
  return (
    <aside
      className="w-full md:w-80 bg-white rounded-xl shadow-lg p-8 flex flex-col gap-8 border border-gray-200"
      style={{ backgroundColor: sidebarBackground, color: foreground }}
    >
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl font-bold tracking-tight" style={{ color: accent }}>VS Code Theme Creator</span>
      </div>

      {feedbackMessage && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{feedbackMessage}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: foreground }}>Theme Name</label>
        <input
          type="text"
          placeholder="My Awesome Theme"
          className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          style={{ backgroundColor: background, color: foreground, borderColor: foreground }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: foreground }}>Main Colors</label>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-20" style={{ color: foreground }}>Background</span>
            <input
              type="color"
              className="w-8 h-8 p-0 border-none bg-transparent"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20" style={{ color: foreground }}>Foreground</span>
            <input
              type="color"
              className="w-8 h-8 p-0 border-none bg-transparent"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20" style={{ color: foreground }}>Accent</span>
            <input
              type="color"
              className="w-8 h-8 p-0 border-none bg-transparent"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20" style={{ color: foreground }}>Sidebar BG</span>
            <input
              type="color"
              className="w-8 h-8 p-0 border-none bg-transparent"
              value={sidebarBackground}
              onChange={(e) => setSidebarBackground(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20" style={{ color: foreground }}>Status Bar BG</span>
            <input
              type="color"
              className="w-8 h-8 p-0 border-none bg-transparent"
              value={statusBarBackground}
              onChange={(e) => setStatusBarBackground(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20" style={{ color: foreground }}>Comment</span>
            <input
              type="color"
              className="w-8 h-8 p-0 border-none bg-transparent"
              value={commentColor}
              onChange={(e) => setCommentColor(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20" style={{ color: foreground }}>String</span>
            <input
              type="color"
              className="w-8 h-8 p-0 border-none bg-transparent"
              value={stringColor}
              onChange={(e) => setStringColor(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: foreground }}>Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className="px-3 py-2 rounded-lg text-sm transition hover:scale-105"
              style={{ backgroundColor: preset.background, color: preset.foreground, border: `1px solid ${preset.accent}` }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <label className="block text-sm font-medium mb-2" style={{ color: foreground }}>Saved Themes (User ID: {userId || 'N/A'})</label>
        {loadingFirebase ? (
          <p className="text-sm">Loading saved themes...</p>
        ) : (
          userThemes.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-4">
              {userThemes.map((name) => (
                <button
                  key={name}
                  onClick={() => loadSavedTheme(name)}
                  className="px-3 py-2 rounded-lg text-sm bg-gray-700 text-white hover:bg-gray-600 transition hover:scale-105"
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm">No saved themes yet.</p>
          )
        )}
        <button
          onClick={saveTheme}
          className="w-full bg-green-600 text-white py-2 rounded shadow hover:bg-green-700 transition mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loadingFirebase || !userId}
        >
          Save Current Theme
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 bg-blue-600 text-white py-2 rounded shadow hover:bg-blue-700 transition"
        >
          Export
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".json"
        />
        <button
          onClick={handleImportClick}
          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded shadow hover:bg-gray-300 transition"
        >
          Import
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
