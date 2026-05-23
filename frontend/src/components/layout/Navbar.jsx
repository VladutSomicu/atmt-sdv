import { useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../shared/Modal';

export default function Navbar({ breadcrumb = [] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <>
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-600">/</span>}
              {item.href ? (
                <a href={item.href} className="text-gray-400 hover:text-white transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className="text-white font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">{user.full_name}</span>

          {user.is_demo && (
            <span className="bg-yellow-900 text-yellow-300 text-xs px-2 py-0.5 rounded">
              DEMO
            </span>
          )}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="text-gray-600 hover:text-red-600 text-xs transition-colors ml-2"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Sign out confirmation */}
      <Modal
        isOpen={showLogoutConfirm}
        title="Sign Out"
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        confirmText="Sign out"
        confirmDanger
      >
        <p className="text-gray-300 text-sm">
          Are you sure you want to sign out? Any unsaved changes will be lost.
        </p>
      </Modal>
    </>
  );
}