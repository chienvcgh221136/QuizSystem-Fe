import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examResultsApi } from '../../api/services';
import UserLayout from '../../layouts/UserLayout';
import { CheckCircle2, XCircle, Trophy, Clock, ArrowLeft } from 'lucide-react';

interface ExamResultData {
  resultInfo: {
    examTitle: string;
    score: number;
    maxScore: number;
    submitTime: string | null;
  };
  summary: { correct: number; wrong: number };
  answers: {
    questionId: number;
    content: string;
    isCorrect: boolean;
    correctOption: string;
    selectedOption: string;
    [key: string]: string | number | boolean;
  }[];
}

const ExamResult: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<ExamResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examResultsApi.getResult(Number(resultId)).then(res => setResult(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [resultId]);

  if (loading) return <UserLayout><div className="flex justify-center py-20 text-gray-400">Loading result...</div></UserLayout>;
  if (!result) return <UserLayout><div className="flex justify-center py-20 text-gray-400">Result not found.</div></UserLayout>;

  const { resultInfo, summary, answers } = result;
  const pct = resultInfo.maxScore ? Math.round((resultInfo.score / resultInfo.maxScore) * 100) : 0;
  const passed = pct >= 50;

  return (
    <UserLayout>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <button onClick={() => navigate('/user/history')} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1B8F3D] transition-colors bg-none border-none">
          <ArrowLeft size={14} /> Quay lại lịch sử
        </button>

        {/* Score card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-10 flex flex-col items-center gap-3 text-center shadow-md">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
            <Trophy size={36} className={passed ? 'text-green-600' : 'text-red-500'} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{resultInfo.examTitle}</h2>
          <div className={`text-5xl font-black ${passed ? 'text-[#1B8F3D]' : 'text-red-500'}`}>
            {resultInfo.score}/{resultInfo.maxScore}
          </div>
          <span className={`text-sm font-bold px-5 py-1.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {passed ? '✓ Đã đạt' : '✗ Chưa đạt'}
          </span>
          <div className="flex gap-6 mt-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-500"><CheckCircle2 size={15} className="text-green-500" /> {summary.correct} Đúng</div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500"><XCircle size={15} className="text-red-400" /> {summary.wrong} Sai</div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500"><Clock size={15} className="text-gray-400" /> {resultInfo.submitTime ? new Date(resultInfo.submitTime).toLocaleDateString('vi-VN') : '-'}</div>
          </div>
        </div>

        {/* Answer review */}
        <h3 className="text-lg font-bold text-gray-900">Xem lại bài làm</h3>
        <div className="flex flex-col gap-4">
          {answers.map((a, idx) => (
            <div key={a.questionId} className={`bg-white rounded-xl border p-5 ${a.isCorrect ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-red-400'} border-gray-200`}>
              <div className="flex items-start gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                <p className="flex-1 text-sm font-semibold text-gray-900 leading-relaxed">{a.content}</p>
                <span className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${a.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                  {a.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {a.isCorrect ? 'Đúng' : 'Sai'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {(['A', 'B', 'C', 'D'] as const).map(opt => {
                  const val = a[`option${opt}`];
                  const isSelected = a.selectedOption === opt;
                  const isCorrect = a.correctOption === opt;
                  return (
                    <div
                      key={opt}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm relative ${
                        isCorrect ? 'border-green-400 bg-green-50 text-green-800 font-semibold'
                        : isSelected && !isCorrect ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs font-bold bg-gray-50 flex-shrink-0">{opt}</span>
                      <span className="flex-1">{val}</span>
                      {isCorrect && <span className="text-[11px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full ml-auto">Đáp án đúng</span>}
                      {isSelected && !isCorrect && <span className="text-[11px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full ml-auto">Bạn chọn</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </UserLayout>
  );
};

export default ExamResult;
