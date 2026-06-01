import { useEffect } from 'react';

export default function InspectGuard({ children }) {
  useEffect(() => {
    // Only apply in production if desired, but we'll apply it globally here

    // 1. Prevent Keyboard Shortcuts for DevTools
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
      }
      
      // Ctrl+Shift+I / Cmd+Option+I (Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
      }

      // Ctrl+Shift+J / Cmd+Option+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
      }

      // Ctrl+Shift+C / Cmd+Option+C (Element Inspector)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
        e.preventDefault();
      }

      // Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // 2. (Optional but aggressive) Debugger Trap
    // Periodically halts execution if DevTools is open.
    const debuggerInterval = setInterval(() => {
      const before = new Date().getTime();
      // eslint-disable-next-line no-debugger
      debugger; 
      const after = new Date().getTime();
      if (after - before > 100) {
        // DevTools is likely open
        // We can't close it, but it creates a nuisance for inspecting
      }
    }, 2000);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(debuggerInterval);
    };
  }, []);

  return children;
}
