import { useAuth } from '../../../store/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ breadcrumb = [] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const roleColor = {
    engineer: 'bg-blue-900 text-blue-300',
    manager: 'bg-green-900 text-green-300',
    architect: 'bg-purple-900 text-purple-300',
    auditor: 'bg-yellow-900 text-yellow-300',
    admin: 'bg-red-900 text-red-300',
  };

  const userRole = user.is_admin ? 'admin' : 'engineer';

  return (
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
        <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wide ${roleColor[userRole]}`}>
          {userRole}
        </span>
        {user.is_demo && (
          <span className="bg-yellow-900 text-yellow-300 text-xs px-2 py-0.5 rounded">
            DEMO
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-gray-600 hover:text-white text-xs transition-colors ml-2"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}