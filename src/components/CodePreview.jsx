import React from 'react';

const CodePreview = ({ code, setCode, highlightCode, background, foreground, accent, textOffsetX = 0, textOffsetY = 0 }) => {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 border border-transparent transition-colors duration-300 transform hover:scale-[1.005] relative overflow-hidden"
        style={{
          backgroundColor: background,
          color: foreground,
          boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.4), inset 0 0 0 1px ${accent}`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 opacity-20 pointer-events-none rounded-2xl"></div>

        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: foreground }}>Live Code Preview</h2>
        <div
          className="rounded-xl p-8 font-mono min-h-[150px] overflow-auto whitespace-pre-wrap relative border-2 transition-all duration-300" // Reduced height to 150px
          style={{
            backgroundColor: background,
            color: foreground,
            borderColor: accent,
            boxShadow: `0 10px 20px -5px rgba(0, 0, 0, 0.3), 0 0 0 4px ${accent} inset`
          }}
        >
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="absolute inset-0 w-full h-full p-6 bg-transparent text-transparent caret-white z-20 resize-none outline-none font-mono"
            spellCheck="false"
            style={{ color: foreground }}
          />
          <div
            className="relative z-10 pointer-events-none p-6"
            style={{
              color: foreground,
              lineHeight: '1.5',
              letterSpacing: '0.1px',
              position: 'relative',
              top: `${textOffsetY}px`,
              left: `${textOffsetX}px`,
            }}
            dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
          />
        </div>
      </div>
    </main>
  );
};

export default CodePreview;