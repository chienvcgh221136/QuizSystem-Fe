import React, { useEffect, useState, useRef } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { examsApi, questionsApi } from '../../api/services';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { stripCreatedByAI } from '../../utils/strings';

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
}

const AdminExams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeTab, setActiveTab] = useState<'admin' | 'ai'>('admin');
  const [search, setSearch] = useState('');
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
    }).finally(() => {
      setLoading(false);
    });
  };

  const openCreate = () => {
    setEditExam(null);
    setForm({ title: '', description: '', category: categories[0] || '', level: 'Trung cấp', timeLimit: 30, totalScore: 100, status: 'Draft', questionCount: 10 });
    setShowModal(true);
  };
  const openEdit = (exam: Exam) => { setEditExam(exam); setForm({ title: stripCreatedByAI(exam.title), description: exam.description || '', category: exam.category, level: exam.level, timeLimit: exam.timeLimit, totalScore: exam.totalScore, status: exam.status, questionCount: 0 }); setShowModal(true); };

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
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ source, questionId }));
    } catch (err) {
      // Some browsers or environments (like older mobile) may not allow setting drag data — ignore safely
      // eslint-disable-next-line no-console
      console.debug('drag data transfer not supported', err);
    }
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
      // insert at index (1-based)
      await examsApi.addQuestion(managingExam.examId, qId, index + 1);
    } else if (payload.source === 'exam') {
      // reorder: move qId to index position
      const ids = examQuestions.map((q) => q.questionId);
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
      const ids = examQuestions.map((q) => q.questionId).filter(id => id !== qId);
      ids.push(qId);
      await examsApi.reorderQuestions(managingExam.examId, ids);
    }
    setDragOverIndex(null);
    openManage(managingExam);
  };

  const handleAddQuestion = async (qId: number) => {
    if (!managingExam) return;
    try {
      await examsApi.addQuestion(managingExam.examId, qId);
      openManage(managingExam);
    } catch (e) { console.error(e); }
  };

  const handleRemoveQuestion = async (qId: number) => {
    if (!managingExam) return;
    try {
      await examsApi.removeQuestion(managingExam.examId, qId);
      openManage(managingExam);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa đề thi này?')) return;
    await examsApi.delete(id); setLoading(true); refresh();
  };

  // Use `visibleExams` for rendering; `filtered` removed to avoid unused variable warning

  const statusBadge: Record<string, string> = {
    Published: 'bg-green-100 text-green-700',
    Draft: 'bg-yellow-100 text-yellow-700',
    Archived: 'bg-gray-100 text-gray-500',
  };

  const statusLabel: Record<string, string> = {
    Published: 'Đã đăng',
    Draft: 'Bản nháp',
    Archived: 'Lưu trữ',
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1a7a4a] focus:ring-2 focus:ring-[#1a7a4a]/10 bg-gray-50 focus:bg-white transition-all";

  const isAICreated = (exam: Exam) => {
    // Prefer explicit flag from backend
    if (exam.createdBy && exam.createdBy.trim().toLowerCase() === 'ai') return true;
    // Fallback to heuristics for older records
    const t = (exam.title || '').toLowerCase();
    const d = (exam.description || '').toLowerCase();
    return t.includes('tạo bởi ai') || d.includes('tự động') || d.includes('tạo bởi ai') || t.includes('đề thi tự động');
  };

  const adminExams = exams.filter(exam => !isAICreated(exam));
  const aiExams = exams.filter(exam => isAICreated(exam));
  const visibleExams = (activeTab === 'admin' ? adminExams : aiExams).filter(exam =>
    exam.title?.toLowerCase().includes(search.toLowerCase()) || exam.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Quản lý Đề thi</h1>
            <p className="text-sm text-gray-500 mt-1">Tạo, chỉnh sửa và quản lý toàn bộ đề thi.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1a7a4a] hover:bg-[#155e3a] text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus size={15} /> Tạo đề mới
          </button>
        </div>

        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Tìm kiếm đề thi..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1a7a4a] bg-gray-50 focus:bg-white transition-colors" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-0 border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 px-5 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'admin' ? 'text-[#1a7a4a] bg-white border-b-2 border-[#1a7a4a]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span>Đề do Admin tạo</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{adminExams.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 px-5 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-[#1a7a4a] bg-white border-b-2 border-[#1a7a4a]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span>Đề do AI tạo</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{aiExams.length}</span>
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Đang tải...</div>
            ) : visibleExams.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                {activeTab === 'admin' ? 'Không có đề do Admin tạo.' : 'Không có đề do AI tạo.'}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleExams.map(exam => (
                  <div key={exam.examId} className="p-3 border border-gray-100 rounded-xl bg-white shadow-sm flex items-center gap-4">
                    {/* Title / desc */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{stripCreatedByAI(exam.title)}</div>
                      <div className="text-xs text-gray-400 truncate hidden md:block">{exam.description}</div>
                    </div>

                    {/* Meta badges */}
                    <div className="flex-none flex items-center gap-3 text-[11px] text-gray-500 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-green-50 text-[#1a7a4a] rounded-full">{exam.category}</span>
                      <span className="uppercase">{exam.level}</span>
                      <span>{exam.timeLimit} phút</span>
                      <span className={`${statusBadge[exam.status] || 'bg-gray-100 text-gray-500'} text-[11px] font-semibold px-2 py-0.5 rounded-full`}>{statusLabel[exam.status] || exam.status}</span>
                      {isAICreated(exam) && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-semibold">AI</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex-none flex items-center gap-2">
                      <button onClick={() => openManage(exam)} className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-[#1a7a4a] hover:text-[#1a7a4a]" title="Quản lý câu hỏi"><Search size={14} /></button>
                      <button onClick={() => openEdit(exam)} className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400" title="Sửa thông tin"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(exam.examId)} className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500" title="Xóa đề"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-7 w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">{editExam ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
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
                  </select>
                </div>
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
                  <label className="block text-xs font-semibold text-[#1a7a4a] mb-1.5">Số lượng câu hỏi tự động (Lấy từ ngân hàng)</label>
                  <input type="number" className={`${inputCls} border-[#1a7a4a]/30 bg-green-50/30`} value={form.questionCount} onChange={e => setForm({ ...form, questionCount: Number(e.target.value) })} />
                  <p className="text-[10px] text-gray-400 mt-1">Hệ thống sẽ tự động bốc ngẫu nhiên số câu hỏi này dựa trên Danh mục & Cấp độ.</p>
                </div>
              )}
            </div>
            <div className="flex gap-2.5 justify-end mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#1a7a4a] hover:bg-[#155e3a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Đang lưu...' : (editExam ? 'Cập nhật' : 'Tạo mới')}
              </button>
            </div>
          </div>
        </div>
      )}

      {managingExam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Quản lý câu hỏi: {stripCreatedByAI(managingExam.title)}</h3>
                  <p className="text-xs text-gray-500 mt-1">Gán hoặc gỡ câu hỏi từ Ngân hàng câu hỏi của hệ thống.</p>
                </div>
                <button onClick={() => { setManagingExam(null); setQSearch(''); }} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all shadow-sm">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2" style={{ height: 'calc(85vh - 100px)' }}>
              {/* Current Questions */}
              <div className="border-r border-gray-100 flex flex-col">
                <div className="p-4 bg-green-50/50 border-b border-green-100 flex flex-col gap-3">
                  <span className="text-sm font-bold text-[#1a7a4a]">Câu hỏi trong đề ({examQuestions.length})</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Tìm trong đề..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1a7a4a] transition-all"
                      value={qSearch}
                      onChange={e => setQSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-y-auto p-4 flex flex-col gap-3" style={{ height: 'calc(85vh - 210px)' }}>
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
                      className={`p-3 border border-gray-100 rounded-xl bg-white shadow-sm flex items-start gap-3 group ${dragOverIndex === i ? 'ring-2 ring-dashed ring-green-200' : ''}`}>
                      <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 leading-snug">{q.content}</p>
                      </div>
                      <button onClick={() => handleRemoveQuestion(q.questionId)} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                {/* Allow dropping at end */}
                <div onDragOver={(e) => { e.preventDefault(); setDragOverIndex(examQuestions.length); }} onDrop={handleDropOnListEnd} />
                </div>
              </div>

              {/* Available from Bank */}
              <div className="flex flex-col bg-gray-50/30">
                <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex flex-col gap-3">
                  <span className="text-sm font-bold text-blue-700">Ngân hàng ({managingExam.category})</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Tìm trong ngân hàng..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                      value={bSearch}
                      onChange={e => setBSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-y-auto p-4 flex flex-col gap-3" style={{ height: 'calc(85vh - 210px)' }}>
                  {loadingQuestions ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>
                  ) : availableQuestions.filter(q => q.content.toLowerCase().includes(bSearch.toLowerCase())).length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm italic">Không tìm thấy câu hỏi phù hợp.</div>
                  ) : availableQuestions.filter(q => q.content.toLowerCase().includes(bSearch.toLowerCase())).map(q => (
                    <div key={q.questionId}
                      draggable
                      onDragStart={(e) => handleDragStart('bank', q.questionId, e)}
                      className="p-3 border border-gray-100 rounded-xl bg-white shadow-sm flex items-start gap-3 hover:border-blue-200 transition-all group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 leading-snug">{q.content}</p>
                        <span className="text-[10px] font-bold text-blue-500 uppercase mt-2 inline-block tracking-wider">{q.level}</span>
                      </div>
                      <button onClick={() => handleAddQuestion(q.questionId)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-600 hover:text-white transition-all">
                        <Plus size={12} /> Thêm
                      </button>
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
