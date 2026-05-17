import { useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

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
  const { user } = useAuth();

  const isActive = (href) => location.pathname === href;

  const adminOnlyPaths = ['/assets', '/threats-catalog', '/controls-library', '/admin'];

  return (
    <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">

      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">A</span>
        </div>
        <span className="text-white font-bold text-sm tracking-wide">ATMT-SDV</span>
        <span className="text-gray-600 text-xs ml-auto">v0.9</span>
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
              className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm mb-0.5 transition-colors ${isActive(item.href)
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <span className="text-xs w-4 text-center text-gray-600 font-mono">{item.icon}</span>
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
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm mb-0.5 transition-colors ${isActive(item.href)
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  <span className="text-xs w-4 text-center text-gray-600 font-mono">{item.icon}</span>
                  {item.label}
                </a>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-gray-800">
        <div className="bg-gray-800 rounded-lg px-3 py-2 mb-2">
          <p className="text-white text-xs font-medium">ATMT Workspace</p>
          <p className="text-gray-500 text-xs">ISO 21434 compliant</p>
        </div>
        <div className="flex gap-1.5">
          <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">ISO 21434</span>
          <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">R155</span>
          <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">R156</span>
        </div>
      </div>
    </aside>
  );
}