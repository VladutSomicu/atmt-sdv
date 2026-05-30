import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function UserSelect({ value, onChange, onBlur, placeholder = "Search user by name or email...", className, inputClassName }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    api.get('/api/auth/directory')
      .then(res => setUsers(res.data.users))
      .catch(err => console.error('Failed to load user directory', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeValue = value || '';
  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(safeValue.toLowerCase()) || 
    (u.full_name || '').toLowerCase().includes(safeValue.toLowerCase())
  );

  return (
    <div className={`relative flex-1 ${className || ''}`} ref={wrapperRef}>
      <input
        type="email"
        required
        placeholder={placeholder}
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={onBlur}
        className={inputClassName || "w-full bg-gray-800 border border-gray-700 text-white rounded-none px-4 py-2 text-sm focus:outline-none focus:border-blue-500"}
      />
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-none shadow-none max-h-48 overflow-auto">
          {isLoading ? (
            <li className="px-4 py-2 text-sm text-gray-400">Loading users...</li>
          ) : filteredUsers.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-400">No matching users</li>
          ) : (
            filteredUsers.map(u => (
              <li
                key={u.email}
                className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm flex flex-col"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before selection
                  onChange(u.email);
                  setIsOpen(false);
                }}
              >
                <span className="text-white font-medium">{u.full_name}</span>
                <span className="text-gray-400 text-xs">{u.email}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
