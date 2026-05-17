import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Lock, User, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Vui lòng nhập đầy đủ thông tin.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      const stored = localStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : null;
      navigate(user?.role === 'Admin' ? '/admin/dashboard' : '/user/dashboard');
    } catch {
      setError('Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f3d24] via-[#1a7a4a] to-[#2ea566] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-white/5 -top-48 -right-24 blur-3xl" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-white/5 -bottom-24 -left-12 blur-3xl" />

      <div className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-2xl overflow-hidden relative z-10 p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-[#1a7a4a] mb-5 shadow-sm border border-green-100">
            <BookOpen size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Đăng nhập</h1>
          <p className="text-sm font-semibold text-gray-400 mt-2">Chào mừng bạn trở lại Quiz</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 text-[13px] font-bold px-4 py-3.5 rounded-xl mb-6 animate-shake">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên đăng nhập</label>
            <div className="relative group">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1a7a4a] transition-colors" />
              <input
                type="text"
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-11 pr-5 py-3.5 border-2 border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:border-[#1a7a4a] focus:ring-4 focus:ring-[#1a7a4a]/5 bg-gray-50/50 focus:bg-white transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Mật khẩu</label>
            <div className="relative group">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1a7a4a] transition-colors" />
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-5 py-3.5 border-2 border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:border-[#1a7a4a] focus:ring-4 focus:ring-[#1a7a4a]/5 bg-gray-50/50 focus:bg-white transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-4 bg-gradient-to-r from-[#1a7a4a] to-[#2ea566] hover:from-[#155e3a] hover:to-[#1a7a4a] text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-[#1a7a4a]/20 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            {loading ? (
              <span className="w-5 h-5 border-3 border-white/40 border-t-white rounded-full animate-spin" />
            ) : 'Bắt đầu ngay'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            QuizAI System &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
