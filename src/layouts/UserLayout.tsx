import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Bell, LogOut} from 'lucide-react';
import { notificationsApi } from '../api/services';
import UserChatbot from '../pages/user/UserChatbot';

interface NotificationItem {
  notificationId: number;
  title: string;
  message: string;
  type: string;
  targetId?: number;
  isRead: boolean;
  createdAt: string;
}

const UserLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsUnavailable, setNotificationsUnavailable] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getAll();
      setNotifications(res.data);
      setNotificationsUnavailable(false);
      
      const lastCheckedTimeStr = localStorage.getItem('lastCheckedNotificationTime') || '1970-01-01T00:00:00.000Z';
      const lastCheckedTime = new Date(lastCheckedTimeStr);
      
      const unread = res.data.filter((n: NotificationItem) => new Date(n.createdAt) > lastCheckedTime).length;
      setUnreadCount(unread);
    } catch (e) {
      setNotificationsUnavailable(true);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (notificationsUnavailable) {
      return;
    }

    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [notificationsUnavailable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDropdown = () => {
    if (!isOpen) {
      // Clear unread count locally when opening dropdown
      localStorage.setItem('lastCheckedNotificationTime', new Date().toISOString());
      setUnreadCount(0);
      void fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      fetchNotifications();
    } catch (e) {
      console.error("Failed to mark notifications as read:", e);
    }
  };

  const handleNotificationClick = () => {
    setIsOpen(false);
    navigate('/user/exams');
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHr < 24) return `${diffHr} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      {/* Topbar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-7 gap-8 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 text-[#1B8F3D] font-bold text-lg whitespace-nowrap">
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
                    ? 'bg-green-50 text-[#1B8F3D] font-semibold'
                    : 'text-gray-500 hover:text-[#1B8F3D] hover:bg-green-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 ml-auto">
          {/* Notification System */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={handleToggleDropdown}
              className="relative w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#1B8F3D] hover:bg-gray-50 transition-colors"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Thông báo</h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-[#1B8F3D] hover:underline"
                    >
                      Đọc tất cả
                    </button>
                  )}
                </div>

                {/* List Items */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 scrollbar-thin">
                  {notificationsUnavailable && notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-xs font-medium">
                      Không thể tải thông báo lúc này
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-xs font-medium">
                      Không có thông báo mới
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const lastTime = new Date(localStorage.getItem('lastCheckedNotificationTime') || '1970-01-01T00:00:00.000Z');
                      const isUnread = new Date(n.createdAt) > lastTime;
                      return (
                        <div
                          key={n.notificationId}
                          onClick={handleNotificationClick}
                          className={`px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-start gap-3 ${
                            isUnread ? 'bg-green-50/20' : ''
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            isUnread ? 'bg-[#1B8F3D]' : 'bg-transparent'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate mb-0.5">{n.title}</p>
                            <p className="text-[11px] text-gray-500 leading-relaxed break-words">{n.message}</p>
                            <span className="text-[9px] font-medium text-gray-400 mt-1 block">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
                  <button
                    onClick={() => { setIsOpen(false); navigate('/user/exams'); }}
                    className="text-[10px] font-bold text-[#1B8F3D] hover:text-[#146c2e]"
                  >
                    Xem tất cả đề thi
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1B8F3D] text-white flex items-center justify-center text-sm font-bold">
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

      {/* NHÚNG GIA SƯ AI VÀO MỌI TRANG CỦA USER */}
      <UserChatbot />
      
    </div>
  );
};

export default UserLayout;
