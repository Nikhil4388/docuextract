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

// ── Disable common keyboard shortcuts for DevTools (best-effort) ─────────────
document.addEventListener('keydown', (e) => {
  // F12
  if (e.key === 'F12') { e.preventDefault(); return; }
  // Ctrl+Shift+I / Cmd+Opt+I
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') { e.preventDefault(); return; }
  // Ctrl+Shift+J
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') { e.preventDefault(); return; }
  // Ctrl+U (view source)
  if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); return; }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
