import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import Modal from '../shared/Modal';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: 'H' },
  { label: 'Projects', href: '/projects', icon: 'P' },
  { label: 'Asset library', href: '/assets', icon: 'A' },
  { label: 'Threat catalog', href: '/threats-catalog', icon: 'T' },
  { label: 'Security controls', href: '/controls-library', icon: 'C' },
  { label: 'Reports', href: '/reports', icon: 'R' },
];

const orgItems = [
  { label: 'Admin', href: '/admin', icon: 'S' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (href) => location.pathname === href;

  const adminOnlyPaths = ['/assets', '/threats-catalog', '/controls-library', '/admin'];

  return (
    <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">

      {/* Logo */}
      <div className="h-12 flex items-center gap-2 px-4 shrink-0">
        <img src="/atmt_logo.png" alt="ATMT Logo" className="w-6 h-6 object-contain" />
        <span className="text-white font-bold text-sm tracking-wide">ATMT-SDV</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <p className="text-gray-600 text-xs font-medium uppercase tracking-widest px-2 mb-2">
          Workspace
        </p>
        {navItems.map((item) => {
          if (adminOnlyPaths.includes(item.href) && !user?.is_admin) return null;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm mb-0.5 transition-colors text-left ${isActive(item.href)
                ? 'bg-gray-800 text-gray-200 border-l-2 border-blue-500'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent'
                }`}
            >
              {item.label}
            </a>
          );
        })}

        {user?.is_admin && (
          <>
            <p className="text-gray-600 text-xs font-medium uppercase tracking-widest px-2 mb-2 mt-6">
              Organization
            </p>
            {orgItems.map((item) => {
              if (adminOnlyPaths.includes(item.href) && !user?.is_admin) return null;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm mb-0.5 transition-colors text-left ${isActive(item.href)
                    ? 'bg-gray-800 text-gray-200 border-l-2 border-blue-500'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent'
                    }`}
                >
                  {item.label}
                </a>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom Status Area */}
      <div className="mt-auto shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-gray-300 text-xs font-medium truncate" title={user?.full_name}>
              {user?.full_name}
            </span>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors rounded-sm"
            title="Disconnect"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

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
    </aside>
  );
}