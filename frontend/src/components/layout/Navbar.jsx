import { useAuth } from '../../store/AuthContext';

export default function Navbar({ breadcrumb = [] }) {
  const { user } = useAuth();

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
        </div>
      </header>
    </>
  );
}