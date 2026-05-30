import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, title, children, onClose, onConfirm, confirmText = 'Confirm', confirmDanger = false }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        if (e.defaultPrevented) return;
        
        const tag = e.target.tagName;
        // Don't trigger confirm if typing in a textarea, or if focused on a button/link
        if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
        
        e.preventDefault();
        if (onConfirm) onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-gray-900 border border-gray-800 rounded-none shadow-none w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 focus:outline-none"
      >
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h3 className="text-white font-medium">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">
          {children}
        </div>
        <div className="px-6 py-4 bg-gray-950 border-t border-gray-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-none transition-colors ${
              confirmDanger 
                ? 'bg-red-600 hover:bg-red-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
