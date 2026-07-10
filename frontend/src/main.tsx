import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

// ── Console security warning ─────────────────────────────────────────────────
console.clear();
console.log(
  '%c⚠  STOP',
  'color:#ef4444;font-size:36px;font-weight:900;font-family:monospace;'
);
console.log(
  '%cThis is a browser developer tool intended for engineers.\n' +
  'If someone asked you to paste anything here, that is a social-engineering attack.\n\n' +
  'All business logic is validated server-side. Client-side DOM changes\n' +
  'are cosmetic only and have zero effect on your data or other users.',
  'color:#fbbf24;font-size:13px;line-height:1.8;font-family:monospace;'
);
console.log(
  '%c— MultiPDFToExcel Security Team',
  'color:#6366f1;font-size:12px;font-style:italic;'
);

// ── Disable right-click context menu ────────────────────────────────────────
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ── Disable drag on images ───────────────────────────────────────────────────
document.addEventListener('dragstart', (e) => {
  if ((e.target as HTMLElement).tagName === 'IMG') e.preventDefault();
});

// ── Disable common keyboard shortcuts (best-effort) ──────────────────────────
document.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  // F12
  if (e.key === 'F12') { e.preventDefault(); return; }
  // Ctrl+Shift+I / Cmd+Opt+I — DevTools
  if (ctrl && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); return; }
  // Ctrl+Shift+J — Console
  if (ctrl && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); return; }
  // Ctrl+Shift+C — Inspect element
  if (ctrl && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); return; }
  // Ctrl+Shift+K — Firefox console
  if (ctrl && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); return; }
  // Ctrl+U — View source
  if (ctrl && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); return; }
  // Ctrl+S — Save page
  if (ctrl && (e.key === 's' || e.key === 'S')) { e.preventDefault(); return; }
  // Ctrl+P — Print (exposes DOM)
  if (ctrl && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); return; }
});

// ── CSS: disable text selection outside inputs ───────────────────────────────
const selectionStyle = document.createElement('style');
selectionStyle.textContent = `
  body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
  input, textarea, [contenteditable] { -webkit-user-select: text; user-select: text; }
  ::selection { background: transparent; }
`;
document.head.appendChild(selectionStyle);

// ── DevTools size-based detection (best-effort) ──────────────────────────────
(function detectDevtools() {
  const threshold = 160;
  const check = () => {
    if (
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold
    ) {
      document.body.innerHTML = '';
      location.reload();
    }
  };
  setInterval(check, 1000);
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
