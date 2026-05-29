import React, { useEffect, useState, useRef } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { questionsApi, examsApi } from '../../api/services';
import { PlusCircle, Search, Edit2, Trash2, Filter, Database, X, Check, Upload, FileText, Image, Loader2, AlertCircle, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

interface Question {
  questionId: number;
  content: string;
  category: string;
  level: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  explanation?: string;
  imageUrl?: string;
}

interface ParsedQuestion {
  text: string;
  options: string[];
  answer: string;
  imageUrl?: string;
}

interface ParseResult {
  message: string;
  totalQuestions: number;
  totalImages: number;
  questions: ParsedQuestion[];
}

const AdminQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [form, setForm] = useState({
    content: '', category: '', level: 'Sơ cấp',
    options: ['', '', '', ''], correctOption: 0, explanation: '', imageUrl: ''
  });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');

  // Import vision states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ParseResult | null>(null);
  const [importError, setImportError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importCategory, setImportCategory] = useState('');
  const [importLevel, setImportLevel] = useState('Sơ cấp');
  const [savingImport, setSavingImport] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQuestions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await questionsApi.getAll();
      setQuestions(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchQuestions();
      const r = await questionsApi.getCategories();
      setCategories(r.data);
    };
    init();
  }, [fetchQuestions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { options, ...rest } = form;
      const payload = {
        ...rest,
        optionA: options[0], optionB: options[1],
        optionC: options[2], optionD: options[3],
        isActive: true, scorePerQuestion: 1.0,
        correctOption: String.fromCharCode(65 + form.correctOption),
        imageUrl: form.imageUrl || null
      };
      if (editingQ) {
        await questionsApi.update(editingQ.questionId, { ...payload, questionId: editingQ.questionId });
      } else {
        await questionsApi.create(payload);
      }
      setShowModal(false);
      await fetchQuestions();
      const r = await questionsApi.getCategories();
      setCategories(r.data);
    } catch (e) {
      console.error(e);
      alert('Có lỗi xảy ra khi lưu câu hỏi.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa câu hỏi này khỏi ngân hàng?')) return;
    try { await questionsApi.delete(id); fetchQuestions(); }
    catch (e) { console.error(e); }
  };

  const openEdit = (q: Question) => {
    setEditingQ(q);
    setForm({
      content: q.content, category: q.category, level: q.level,
      options: [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''],
      correctOption: (q.correctOption?.charCodeAt(0) ?? 65) - 65,
      explanation: q.explanation || '',
      imageUrl: q.imageUrl || ''
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingQ(null);
    setForm({ content: '', category: categories[0] || '', level: 'Sơ cấp', options: ['', '', '', ''], correctOption: 0, explanation: '', imageUrl: '' });
    setShowModal(true);
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    setImportResult(null);
    setImportError('');
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.pdf') || f.name.endsWith('.docx'))) {
      setSelectedFile(f);
      setImportResult(null);
      setImportError('');
    }
  };

  const handleImportScan = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const res = await examsApi.parseVisionSmart(fd);
      setImportResult(res.data);
      // Mặc định chọn tất cả câu hỏi
      setCheckedQuestions(new Set(res.data.questions.map((_: ParsedQuestion, i: number) => i)));
    } catch (e: any) {
      setImportError(e.response?.data?.message ?? 'Lỗi kết nối tới server. Vui lòng thử lại.');
      if (e.response?.data?.error) {
        console.error('[Vision Import Error]', e.response.data.error, e.response.data.inner);
      }

    } finally { setImporting(false); }
  };

  const toggleCheck = (idx: number) => {
    setCheckedQuestions(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleExpand = (idx: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSaveImport = async () => {
    if (!importResult || checkedQuestions.size === 0) return;
    setSavingImport(true);
    let saved = 0;
    let failed = 0;
    for (const idx of checkedQuestions) {
      const q = importResult.questions[idx];
      try {
        await questionsApi.create({
          content: q.text,
          optionA: q.options?.[0] ?? '',
          optionB: q.options?.[1] ?? '',
          optionC: q.options?.[2] ?? null,
          optionD: q.options?.[3] ?? null,
          correctOption: q.answer,
          category: importCategory || 'Chưa phân loại',
          level: importLevel,
          isActive: true,
          scorePerQuestion: 1.0,
          imageUrl: q.imageUrl ?? null,
        });
        saved++;
      } catch { failed++; }
    }
    setSavingImport(false);
    await fetchQuestions();
    const r = await questionsApi.getCategories();
    setCategories(r.data);
    alert(`✅ Đã lưu ${saved} câu hỏi vào ngân hàng.${failed > 0 ? ` (${failed} câu thất bại)` : ''}`);
    setShowImportModal(false);
  };

  const filtered = questions.filter(q => {
    const matchSearch = q.content.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === 'All' || q.category === selectedCat;
    const matchLevel = selectedLevel === 'All' || q.level === selectedLevel;
    return matchSearch && matchCat && matchLevel;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Ngân hàng câu hỏi</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý kho câu hỏi dùng chung cho toàn bộ hệ thống đề thi.</p>
          </div>
          <div className="flex items-center gap-3">

            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#1a7a4a] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#15633c] transition-all shadow-lg shadow-green-900/10 active:scale-95"
            >
              <PlusCircle size={18} />
              Thêm câu hỏi
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung câu hỏi..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a7a4a]/20 focus:border-[#1a7a4a] outline-none transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Filter size={16} />
              <span className="text-[#1a7a4a] font-bold">{filtered.length}</span> / {questions.length} câu hỏi
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-2">Danh mục:</span>
            {['All', ...categories].map(cat => (
              <button key={cat} onClick={() => setSelectedCat(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCat === cat ? 'bg-[#1a7a4a] text-white border-[#1a7a4a] shadow-md shadow-green-900/10' : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a7a4a]/30 hover:text-gray-700 shadow-sm'}`}>
                {cat === 'All' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-2">Độ khó:</span>
            {['All', 'Sơ cấp', 'Trung cấp', 'Cao cấp'].map(lvl => (
              <button key={lvl} onClick={() => setSelectedLevel(lvl)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedLevel === lvl ? 'bg-[#1a7a4a] text-white border-[#1a7a4a] shadow-md shadow-green-900/10' : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a7a4a]/30 hover:text-gray-700 shadow-sm'}`}>
                {lvl === 'All' ? 'Tất cả' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Question List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="text-center py-20 text-gray-400">Đang tải dữ liệu...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white border border-dashed border-gray-200 rounded-2xl">Không tìm thấy câu hỏi nào.</div>
          ) : filtered.map(q => (
            <div key={q.questionId} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#1a7a4a]/30 transition-all shadow-sm group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">ID: {q.questionId}</span>
                    <span className="px-2.5 py-0.5 bg-green-50 text-[#1a7a4a] text-[10px] font-bold rounded-full uppercase tracking-wider">{q.category}</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">{q.level}</span>
                    {q.imageUrl && (
                      <span className="px-2.5 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Image size={10} /> Có ảnh
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-900 font-bold leading-relaxed">{q.content}</h3>
                  {/* Hiển thị ảnh đính kèm câu hỏi (nếu có) */}
                  {q.imageUrl && (
                    <div className="mt-3">
                      <img
                        src={getImageUrl(q.imageUrl)!}
                        alt="Ảnh đính kèm câu hỏi"
                        className="max-h-48 rounded-xl border border-violet-100 object-contain bg-gray-50"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Đáp án */}
                  {(q.optionA || q.optionB) && (
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {[
                        { letter: 'A', text: q.optionA },
                        { letter: 'B', text: q.optionB },
                        { letter: 'C', text: q.optionC },
                        { letter: 'D', text: q.optionD },
                      ].filter(o => o.text).map(({ letter, text }) => {
                        const isCorrect = q.correctOption === letter;
                        return (
                          <div key={letter} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                            isCorrect
                              ? 'bg-green-50 border border-green-200 text-green-800 font-semibold'
                              : 'bg-gray-50 border border-gray-100 text-gray-500'
                          }`}>
                            <span className={`shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5 ${
                              isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                            }`}>{letter}</span>
                            <span className="leading-relaxed">{text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(q.questionId)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── MODAL: Tạo / Sửa câu hỏi ──────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-[#1a7a4a] flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">{editingQ ? 'Sửa câu hỏi' : 'Tạo câu hỏi mới'}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nội dung câu hỏi</label>
                  <textarea required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#1a7a4a]/20 focus:border-[#1a7a4a] outline-none transition-all min-h-[100px]"
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                  />
                </div>

                {/* Ảnh đính kèm câu hỏi */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Image size={12} /> Ảnh đính kèm (Tùy chọn)
                  </label>

                  {form.imageUrl ? (
                    /* Đang có ảnh — hiển thị preview + nút thay/xóa */
                    <div className="border border-violet-200 rounded-2xl overflow-hidden bg-gray-50">
                      <div className="flex items-center justify-center p-4">
                        <img
                          src={getImageUrl(form.imageUrl)!}
                          alt="Ảnh đính kèm"
                          className="max-h-56 object-contain rounded-xl"
                          onError={e => { (e.target as HTMLImageElement).src = ''; }}
                        />
                      </div>
                      <div className="flex items-center gap-2 px-4 pb-3">
                        <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                          <Upload size={12} /> Thay ảnh khác
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const fd = new FormData();
                            fd.append('file', file);
                            try {
                              const res = await fetch(`${import.meta.env.VITE_API_URL}/questions/upload-image`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                                body: fd,
                              });
                              const data = await res.json();
                              if (data.imageUrl) setForm(f => ({ ...f, imageUrl: data.imageUrl }));
                            } catch { /* giữ ảnh cũ */ }
                          }} />
                        </label>
                        <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })}
                          className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-xs font-bold transition-colors">
                          <X size={12} /> Xóa ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Chưa có ảnh — vùng kéo thả / chọn file */
                    <label className="flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:border-violet-300 hover:bg-violet-50/30 cursor-pointer transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                        <Upload size={18} className="text-gray-400 group-hover:text-violet-500 transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-500 group-hover:text-violet-600 transition-colors">Nhấn để chọn ảnh</p>
                        <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, GIF tối đa 5MB</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append('file', file);
                        try {
                          const res = await fetch(`${import.meta.env.VITE_API_URL}/questions/upload-image`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                            body: fd,
                          });
                          const data = await res.json();
                          if (data.imageUrl) setForm(f => ({ ...f, imageUrl: data.imageUrl }));
                        } catch { /* bỏ qua lỗi */ }
                      }} />
                    </label>
                  )}
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Danh mục</label>
                    <select required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1a7a4a]"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="New">+ Thêm danh mục mới...</option>
                    </select>
                    {form.category === 'New' && (
                      <input type="text" placeholder="Nhập tên danh mục mới..."
                        className="w-full mt-2 px-4 py-2 bg-white border border-[#1a7a4a] rounded-xl text-sm outline-none" autoFocus
                        onBlur={e => {
                          if (e.target.value) {
                            setForm({ ...form, category: e.target.value });
                            if (!categories.includes(e.target.value)) setCategories([...categories, e.target.value]);
                          } else setForm({ ...form, category: '' });
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Độ khó</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1a7a4a]"
                      value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                      <option>Sơ cấp</option><option>Trung cấp</option><option>Cao cấp</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Các đáp án (Tích chọn đáp án đúng)</label>
                  {form.options.map((opt, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-2 rounded-2xl border transition-all ${form.correctOption === idx ? 'bg-green-50 border-[#1a7a4a] shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="flex items-center cursor-pointer p-2">
                        <input type="radio" name="correctOption" checked={form.correctOption === idx}
                          onChange={() => setForm({ ...form, correctOption: idx })}
                          className="w-4 h-4 text-[#1a7a4a] focus:ring-[#1a7a4a]" />
                      </label>
                      <span className="text-xs font-bold text-gray-400 w-4">{String.fromCharCode(65 + idx)}</span>
                      <input type="text" required placeholder={`Nhập đáp án ${String.fromCharCode(65 + idx)}...`}
                        className="flex-1 bg-transparent border-none text-sm outline-none placeholder:text-gray-300"
                        value={opt}
                        onChange={e => {
                          const newOpts = [...form.options];
                          newOpts[idx] = e.target.value;
                          setForm({ ...form, options: newOpts });
                        }} />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Giải thích đáp án (Tùy chọn)</label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#1a7a4a]/20 focus:border-[#1a7a4a] outline-none transition-all min-h-[80px]"
                    placeholder="Giải thích tại sao đáp án này đúng..."
                    value={form.explanation}
                    onChange={e => setForm({ ...form, explanation: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all">Hủy</button>
                  <button type="submit" disabled={saving}
                    className="flex-[2] bg-[#1a7a4a] text-white py-3 rounded-xl font-bold hover:bg-[#15633c] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/10">
                    {saving ? 'Đang lưu...' : <><Check size={20} /> Lưu câu hỏi</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: Import từ file PDF/Word ──────────────────────────────────── */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-violet-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Import câu hỏi từ file</h3>
                    <p className="text-xs text-gray-500">AI sẽ đọc file và trích xuất câu hỏi + hình ảnh tự động</p>
                  </div>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={22} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Upload zone */}
                {!importResult && (
                  <>
                    <div
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${selectedFile ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDropFile}
                    >
                      <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileSelect} />
                      {selectedFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
                            <FileText size={24} />
                          </div>
                          <p className="font-bold text-gray-800">{selectedFile.name}</p>
                          <p className="text-sm text-gray-400">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                          <p className="text-xs text-violet-500">Nhấn để đổi file</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                            <Upload size={28} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-700">Kéo thả hoặc nhấn để chọn file</p>
                            <p className="text-sm text-gray-400 mt-1">Hỗ trợ PDF, DOCX — Tối đa 20MB</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Danh mục cho câu hỏi</label>
                        <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500"
                          value={importCategory} onChange={e => setImportCategory(e.target.value)}>
                          <option value="">Chưa phân loại</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Độ khó</label>
                        <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-500"
                          value={importLevel} onChange={e => setImportLevel(e.target.value)}>
                          <option>Sơ cấp</option><option>Trung cấp</option><option>Cao cấp</option>
                        </select>
                      </div>
                    </div>

                    {/* Error */}
                    {importError && (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{importError}</span>
                      </div>
                    )}

                    {/* Scan button */}
                    <button
                      onClick={handleImportScan}
                      disabled={!selectedFile || importing}
                      className="w-full py-3.5 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/10"
                    >
                      {importing ? (
                        <><Loader2 size={18} className="animate-spin" /> AI đang đọc file... (có thể mất 1-3 phút)</>
                      ) : (
                        <><Eye size={18} /> Quét file bằng AI Vision</>
                      )}
                    </button>
                  </>
                )}

                {/* Results */}
                {importResult && (
                  <div className="space-y-4">
                    {/* Summary bar */}
                    <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-2xl">
                      <Check size={20} className="text-green-600 shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold text-green-800 text-sm">{importResult.message}</p>
                        <p className="text-xs text-green-600 mt-0.5">
                          {importResult.totalImages > 0 && `${importResult.totalImages} hình ảnh đã lưu vào server • `}
                          Đã chọn {checkedQuestions.size}/{importResult.totalQuestions} câu để lưu
                        </p>
                      </div>
                      <button
                        onClick={() => setImportResult(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >Quét lại</button>
                    </div>

                    {/* Select all toggle */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-600">
                        <input
                          type="checkbox"
                          checked={checkedQuestions.size === importResult.questions.length}
                          onChange={() => {
                            if (checkedQuestions.size === importResult.questions.length) {
                              setCheckedQuestions(new Set());
                            } else {
                              setCheckedQuestions(new Set(importResult.questions.map((_, i) => i)));
                            }
                          }}
                          className="w-4 h-4 text-violet-600 rounded"
                        />
                        Chọn tất cả
                      </label>
                    </div>

                    {/* Question cards */}
                    <div className="space-y-3">
                      {importResult.questions.map((q, idx) => (
                        <div key={idx}
                          className={`border rounded-2xl overflow-hidden transition-all ${checkedQuestions.has(idx) ? 'border-violet-300 bg-violet-50/30' : 'border-gray-200 bg-white'}`}
                        >
                          <div className="flex items-start gap-3 p-4">
                            <input
                              type="checkbox"
                              checked={checkedQuestions.has(idx)}
                              onChange={() => toggleCheck(idx)}
                              className="mt-1 w-4 h-4 text-violet-600 rounded shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-gray-400">Câu {idx + 1}</span>
                                {q.imageUrl && (
                                  <span className="px-2 py-0.5 bg-violet-100 text-violet-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                                    <Image size={10} /> Có ảnh
                                  </span>
                                )}
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                  Đáp án: {q.answer}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-gray-800 leading-relaxed">{q.text}</p>
                            </div>
                            <button
                              onClick={() => toggleExpand(idx)}
                              className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
                            >
                              {expandedQuestions.has(idx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>

                          {/* Expanded: ảnh + đáp án */}
                          {expandedQuestions.has(idx) && (
                            <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
                              {/* Ảnh đính kèm */}
                              {q.imageUrl && (
                                <div className="mt-3">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Image size={10} /> Hình ảnh đính kèm câu hỏi
                                  </p>
                                  <img
                                    src={getImageUrl(q.imageUrl)!}
                                    alt="Ảnh câu hỏi"
                                    className="max-h-64 rounded-xl border border-violet-200 object-contain bg-gray-50"
                                    onError={e => {
                                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                                        '<p class="text-xs text-red-400">Không tải được ảnh</p>';
                                    }}
                                  />
                                </div>
                              )}
                              {/* Danh sách đáp án */}
                              <div className="grid grid-cols-1 gap-1.5">
                                {(q.options ?? []).map((opt, oi) => (
                                  <div key={oi}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${String.fromCharCode(65 + oi) === q.answer ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-50 text-gray-600'}`}>
                                    <span className="font-bold w-5 shrink-0">{String.fromCharCode(65 + oi)}.</span>
                                    {opt}
                                    {String.fromCharCode(65 + oi) === q.answer && <Check size={14} className="ml-auto shrink-0 text-green-600" />}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {importResult && (
                <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3 bg-gray-50/50">
                  <button onClick={() => setShowImportModal(false)}
                    className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all text-sm">
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveImport}
                    disabled={savingImport || checkedQuestions.size === 0}
                    className="flex-[2] bg-violet-600 text-white py-3 rounded-xl font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/10 text-sm"
                  >
                    {savingImport
                      ? <><Loader2 size={16} className="animate-spin" /> Đang lưu...</>
                      : <><Check size={16} /> Lưu {checkedQuestions.size} câu hỏi vào ngân hàng</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminQuestions;
