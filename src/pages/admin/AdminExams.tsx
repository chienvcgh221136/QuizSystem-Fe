import React, { useEffect, useState, useRef } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { examsApi, questionsApi } from '../../api/services';
import { Plus, Pencil, Trash2, Search, X, Check, Download } from 'lucide-react';
import { stripCreatedByAI } from '../../utils/strings';
import { getImageUrl } from '../../utils/imageUrl';

interface Exam {
  examId: number;
  title: string;
  description?: string;
  category: string;
  level: string;
  timeLimit: number;
  totalScore: number;
  status: string;
  createdBy?: string;
  createdAt: string;
}

interface Question {
  questionId: number;
  content: string;
  category?: string;
  level?: string;
  scorePerQuestion?: number;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  imageUrl?: string;
}

const OptionRow = ({ letter, text, isCorrect }: { letter: string; text?: string; isCorrect: boolean }) => {
  if (!text) return null;
  return (
    <div className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
      isCorrect
        ? 'bg-green-50 border border-green-200 text-green-800 font-semibold'
        : 'bg-gray-50 border border-gray-100 text-gray-600'
    }`}>
      <span className={`shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5 ${
        isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
      }`}>{letter}</span>
      <span className="leading-relaxed flex-1">{text}</span>
      {isCorrect && <Check size={12} className="ml-auto shrink-0 mt-0.5 text-green-600" />}
    </div>
  );
};

const QuestionImg = ({ url }: { url?: string | null }) => {
  const src = getImageUrl(url);
  if (!src) return null;
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
      <img src={src} alt="Ảnh câu hỏi" className="w-full max-h-40 object-contain" onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
    </div>
  );
};

const AdminExams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeTab, setActiveTab] = useState<'admin' | 'ai'>('admin');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [search, setSearch] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);
  const [qSearch, setQSearch] = useState('');
  const [bSearch, setBSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', level: 'Trung cấp', timeLimit: 30, totalScore: 100, status: 'Draft', questionCount: 10 });
  const [managingExam, setManagingExam] = useState<Exam | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const dragSrc = useRef<{ source: 'bank' | 'exam' | null, questionId: number | null }>({ source: null, questionId: null });
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await examsApi.getAll();
        const sorted = (r.data as Exam[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setExams(sorted);
        const catRes = await questionsApi.getCategories();
        setCategories(catRes.data);
        setForm(prev => {
          if (catRes.data.length > 0 && !prev.category) return { ...prev, category: catRes.data[0] };
          return prev;
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const refresh = () => {
    setLoading(true);
    examsApi.getAll().then(r => {
      const sorted = (r.data as Exam[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExams(sorted);
    }).finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditExam(null);
    setForm({ title: '', description: '', category: categories[0] || '', level: 'Trung cấp', timeLimit: 30, totalScore: 100, status: 'Draft', questionCount: 10 });
    setShowModal(true);
  };

  const openEdit = (exam: Exam) => {
    setEditExam(exam);
    setForm({ title: stripCreatedByAI(exam.title), description: exam.description || '', category: exam.category, level: exam.level, timeLimit: exam.timeLimit, totalScore: exam.totalScore, status: exam.status, questionCount: 0 });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editExam) await examsApi.update(editExam.examId, { ...form, examId: editExam.examId });
      else await examsApi.create(form);
      setShowModal(false); setLoading(true); refresh();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const openManage = async (exam: Exam) => {
    setManagingExam(exam);
    setLoadingQuestions(true);
    try {
      const [full, avail] = await Promise.all([
        examsApi.getFull(exam.examId),
        examsApi.getAvailableQuestions(exam.examId)
      ]);
      setExamQuestions(full.data.questions);
      setAvailableQuestions(avail.data);
    } catch (e) { console.error(e); } finally { setLoadingQuestions(false); }
  };

  const handleDragStart = (source: 'bank' | 'exam', questionId: number, e: React.DragEvent) => {
    dragSrc.current = { source, questionId };
    try { e.dataTransfer.setData('text/plain', JSON.stringify({ source, questionId })); } catch (err) { console.debug('drag not supported', err); }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverItem = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnItem = async (index: number, e: React.DragEvent) => {
    e.preventDefault();
    let payload;
    try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { payload = dragSrc.current; }
    if (!payload || !managingExam) return;
    const qId = payload.questionId as number;
    if (payload.source === 'bank') {
      await examsApi.addQuestion(managingExam.examId, qId);
    } else if (payload.source === 'exam') {
      const ids = examQuestions.map(q => q.questionId);
      const fromIdx = ids.indexOf(qId);
      if (fromIdx === -1) return;
      ids.splice(fromIdx, 1);
      ids.splice(index, 0, qId);
      await examsApi.reorderQuestions(managingExam.examId, ids);
    }
    setDragOverIndex(null);
    openManage(managingExam);
  };

  const handleDropOnListEnd = async (e: React.DragEvent) => {
    e.preventDefault();
    let payload;
    try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { payload = dragSrc.current; }
    if (!payload || !managingExam) return;
    const qId = payload.questionId as number;
    if (payload.source === 'bank') {
      await examsApi.addQuestion(managingExam.examId, qId);
    } else if (payload.source === 'exam') {
      const ids = examQuestions.map(q => q.questionId).filter(id => id !== qId);
      ids.push(qId);
      await examsApi.reorderQuestions(managingExam.examId, ids);
    }
    setDragOverIndex(null);
    openManage(managingExam);
  };

  const handleAddQuestion = async (qId: number) => {
    if (!managingExam) return;
    try { await examsApi.addQuestion(managingExam.examId, qId); openManage(managingExam); }
    catch (e) { console.error(e); }
  };

  const handleRemoveQuestion = async (qId: number) => {
    if (!managingExam) return;
    try { await examsApi.removeQuestion(managingExam.examId, qId); openManage(managingExam); }
    catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa đề thi này?')) return;
    await examsApi.delete(id); setLoading(true); refresh();
  };

  const handleExportExam = async (examId: number, title: string) => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/Exams/${examId}/export?t=${new Date().getTime()}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Network response was not ok');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `DeThi_${title.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert('Có lỗi xảy ra khi xuất Excel');
    }
  };

  const statusBadge: Record<string, string> = {
    Published: 'bg-green-100 text-green-700',
    Draft: 'bg-yellow-100 text-yellow-700',
    Archived: 'bg-gray-100 text-gray-500',
  };
  const statusLabel: Record<string, string> = { Published: 'Đã đăng', Draft: 'Bản nháp', Archived: 'Lưu trữ' };
  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B8F3D] focus:ring-2 focus:ring-[#1B8F3D]/10 bg-gray-50 focus:bg-white transition-all";

  const isAICreated = (exam: Exam) => {
    if (exam.createdBy && exam.createdBy.trim().toLowerCase() === 'ai') return true;
    const t = (exam.title || '').toLowerCase();
    const d = (exam.description || '').toLowerCase();
    return t.includes('tạo bởi ai') || d.includes('tự động') || d.includes('tạo bởi ai') || t.includes('đề thi tự động');
  };

  const adminExams = exams.filter(e => !isAICreated(e));
  const aiExams = exams.filter(e => isAICreated(e));
  const visibleExams = (activeTab === 'admin' ? adminExams : aiExams).filter(e =>
    e.title?.toLowerCase().includes(search.toLowerCase()) || e.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(visibleExams.length / itemsPerPage);
  const paginatedExams = visibleExams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Quản lý Đề thi</h1>
            <p className="text-sm text-gray-500 mt-1">Tạo, chỉnh sửa và quản lý toàn bộ đề thi.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1B8F3D] hover:bg-[#146c2e] text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus size={15} /> Tạo đề mới
          </button>
        </div>

        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Tìm kiếm đề thi..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B8F3D] bg-gray-50 focus:bg-white transition-colors" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50">
            {(['admin', 'ai'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 px-5 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === tab ? 'text-[#1B8F3D] bg-white border-b-2 border-[#1B8F3D]' : 'text-gray-500 hover:text-gray-700'}`}>
                <span>{tab === 'admin' ? 'Đề do Admin tạo' : 'Đề do AI tạo'}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {tab === 'admin' ? adminExams.length : aiExams.length}
                </span>
              </button>
            ))}
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Đang tải...</div>
            ) : visibleExams.length === 0 ? (
              <div className="text-center py-10 text-gray-400">{activeTab === 'admin' ? 'Không có đề do Admin tạo.' : 'Không có đề do AI tạo.'}</div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedExams.map(exam => (
                  <div key={exam.examId} className="p-3 border border-gray-100 rounded-xl bg-white shadow-sm flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{stripCreatedByAI(exam.title)}</div>
                      <div className="text-xs text-gray-400 truncate hidden md:block">{exam.description}</div>
                    </div>
                    <div className="flex-none flex items-center gap-3 text-[11px] text-gray-500 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-green-50 text-[#1B8F3D] rounded-full">{exam.category}</span>
                      <span className="uppercase">{exam.level}</span>
                      <span>{exam.timeLimit} phút</span>
                      <span className={`${statusBadge[exam.status] || 'bg-gray-100 text-gray-500'} text-[11px] font-semibold px-2 py-0.5 rounded-full`}>
                        {statusLabel[exam.status] || exam.status}
                      </span>
                      {isAICreated(exam) && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-semibold">AI</span>}
                    </div>
                    <div className="flex-none flex items-center gap-2">
                      <button onClick={() => openManage(exam)} className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-[#1B8F3D] hover:text-[#1B8F3D]" title="Quản lý câu hỏi"><Search size={14} /></button>
                      <button onClick={() => openEdit(exam)} className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-[#1B8F3D] hover:text-[#1B8F3D]" title="Sửa thông tin"><Pencil size={14} /></button>
                      <button onClick={() => handleExportExam(exam.examId, exam.title)} className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500" title="Xuất Excel đề thi"><Download size={14} /></button>
                      <button onClick={() => handleDelete(exam.examId)} className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500" title="Xóa đề"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-6 mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="text-sm font-medium text-[#1B8F3D] hover:text-[#146c2e] disabled:text-gray-300 transition-colors"
                    >
                      Trang trước
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                      Hiển thị trang {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="text-sm font-medium text-[#1B8F3D] hover:text-[#146c2e] disabled:text-gray-300 transition-colors"
                    >
                      Trang sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create / Edit Exam */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-7 w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">{editExam ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Tên đề thi</label>
                <input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nhập tên đề thi..." /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Mô tả</label>
                <textarea className={inputCls} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả..." rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Danh mục</label>
                  <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">Chọn danh mục...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Cấp độ</label>
                  <select className={inputCls} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                    <option>Sơ cấp</option><option>Trung cấp</option><option>Cao cấp</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Thời gian (phút)</label>
                  <input type="number" className={inputCls} value={form.timeLimit} onChange={e => setForm({ ...form, timeLimit: Number(e.target.value) })} /></div>
                <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Tổng điểm</label>
                  <input type="number" className={inputCls} value={form.totalScore} onChange={e => setForm({ ...form, totalScore: Number(e.target.value) })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Trạng thái</label>
                <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="Draft">Bản nháp</option><option value="Published">Đã đăng</option>
                </select></div>
              {!editExam && (
                <div>
                  <label className="block text-xs font-semibold text-[#1B8F3D] mb-1.5">Số lượng câu hỏi tự động</label>
                  <input type="number" className={`${inputCls} border-[#1B8F3D]/30 bg-green-50/30`} value={form.questionCount} onChange={e => setForm({ ...form, questionCount: Number(e.target.value) })} />
                  <p className="text-[10px] text-gray-400 mt-1">Hệ thống sẽ tự động bốc ngẫu nhiên dựa trên Danh mục &amp; Cấp độ.</p>
                </div>
              )}
            </div>
            <div className="flex gap-2.5 justify-end mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#1B8F3D] hover:bg-[#146c2e] text-white text-sm font-semibold rounded-lg disabled:opacity-60">
                {saving ? 'Đang lưu...' : (editExam ? 'Cập nhật' : 'Tạo mới')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage Questions */}
      {managingExam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl flex flex-col shadow-2xl" style={{ height: '90vh' }}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-black text-gray-900">Quản lý câu hỏi: {stripCreatedByAI(managingExam.title)}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Gán hoặc gỡ câu hỏi từ Ngân hàng câu hỏi của hệ thống.</p>
              </div>
              <button onClick={() => { setManagingExam(null); setQSearch(''); setBSearch(''); }}
                className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 flex-1 min-h-0">
              {/* Left — Câu hỏi trong đề */}
              <div className="border-r border-gray-100 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-green-50/60 border-b border-green-100 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#1B8F3D]">Câu hỏi trong đề</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{examQuestions.length} câu</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                    <input type="text" placeholder="Tìm trong đề..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B8F3D]"
                      value={qSearch} onChange={e => setQSearch(e.target.value)} />
                  </div>
                </div>

                <div className="overflow-y-auto p-4 flex flex-col gap-3 flex-1">
                  {loadingQuestions ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>
                  ) : examQuestions.filter(q => q.content.toLowerCase().includes(qSearch.toLowerCase())).length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm italic">Không tìm thấy câu hỏi nào.</div>
                  ) : examQuestions.filter(q => q.content.toLowerCase().includes(qSearch.toLowerCase())).map((q, i) => (
                    <div key={q.questionId}
                      draggable
                      onDragStart={(e) => handleDragStart('exam', q.questionId, e)}
                      onDragOver={(e) => handleDragOverItem(i, e)}
                      onDrop={(e) => handleDropOnItem(i, e)}
                      className={`border rounded-xl bg-white shadow-sm flex flex-col gap-2.5 p-3.5 group transition-all ${dragOverIndex === i ? 'ring-2 ring-dashed ring-green-300 border-green-200' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-[#1B8F3D]/10 text-[#1B8F3D] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="flex-1 text-sm font-semibold text-gray-800 leading-snug">{q.content}</p>
                        <button onClick={() => handleRemoveQuestion(q.questionId)}
                          className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {(q.optionA || q.optionB) && (
                        <div className="flex flex-col gap-1 ml-1">
                          {q.imageUrl && <QuestionImg url={q.imageUrl} />}
                          <OptionRow letter="A" text={q.optionA} isCorrect={q.correctOption === 'A'} />
                          <OptionRow letter="B" text={q.optionB} isCorrect={q.correctOption === 'B'} />
                          <OptionRow letter="C" text={q.optionC} isCorrect={q.correctOption === 'C'} />
                          <OptionRow letter="D" text={q.optionD} isCorrect={q.correctOption === 'D'} />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 ml-1 flex-wrap">
                        {q.level && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider px-2 py-0.5 bg-blue-50 rounded-full">{q.level}</span>}
                        {q.correctOption && <span className="text-[9px] font-bold text-green-600 px-2 py-0.5 bg-green-50 rounded-full flex items-center gap-1"><Check size={9} />Đáp án: {q.correctOption}</span>}
                      </div>
                    </div>
                  ))}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(examQuestions.length); }}
                    onDrop={handleDropOnListEnd}
                    className="h-12 rounded-xl border-2 border-dashed border-transparent hover:border-green-200 transition-colors"
                  />
                </div>
              </div>

              {/* Right — Ngân hàng câu hỏi */}
              <div className="flex flex-col min-h-0 bg-gray-50/30">
                <div className="px-4 py-3 bg-blue-50/60 border-b border-blue-100 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-blue-700">Ngân hàng ({managingExam.category})</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{availableQuestions.length} câu</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                    <input type="text" placeholder="Tìm trong ngân hàng..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
                      value={bSearch} onChange={e => setBSearch(e.target.value)} />
                  </div>
                </div>

                <div className="overflow-y-auto p-4 flex flex-col gap-3 flex-1">
                  {loadingQuestions ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>
                  ) : availableQuestions.filter(q => q.content.toLowerCase().includes(bSearch.toLowerCase())).length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm italic">Không tìm thấy câu hỏi phù hợp.</div>
                  ) : availableQuestions.filter(q => q.content.toLowerCase().includes(bSearch.toLowerCase())).map(q => (
                    <div key={q.questionId}
                      draggable
                      onDragStart={(e) => handleDragStart('bank', q.questionId, e)}
                      className="border border-gray-100 rounded-xl bg-white shadow-sm flex flex-col gap-2.5 p-3.5 hover:border-blue-200 transition-all group"
                    >
                      <div className="flex items-start gap-2.5">
                        <p className="flex-1 text-sm font-semibold text-gray-800 leading-snug">{q.content}</p>
                        <button onClick={() => handleAddQuestion(q.questionId)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-600 hover:text-white transition-all">
                          <Plus size={12} /> Thêm
                        </button>
                      </div>
                      {(q.optionA || q.optionB) && (
                        <div className="flex flex-col gap-1">
                          {q.imageUrl && <QuestionImg url={q.imageUrl} />}
                          <OptionRow letter="A" text={q.optionA} isCorrect={q.correctOption === 'A'} />
                          <OptionRow letter="B" text={q.optionB} isCorrect={q.correctOption === 'B'} />
                          <OptionRow letter="C" text={q.optionC} isCorrect={q.correctOption === 'C'} />
                          <OptionRow letter="D" text={q.optionD} isCorrect={q.correctOption === 'D'} />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {q.level && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider px-2 py-0.5 bg-blue-50 rounded-full">{q.level}</span>}
                        {q.correctOption && <span className="text-[9px] font-bold text-green-600 px-2 py-0.5 bg-green-50 rounded-full flex items-center gap-1"><Check size={9} />Đáp án: {q.correctOption}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminExams;
