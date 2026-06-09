import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { usersApi } from '../../api/services';
import { UserPlus, Search, Edit2, Trash2, Shield, User as UserIcon, X, Check, Eye, History, Clock, Award } from 'lucide-react';

interface User {
  userId: number;
  username: string;
  fullName?: string;
  email?: string;
  role: string;
  createdAt: string;
}

interface ExamHistory {
  resultId: number;
  title: string;
  score: number;
  totalScore: number;
  duration: string;
  submitTime: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', fullName: '', email: '', role: 'User', passwordHash: '' });
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll();
      setUsers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchUsers();
    };
    init();
  }, [fetchUsers]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.userId, { ...editingUser, ...form });
      } else {
        await usersApi.create(form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      setError(errMsg);
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa người dùng này?')) return;
    try {
      await usersApi.delete(id);
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const openEdit = (user: User) => {
    setError(null);
    setEditingUser(user);
    setForm({ username: user.username, fullName: user.fullName || '', email: user.email || '', role: user.role, passwordHash: '' });
    setShowModal(true);
  };

  const openHistory = async (user: User) => {
    setSelectedUser(user);
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const res = await usersApi.getHistory(user.userId);
      setHistory(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  const openCreate = () => {
    setError(null);
    setEditingUser(null);
    setForm({ username: '', fullName: '', email: '', role: 'User', passwordHash: '' });
    setShowModal(true);
  };

  const filtered = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Quản lý người dùng</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý tài khoản, phân quyền và thông tin thí sinh.</p>
          </div>
          <button 
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#1B8F3D] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#15633c] transition-all shadow-lg shadow-green-900/10 active:scale-95"
          >
            <UserPlus size={18} />
            Thêm người dùng
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên, username hoặc email..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B8F3D]/20 focus:border-[#1B8F3D] outline-none transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
            <span className="font-bold text-[#1B8F3D]">{filtered.length}</span> người dùng
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Người dùng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Vai trò</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Đang tải danh sách...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Không tìm thấy người dùng nào.</td></tr>
              ) : filtered.map(user => (
                <tr key={user.userId} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-50 text-[#1B8F3D] flex items-center justify-center font-bold">
                        {user.fullName?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{user.fullName || 'Chưa cập nhật'}</div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email || <span className="text-gray-300 italic">N/A</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      user.role === 'Admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {user.role === 'Admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openHistory(user)}
                        className="p-2 text-[#1B8F3D] hover:bg-green-50 rounded-lg transition-colors"
                        title="Xem lịch sử làm bài"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => openEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.userId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-xl font-black text-gray-900">
                  {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Username</label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingUser}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B8F3D]/20 focus:border-[#1B8F3D] outline-none transition-all disabled:opacity-50"
                    value={form.username}
                    onChange={e => setForm({...form, username: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Họ và tên</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B8F3D]/20 focus:border-[#1B8F3D] outline-none transition-all"
                    value={form.fullName}
                    onChange={e => setForm({...form, fullName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B8F3D]/20 focus:border-[#1B8F3D] outline-none transition-all"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Mật khẩu {editingUser && '(để trống nếu không đổi)'}</label>
                  <input 
                    type="password" 
                    name={editingUser ? 'new-password' : 'password'}
                    autoComplete="new-password"
                    required={!editingUser}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B8F3D]/20 focus:border-[#1B8F3D] outline-none transition-all"
                    value={form.passwordHash}
                    onChange={e => setForm({...form, passwordHash: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Vai trò</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B8F3D]/20 focus:border-[#1B8F3D] outline-none transition-all appearance-none cursor-pointer"
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                  >
                    <option value="User">User (Thí sinh)</option>
                    <option value="Admin">Admin (Quản trị viên)</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-[#1B8F3D] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#15633c] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? 'Đang lưu...' : (
                      <>
                        <Check size={18} />
                        {editingUser ? 'Cập nhật' : 'Tạo tài khoản'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User History Modal */}
        {showHistory && selectedUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1B8F3D] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-green-900/20">
                    {selectedUser.fullName?.charAt(0).toUpperCase() || selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{selectedUser.fullName || selectedUser.username}</h3>
                    <p className="text-xs text-gray-500 font-medium">Lịch sử bài thi đã thực hiện</p>
                  </div>
                </div>
                <button onClick={() => setShowHistory(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-[#1B8F3D] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu lịch sử...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <History size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Người dùng này chưa thực hiện bài thi nào.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white flex items-center justify-between shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                          <Award className="text-yellow-400" size={24} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Điểm trung bình</div>
                          <div className="text-2xl font-black">
                            {(history.reduce((acc, curr) => acc + (curr.score / curr.totalScore * 10), 0) / history.length).toFixed(1)} 
                            <span className="text-sm text-gray-400 ml-1">/ 10</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tổng bài thi</div>
                        <div className="text-2xl font-black">{history.length}</div>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Chi tiết kết quả</div>
                    {history.map((h) => {
                      const percent = Math.round((h.score / h.totalScore) * 100);
                      let colorClass = "bg-red-50 text-red-600 border-red-100";
                      if (percent >= 80) colorClass = "bg-green-50 text-green-600 border-green-100";
                      else if (percent >= 50) colorClass = "bg-yellow-50 text-yellow-600 border-yellow-100";

                      return (
                        <div key={h.resultId} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#1B8F3D]/20 transition-all shadow-sm hover:shadow-md group">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 group-hover:text-[#1B8F3D] transition-colors mb-1">{h.title}</h4>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold">
                                  <Clock size={12} className="text-gray-400" />
                                  {h.duration}
                                </div>
                                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold">
                                  <History size={12} className="text-gray-400" />
                                  {h.submitTime}
                                </div>
                              </div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl border flex items-center gap-1.5 font-black ${colorClass}`}>
                              <span className="text-lg leading-none">{h.score}</span>
                              <span className="text-xs opacity-60">/ {h.totalScore}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setShowHistory(false)}
                  className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
