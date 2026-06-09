import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { adminApi } from '../../api/services';
import { Users, FileText, Database, TrendingUp } from 'lucide-react';

interface StatsData {
  totalUsers: number;
  totalExams: number;
  totalQuestions: number;
  avgScore: number;
}

interface RecentActivity {
  userName: string;
  initials: string;
  examTitle: string;
  status: string;
  time: string;
  score?: number;
  maxScore: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getRecentActivity()])
      .then(([s, a]) => {
        setStatsData(s.data);
        setActivity(a.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'TỔNG NGƯỜI DÙNG', value: loading ? '...' : statsData?.totalUsers?.toLocaleString(), sub: '+0% tháng này', icon: <Users size={20} />, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
    { label: 'ĐỀ THI ĐÃ XUẤT BẢN', value: loading ? '...' : statsData?.totalExams, sub: 'tổng số đề thi', icon: <FileText size={20} />, iconBg: 'bg-green-50', iconColor: 'text-[#1B8F3D]' },
    { label: 'NGÂN HÀNG CÂU HỎI', value: loading ? '...' : statsData?.totalQuestions, sub: 'câu hỏi đang hoạt động', icon: <Database size={20} />, iconBg: 'bg-purple-50', iconColor: 'text-purple-500' },
    { label: 'ĐIỂM TRUNG BÌNH', value: loading ? '...' : `${statsData?.avgScore}%`, sub: 'trên toàn hệ thống', icon: <TrendingUp size={20} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  ];

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${diff} phút trước`;
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  };

  const actionBadge: Record<string, string> = {
    Submitted: 'bg-green-100 text-green-700',
    In_Progress: 'bg-blue-100 text-blue-700',
    Expired: 'bg-red-100 text-red-600',
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-extrabold text-gray-900">Tổng quan vận hành</h1>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className={`w-11 h-11 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">{s.label}</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-0.5">{s.value}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-5">
          {/* Activity table */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-[15px] font-bold text-gray-900 mb-4">Hoạt động gần đây</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Người dùng', 'Trạng thái', 'Đề thi / Module', 'Thời gian'].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide py-2 px-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="py-10 text-center text-gray-400 text-xs">Đang tải dữ liệu...</td></tr>
                ) : activity.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-gray-400 text-xs">Không có hoạt động nào gần đây.</td></tr>
                ) : activity.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full bg-[#1B8F3D] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>{row.initials}</span>
                        <span className="font-medium text-gray-800 text-[13px]">{row.userName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${actionBadge[row.status] ?? 'bg-gray-100 text-gray-500'}`}>{row.status === 'Submitted' ? 'Đã nộp' : row.status}</span>
                    </td>
                    <td className="py-3 px-2 text-[13px] text-gray-500">{row.examTitle}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-400 whitespace-nowrap">{formatTime(row.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* AI Insights */}
            <div className="bg-gradient-to-br from-[#0C451E] to-[#1B8F3D] rounded-xl p-5 text-white shadow-sm">
              <h3 className="text-sm font-bold mb-2">Gợi ý từ AI</h3>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                Hệ thống nhận thấy người dùng đang làm tốt chủ đề C#. Hãy cân nhắc tạo thêm các đề thi nâng cao để thử thách họ.
              </p>
              <button onClick={() => navigate('/admin/chatbot')} className="w-full py-2 bg-white text-[#1B8F3D] text-xs font-bold rounded-lg hover:-translate-y-0.5 hover:shadow-md transition-all">
                Tạo đề thi nâng cao
              </button>
            </div>

            {/* System health */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Trình trạng hệ thống</h3>
              {[['Thời gian hoạt động', 99.99, '99.99%'], ['Tải CPU/DB', 12, '12%']].map(([label, val, display]) => (
                <div key={String(label)} className="flex items-center gap-2.5 mb-3 last:mb-0">
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-[#1B8F3D] rounded-full" style={{ width: `${val}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-12 text-right">{display}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
