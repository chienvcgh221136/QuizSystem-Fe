import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { examsApi, examResultsApi } from '../../api/services';
import UserLayout from '../../layouts/UserLayout';
import { Clock, FileText, Search, LayoutGrid, CheckCircle2 } from 'lucide-react';

interface Exam { 
  examId: number; 
  title: string; 
  description: string; 
  category: string; 
  level: string; 
  timeLimit: number; 
  totalScore: number; 
  status: string; 
  createdAt: string;
}

interface HistoryItem { 
  resultId: number; 
  examId: number; 
  status: string; 
  score: number; 
  maxScore: number; 
}

const AllExams: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [exams, setExams] = useState<Exam[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, historyRes] = await Promise.all([
          examsApi.getAll(), 
          examResultsApi.getHistory()
        ]);
        const sorted = (examsRes.data as Exam[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setExams(sorted);
        setHistory(historyRes.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && exams.length > 0) {
      const params = new URLSearchParams(location.search);
      const examId = params.get('examId');
      if (examId) {
        setTimeout(() => {
          const element = document.getElementById(`exam-${examId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-[#1B8F3D]', 'ring-opacity-50', 'ring-offset-2', 'transition-all', 'duration-500');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-[#1B8F3D]', 'ring-opacity-50', 'ring-offset-2');
            }, 3000);
          }
        }, 300);
      }
    }
  }, [loading, exams, location.search]);

  const handleStart = async (examId: number) => {
    try {
      const res = await examResultsApi.start(examId);
      navigate(`/user/exam/${res.data.resultId}/${examId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { resultId?: number } } };
      if (err.response?.data?.resultId) navigate(`/user/exam/${err.response.data.resultId}/${examId}`);
    }
  };

  const categories = Array.from(new Set(exams.map(e => e.category)));
  
  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <UserLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Tất cả đề thi</h1>
            <p className="text-sm text-gray-500 mt-1">Khám phá và tham gia các bài thi theo từng chủ đề.</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm đề thi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B8F3D]/20 focus:border-[#1B8F3D] outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-10">
            {[1, 2].map(i => (
              <div key={i} className="flex flex-col gap-4">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(j => <div key={j} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <LayoutGrid size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Không tìm thấy đề thi nào phù hợp.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {categories.map(cat => {
              const catExams = filteredExams.filter(e => e.category === cat);
              if (catExams.length === 0) return null;

              return (
                <section key={cat} className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1.5 bg-[#1B8F3D] rounded-full"></div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">{cat}</h2>
                    <span className="px-2.5 py-0.5 bg-green-50 text-[#1B8F3D] text-[11px] font-bold rounded-full border border-green-100">
                      {catExams.length} bài
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {catExams.map(exam => {
                      const attempt = history.find(h => h.examId === exam.examId);
                      const isCompleted = attempt?.status === 'Submitted';
                      const isInProgress = attempt?.status === 'In_Progress';

                      return (
                        <div 
                          key={exam.examId}
                          id={`exam-${exam.examId}`}
                          onClick={() => handleStart(exam.examId)}
                          className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-xl hover:-translate-y-1.5 transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                              isCompleted ? 'bg-green-100 text-green-600 shadow-inner' : 
                              isInProgress ? 'bg-yellow-100 text-yellow-600 shadow-inner' : 
                              'bg-gray-50 text-[#1B8F3D] shadow-inner'
                            }`}>
                              <FileText size={24} />
                            </div>
                            {isCompleted ? (
                              <span className="text-[10px] font-black bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1 uppercase">
                                <CheckCircle2 size={10} /> Đạt
                              </span>
                            ) : isInProgress ? (
                              <span className="text-[10px] font-black bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full border border-yellow-100 uppercase animate-pulse">
                                Đang thi
                              </span>
                            ) : (
                              <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-3 py-1 rounded-full border border-gray-100 uppercase">
                                Mới
                              </span>
                            )}
                          </div>

                          <div className="flex-1">
                            <h4 className="text-sm font-black text-gray-900 leading-snug group-hover:text-[#1B8F3D] transition-colors line-clamp-2 mb-2">{exam.title}</h4>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest"><Clock size={11} /> {exam.timeLimit} phút</span>
                              <span className="text-gray-300">|</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{exam.level}</span>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => { e.stopPropagation(); handleStart(exam.examId); }}
                            className={`w-full py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${
                              isCompleted ? 'bg-gray-50 text-gray-500 hover:bg-gray-100' :
                              isInProgress ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20 hover:bg-yellow-600' :
                              'bg-[#1B8F3D] text-white shadow-lg shadow-green-900/10 hover:bg-[#146c2e]'
                            }`}
                          >
                            {isCompleted ? 'Làm lại' : isInProgress ? 'Tiếp tục' : 'Bắt đầu'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default AllExams;
