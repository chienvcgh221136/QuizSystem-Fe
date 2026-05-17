import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { examsApi, examResultsApi } from '../../api/services';
import UserLayout from '../../layouts/UserLayout';
import { Clock, FileText, Zap, RefreshCw, ChevronRight, CheckCircle2 } from 'lucide-react';

interface Exam { examId: number; title: string; description: string; category: string; level: string; timeLimit: number; totalScore: number; status: string; createdAt: string; }
interface HistoryItem { resultId: number; examId: number; title: string; category: string; score: number; maxScore: number; startTime: string; submitTime: string; status: string; }

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = React.useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [examsRes, historyRes] = await Promise.all([examsApi.getAll(), examResultsApi.getHistory()]);
      const sorted = (examsRes.data as Exam[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExams(sorted);
      setHistory(historyRes.data.slice(0, 5));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const [examsRes, historyRes] = await Promise.all([examsApi.getAll(), examResultsApi.getHistory()]);
        if (isMounted) {
          const sorted = (examsRes.data as Exam[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setExams(sorted);
          setHistory(historyRes.data.slice(0, 5));
        }
      } catch (e) { console.error(e); }
      finally { if (isMounted) setLoading(false); }
    };
    loadInitial();
    return () => { isMounted = false; };
  }, []);

  const handleStart = async (examId: number) => {
    try {
      const res = await examResultsApi.start(examId);
      navigate(`/user/exam/${res.data.resultId}/${examId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { resultId?: number } } };
      if (err.response?.data?.resultId) navigate(`/user/exam/${err.response.data.resultId}/${examId}`);
    }
  };

  const completedItems = history.filter(h => h.status === 'Submitted');
  const completed = completedItems.length;
  const avgScore = completed > 0 
    ? Math.round(completedItems.reduce((acc, h) => acc + ((h.score / h.maxScore) * 100), 0) / completed) 
    : 0;

  return (
    <UserLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Chào mừng quay trở lại, {user?.fullName?.split(' ').pop() ?? user?.username}.
            </h1>
            <p className="text-gray-500 text-sm mt-1">Bạn có {exams.length} đề thi sẵn sàng trong tuần này.</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 hover:text-[#1a7a4a] hover:border-[#1a7a4a] bg-white transition-colors"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>

        {/* Hero Banner (Non-AI) */}
        <div className="bg-gradient-to-r from-[#0f3d24] to-[#1a7a4a] rounded-2xl p-8 flex items-center gap-10 relative overflow-hidden shadow-xl">
          <div className="absolute w-72 h-72 rounded-full bg-white/5 right-52 -top-24" />
          <div className="flex-1 text-white relative z-10">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest bg-white/15 px-3 py-1 rounded-full mb-3">
              PHÁT TRIỂN CÁ NHÂN
            </div>
            <h2 className="text-2xl font-black leading-tight mb-2">Chinh phục mục tiêu<br />với lộ trình học tập tối ưu</h2>
            <p className="text-white/75 text-sm leading-relaxed mb-6 max-w-md">Tiếp tục hành trình học tập của bạn. Hoàn thành các đề thi mới để tích lũy XP và nâng cấp thứ hạng của mình.</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/user/exams')}
                className="px-6 py-2.5 bg-white text-[#1a7a4a] text-sm font-black rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all uppercase tracking-wider"
              >
                Khám phá đề thi
              </button>
            </div>
          </div>
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-5 w-64 flex-shrink-0 relative z-10 text-white border border-white/10">
            <div className="text-[10px] font-bold tracking-widest opacity-60 mb-4 uppercase">Thống kê học tập</div>
            <div className="flex justify-between text-xs mb-2">
              <span className="opacity-80 font-medium">Đã hoàn thành</span>
              <span className="font-bold">{completed} / {exams.length} bài</span>
            </div>
            <div className="h-2 bg-white/15 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-green-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(74,222,128,0.5)]" style={{ width: exams.length ? `${(completed / exams.length) * 100}%` : '0%' }} />
            </div>
            <div className="flex justify-between text-xs mb-4">
              <span className="opacity-80 font-medium">Điểm trung bình</span>
              <span className="font-bold text-green-300">{avgScore}%</span>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center">
                  <Zap size={16} className="text-amber-300 fill-amber-300" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/50 font-bold uppercase tracking-tighter">Tổng tích lũy</span>
                  <span className="text-sm font-black">{completed * 500 + 100} XP</span>
                </div>
              </div>
              <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-lg uppercase border border-white/10">Cấp {Math.floor((completed * 500 + 100) / 1000) + 1}</span>
            </div>
          </div>
        </div>

        {/* Exams grid */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Đề thi sẵn có</h3>
          <button onClick={() => navigate('/user/exams')} className="flex items-center gap-1 text-sm text-[#1a7a4a] font-medium hover:underline">
            Xem tất cả <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-44 rounded-xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {exams.slice(0, 4).map(exam => {
              const attempt = history.find(h => h.examId === exam.examId);
              const isCompleted = attempt?.status === 'Submitted';
              const isInProgress = attempt?.status === 'In_Progress';

              return (
                <div 
                  key={exam.examId} 
                  onClick={() => handleStart(exam.examId)}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isCompleted ? 'bg-green-100 text-green-600' : 
                      isInProgress ? 'bg-yellow-100 text-yellow-600' : 
                      'bg-green-50 text-[#1a7a4a]'
                    }`}>
                      <FileText size={20} />
                    </div>
                    {isCompleted ? (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> Đã hoàn thành
                      </span>
                    ) : isInProgress ? (
                      <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full animate-pulse">
                        Đang làm bài
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                        Chưa bắt đầu
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-[#1a7a4a] transition-colors">{exam.title}</h4>
                    {isCompleted && (
                      <p className="text-[11px] font-bold text-[#1a7a4a] mt-1">Điểm: {attempt.score}/{attempt.maxScore}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-auto">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500"><FileText size={11} /> {exam.category}</span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500"><Clock size={11} /> {exam.timeLimit} phút</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStart(exam.examId); }}
                    className={`w-full py-2.5 text-sm font-semibold rounded-lg mt-2 transition-all ${
                      isCompleted ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' :
                      isInProgress ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm shadow-yellow-200' :
                      'bg-[#1a7a4a] hover:bg-[#155e3a] text-white'
                    }`}
                  >
                    {isCompleted ? 'Làm lại' : isInProgress ? 'Tiếp tục' : 'Bắt đầu làm bài'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent results */}
        {history.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Kết quả gần đây</h3>
              <button onClick={() => navigate('/user/history')} className="flex items-center gap-1 text-sm text-[#1a7a4a] font-medium hover:underline">
                Xem toàn bộ lịch sử <ChevronRight size={14} />
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {history.map((item, idx) => (
                <div
                  key={item.resultId}
                  onClick={() => navigate(`/user/result/${item.resultId}`)}
                  className={`flex items-center gap-3.5 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${idx < history.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.submitTime ? new Date(item.submitTime).toLocaleDateString('vi-VN') : 'Đang làm...'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-gray-900">{item.score ?? '--'}/{item.maxScore}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${item.status === 'Submitted' ? 'text-green-600' : 'text-yellow-500'}`}>
                      {item.status === 'Submitted' ? 'Hoàn thành' : 'Đang làm'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
