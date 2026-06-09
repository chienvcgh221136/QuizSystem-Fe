import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LayoutDashboard, Users, Database, FileText, Bot, LogOut, PlusCircle } from 'lucide-react';

const nav = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={17} />, label: 'Tổng quan' },
  { to: '/admin/users', icon: <Users size={17} />, label: 'Người dùng' },
  { to: '/admin/questions', icon: <Database size={17} />, label: 'Ngân hàng câu hỏi' },
  { to: '/admin/exams', icon: <FileText size={17} />, label: 'Đề thi' },
  { to: '/admin/chatbot', icon: <Bot size={17} />, label: 'Trợ lý AI' },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Phát hiện xem ứng dụng có đang chạy trong iframe hay không
  const isEmbed = window.self !== window.top;

  if (isEmbed) {
    return (
      <div className="flex h-screen overflow-hidden font-sans bg-gray-50">
        <main className="flex-1 overflow-y-auto p-0">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0C451E] flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10 text-white">
          <BookOpen size={20} />
          <div>
            <div className="text-sm font-bold">QuizChat</div>
            <div className="text-[10px] text-green-300/70 mt-0.5">Bảng điều khiển</div>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1B8F3D] text-white'
                    : 'text-green-200/80 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-2.5 py-3 border-t border-white/10 flex flex-col gap-3">
          <button
            onClick={() => navigate('/admin/chatbot')}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#1B8F3D] hover:bg-[#23b14d] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <PlusCircle size={15} />
            <span>Tạo đề thi mới</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1B8F3D] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.fullName?.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white font-semibold truncate">{user?.fullName ?? user?.username}</div>
              <div className="text-[10px] text-green-300/70">Quản trị viên nội dung</div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-green-300/70 hover:text-white transition-colors p-1">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-[52px] bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-[#1B8F3D] font-bold text-[15px]">
            <BookOpen size={17} />
            <span>QuizChat</span>
            <span className="text-[10px] bg-green-50 text-[#1B8F3D] px-2 py-0.5 rounded-full font-semibold tracking-wide">PHÁT TRIỂN</span>
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <div className="relative">
              <input
                placeholder="Tìm kiếm dữ liệu..."
                className="pl-3 pr-3 py-1.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1B8F3D] bg-gray-50 w-48 transition-colors"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1B8F3D] text-white flex items-center justify-center text-xs font-bold">
              {user?.fullName?.charAt(0) ?? 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
