import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsApi, examResultsApi } from '../../api/services';
import { Clock, Send, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

interface Question { 
  questionId: number; 
  content: string; 
  optionA: string; 
  optionB: string; 
  optionC: string; 
  optionD: string; 
  orderIndex: number;
  imageUrl?: string;
}

interface ExamInfo { 
  examId: number; 
  title: string; 
  description: string; 
  timeLimit: number; 
  totalScore: number;
  category: string;
}

const ExamTaking: React.FC = () => {
  const { resultId, examId } = useParams<{ resultId: string; examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const answersRef = useRef(answers);
  const submittingRef = useRef(false);
  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Auto-submit: không hỏi confirm, gọi khi hết giờ
  const autoSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setTimeExpired(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const payload = Object.entries(answersRef.current).map(([qId, opt]) => ({ questionId: Number(qId), selectedOption: opt }));
      await examResultsApi.submit(Number(resultId), payload);
      // Chờ 2 giây để user thấy overlay rồi redirect
      setTimeout(() => navigate(`/user/result/${resultId}`), 2000);
    } catch (e) {
      console.error(e);
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [resultId, navigate]);

  // Manual submit: hỏi confirm trước
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    if (!window.confirm('Bạn có chắc chắn muốn nộp bài?')) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const payload = Object.entries(answersRef.current).map(([qId, opt]) => ({ questionId: Number(qId), selectedOption: opt }));
      await examResultsApi.submit(Number(resultId), payload);
      navigate(`/user/result/${resultId}`);
    } catch (e) {
      console.error(e);
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [resultId, navigate]);

  const endTimeRef = useRef<number>(0);

  useEffect(() => {
    examsApi.getFull(Number(examId)).then(res => {
      const data = res.data;
      setExam(data.examInfo);
      setQuestions(data.questions);
      const seconds = (data.examInfo.timeLimit || 30) * 60;
      setTimeLeft(seconds);
      // Lưu thời điểm kết thúc thực tế dựa vào đồng hồ thực
      endTimeRef.current = Date.now() + seconds * 1000;
    }).catch(console.error).finally(() => setLoading(false));
  }, [examId]);

  // Ref để timer luôn gọi được autoSubmit mới nhất mà không cần restart effect
  const autoSubmitRef = useRef(autoSubmit);
  useEffect(() => { autoSubmitRef.current = autoSubmit; }, [autoSubmit]);

  const hasTime = timeLeft > 0;
  useEffect(() => {
    if (!hasTime) return;
    // Dùng Date.now() để tính thời gian còn lại — không bị nhảnh hưởng bởi throttle của trình duyệt
    timerRef.current = setInterval(() => {
      const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        setTimeLeft(0);
        autoSubmitRef.current();
      } else {
        setTimeLeft(remaining);
      }
    }, 500); // 500ms để nhạy hơn khi quay lại tab
    return () => clearInterval(timerRef.current!);
  }, [hasTime]);

  // Sync ngay khi quay lại tab (visibilitychange)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && endTimeRef.current > 0) {
        const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          setTimeLeft(0);
          autoSubmitRef.current();
        } else {
          setTimeLeft(remaining);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const scrollToQ = (idx: number) => {
    setCurrentQ(idx);
    questionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-[#1B8F3D] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Đang chuẩn bị đề thi...</p>
      </div>
    </div>
  );

  const answeredCount = Object.keys(answers).length;
  const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isLowTime = timeLeft < 300;

  return (
    <div className="min-h-screen bg-[#f8faf9] font-sans text-gray-900 relative">
      {/* Overlay hết giờ */}
      {timeExpired && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-3xl p-10 flex flex-col items-center gap-5 shadow-2xl text-center max-w-sm mx-4 animate-bounce-in">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <Clock size={40} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Hết giờ!</h2>
              <p className="text-gray-500 text-sm">Bài thi đã được nộp tự động.<br />Đang chuyển đến trang kết quả...</p>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full animate-[shrink_2s_linear_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}
      {/* Top Navbar */}
      <nav className="h-16 bg-white border-b border-gray-200 sticky top-0 z-50 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1B8F3D] rounded-lg flex items-center justify-center">
            <CheckCircle className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl text-[#1B8F3D]">Quiz</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-[#1B8F3D]">PHIÊN LÀM BÀI TRỰC TUYẾN</span>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-8 py-8 flex gap-8">
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-8">
          {/* Header */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h1 className="text-3xl font-black text-gray-900 mb-1">{exam?.title}</h1>
            <p className="text-sm font-semibold text-gray-400 flex items-center gap-2 uppercase tracking-wide">
              Chủ đề: <span className="text-gray-600">{exam?.description || exam?.category}</span>
            </p>
          </div>

          {/* Questions List */}
          <div className="flex flex-col gap-6">
            {questions.map((q, idx) => {
              const selected = answers[q.questionId];
              return (
                <div 
                  key={q.questionId} 
                  ref={el => { questionRefs.current[idx] = el; }}
                  className={`bg-white rounded-2xl border transition-all duration-300 p-8 ${
                    currentQ === idx ? 'border-[#1B8F3D] shadow-xl shadow-[#1B8F3D]/5 scale-[1.01]' : 'border-gray-200 shadow-sm'
                  }`}
                  onClick={() => setCurrentQ(idx)}
                >
                  <div className="flex gap-5">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-[#1B8F3D] flex items-center justify-center flex-shrink-0 border border-green-100">
                      <span className="font-bold text-lg">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 leading-relaxed mb-6">
                        {q.content}
                      </h3>

                      {q.imageUrl && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-gray-200">
                          <img src={getImageUrl(q.imageUrl)!} alt="Ảnh câu hỏi" className="w-full object-contain max-h-72 bg-gray-50" />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3">
                        {(['A', 'B', 'C', 'D'] as const).map(opt => {
                          const label = q[`option${opt}` as keyof Question] as string;
                          const isSelected = selected === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => setAnswers(prev => ({ ...prev, [q.questionId]: opt }))}
                              className={`group flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left ${
                                isSelected 
                                  ? 'border-[#1B8F3D] bg-green-50/50' 
                                  : 'border-gray-100 hover:border-[#1B8F3D]/30 hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                                isSelected 
                                  ? 'bg-[#1B8F3D] border-[#1B8F3D] text-white shadow-lg shadow-[#1B8F3D]/20' 
                                  : 'bg-white border-gray-200 text-gray-400 group-hover:border-[#1B8F3D] group-hover:text-[#1B8F3D]'
                              }`}>
                                {opt}
                              </div>
                              <span className={`text-sm font-semibold ${isSelected ? 'text-[#1B8F3D]' : 'text-gray-700'}`}>
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center py-6">
            <button 
              onClick={() => scrollToQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 bg-white text-sm font-bold text-gray-500 hover:border-[#1B8F3D] hover:text-[#1B8F3D] transition-all disabled:opacity-30 disabled:grayscale cursor-pointer"
            >
              <ChevronLeft size={18} /> Quay lại
            </button>
            <div className="text-xs font-bold text-gray-400 tracking-widest uppercase">
              Câu hỏi {currentQ + 1} trên {questions.length}
            </div>
            <button 
              onClick={() => scrollToQ(Math.min(questions.length - 1, currentQ + 1))}
              disabled={currentQ === questions.length - 1}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1B8F3D] text-white text-sm font-bold shadow-lg shadow-[#1B8F3D]/20 hover:bg-[#146c2e] hover:scale-105 transition-all disabled:opacity-30 cursor-pointer"
            >
              Tiếp theo <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-[340px] flex flex-col gap-6 sticky top-24 h-fit">
          {/* Timer Card */}
          <div className={`bg-white p-7 rounded-2xl border-2 shadow-sm text-center ${isLowTime ? 'border-red-400 animate-pulse' : 'border-gray-200'}`}>
            <div className="flex items-center justify-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
              <Clock size={14} className={isLowTime ? 'text-red-500' : ''} /> Thời gian còn lại
            </div>
            <div className={`text-5xl font-black tracking-tighter ${isLowTime ? 'text-red-500' : 'text-gray-900'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="mt-5 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${isLowTime ? 'bg-red-500' : 'bg-[#1B8F3D]'}`} 
                style={{ width: `${(timeLeft / (exam?.timeLimit ? exam.timeLimit * 60 : 1)) * 100}%` }} 
              />
            </div>
          </div>

          {/* Question Grid Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider">Danh sách câu hỏi</h4>
              <span className="text-[11px] font-bold text-gray-400">Đã làm {answeredCount}/{questions.length}</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.questionId];
                const isActive = currentQ === idx;
                return (
                  <button
                    key={q.questionId}
                    onClick={() => scrollToQ(idx)}
                    className={`aspect-square rounded-lg text-xs font-bold transition-all border-2 ${
                      isAnswered 
                        ? 'bg-[#1B8F3D] border-[#1B8F3D] text-white shadow-md shadow-[#1B8F3D]/20' 
                        : isActive
                          ? 'border-[#1B8F3D] text-[#1B8F3D] bg-green-50'
                          : 'border-gray-100 text-gray-400 bg-white hover:border-gray-300'
                    }`}
                  >
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                <div className="w-2.5 h-2.5 rounded bg-[#1B8F3D]" /> Đã làm
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                <div className="w-2.5 h-2.5 rounded border-2 border-gray-200" /> Chưa làm
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                <div className="w-2.5 h-2.5 rounded border-2 border-[#1B8F3D] bg-green-50" /> Hiện tại
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4">Tiến độ tổng quan</h4>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-gray-400">Hoàn thành</span>
              <span className="text-[#1B8F3D]">{progressPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
              <div 
                className="h-full bg-[#1B8F3D] rounded-full transition-all duration-500" 
                style={{ width: `${progressPct}%` }} 
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Đánh dấu xem lại</span>
                <span className="text-xs font-black text-gray-800">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Điểm dự kiến</span>
                <span className="text-xs font-black text-gray-800">{progressPct}%</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 bg-[#1B8F3D] hover:bg-[#146c2e] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#1B8F3D]/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:-translate-y-1 active:translate-y-0"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                NỘP BÀI THI
              </>
            )}
          </button>
          <p className="text-[11px] font-bold text-gray-400 text-center leading-relaxed">
            Sau khi nộp, bạn không thể chỉnh sửa câu trả lời.<br />Điểm số sẽ được tính toán tự động.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default ExamTaking;
