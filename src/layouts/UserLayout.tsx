import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Bell, LogOut } from 'lucide-react';

const UserLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      {/* Topbar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-7 gap-8 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 text-[#1a7a4a] font-bold text-lg whitespace-nowrap">
          <BookOpen size={22} />
          <span>QuizChat</span>
        </div>
        <nav className="flex items-center gap-1 flex-1">
          {[
            { to: '/user/dashboard', label: 'Trang chủ' },
            { to: '/user/exams', label: 'Đề thi' },
            { to: '/user/history', label: 'Kết quả' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-[#1a7a4a] font-semibold'
                    : 'text-gray-500 hover:text-[#1a7a4a] hover:bg-green-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 ml-auto">
          <button className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#1a7a4a] hover:bg-gray-50 transition-colors">
            <Bell size={17} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1a7a4a] text-white flex items-center justify-center text-sm font-bold">
              {user?.fullName?.charAt(0) ?? 'U'}
            </div>
            <span className="text-sm font-medium text-gray-800">{user?.fullName ?? user?.username}</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-7">
        {children}
      </main>
    </div>
  );
};

export default UserLayout;
