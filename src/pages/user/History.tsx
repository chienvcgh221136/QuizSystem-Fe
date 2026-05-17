import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examResultsApi } from '../../api/services';
import UserLayout from '../../layouts/UserLayout';
import { CheckCircle2, Clock, ChevronRight } from 'lucide-react';

interface HistoryItem {
  resultId: number;
  examId: number;
  title: string;
  category: string;
  status: string;
  score: number;
  maxScore: number;
  startTime: string;
  submitTime: string | null;
}

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    examResultsApi.getHistory().then(res => setHistory(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <UserLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Kết quả của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi quá trình làm bài và xem lại kết quả chi tiết.</p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <CheckCircle2 size={48} className="opacity-30" />
            <p>Bạn chưa thực hiện bài thi nào.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {history.map((item, idx) => {
              const pct = item.maxScore ? Math.round((item.score / item.maxScore) * 100) : 0;
              const passed = pct >= 50;
              return (
                <div
                  key={item.resultId}
                  onClick={() => item.status === 'Submitted' && navigate(`/user/result/${item.resultId}`)}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${item.status === 'Submitted' ? 'cursor-pointer' : ''} ${idx < history.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${passed ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <CheckCircle2 size={20} className={passed ? 'text-green-600' : 'text-yellow-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-400">{item.category}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        {item.status === 'Submitted' && item.submitTime && item.startTime ? (
                          <>
                            {Math.round((new Date(item.submitTime).getTime() - new Date(item.startTime).getTime()) / 60000)} phút
                            <span className="mx-1">·</span>
                            {new Date(item.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(item.submitTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-1">·</span>
                            {new Date(item.submitTime).toLocaleDateString('vi-VN')}
                          </>
                        ) : (
                          <>
                            Bắt đầu: {new Date(item.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-1">·</span>
                            {new Date(item.startTime).toLocaleDateString('vi-VN')}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-gray-900">{item.score ?? '--'}/{item.maxScore ?? '--'}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${item.status === 'Submitted' ? (passed ? 'text-green-600' : 'text-red-500') : 'text-yellow-500'}`}>
                      {item.status === 'Submitted' ? (passed ? 'Đạt' : 'Chưa đạt') : 'Đang làm'}
                    </div>
                  </div>
                  {item.status === 'Submitted' && <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default HistoryPage;
