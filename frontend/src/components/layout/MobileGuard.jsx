import { useState, useEffect } from 'react';

export default function MobileGuard({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-none p-8 max-w-sm">
          <div className="w-12 h-12 bg-blue-900/50 text-blue-400 rounded-none flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Desktop Required</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            ATMT-SDV is a complex threat modeling tool that requires a larger screen.
          </p>
          <p className="text-blue-400 text-xs font-mono uppercase tracking-widest">
            This application is not supported on mobile devices. Please use a desktop computer to continue.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
