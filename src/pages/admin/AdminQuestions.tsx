import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { questionsApi } from '../../api/services';
import { PlusCircle, Search, Edit2, Trash2, Filter, Database, X, Check } from 'lucide-react';

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
}

const AdminQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [form, setForm] = useState({ content: '', category: '', level: 'Sơ cấp', options: ['', '', '', ''], correctOption: 0, explanation: '' });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');

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
        optionA: options[0],
        optionB: options[1],
        optionC: options[2],
        optionD: options[3],
        isActive: true,
        scorePerQuestion: 1.0,
        correctOption: String.fromCharCode(65 + form.correctOption)
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
      alert(editingQ ? "Cập nhật câu hỏi thành công!" : "Tạo câu hỏi mới thành công!");
    } catch (e) { 
      console.error(e); 
      alert("Có lỗi xảy ra khi lưu câu hỏi.");
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa câu hỏi này khỏi ngân hàng?')) return;
    try {
      await questionsApi.delete(id);
      fetchQuestions();
    } catch (e) { console.error(e); }
  };

  const openEdit = (q: Question) => {
    setEditingQ(q);
    setForm({
      content: q.content,
      category: q.category,
      level: q.level,
      options: [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''],
      correctOption: (q.correctOption?.charCodeAt(0) - 65) || 0,
      explanation: q.explanation || ''
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingQ(null);
    setForm({ content: '', category: categories[0] || '', level: 'Sơ cấp', options: ['', '', '', ''], correctOption: 0, explanation: '' });
    setShowModal(true);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Ngân hàng câu hỏi</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý kho câu hỏi dùng chung cho toàn bộ hệ thống đề thi.</p>
          </div>
          <button 
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#1a7a4a] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#15633c] transition-all shadow-lg shadow-green-900/10 active:scale-95"
          >
            <PlusCircle size={18} />
            Thêm câu hỏi
          </button>
        </div>

        {/* Toolbar & Categories */}
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
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCat === cat 
                    ? 'bg-[#1a7a4a] text-white border-[#1a7a4a] shadow-md shadow-green-900/10' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a7a4a]/30 hover:text-gray-700 shadow-sm'
                }`}
              >
                {cat === 'All' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-2">Độ khó:</span>
            {['All', 'Sơ cấp', 'Trung cấp', 'Cao cấp'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedLevel === lvl 
                    ? 'bg-[#1a7a4a] text-white border-[#1a7a4a] shadow-md shadow-green-900/10' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a7a4a]/30 hover:text-gray-700 shadow-sm'
                }`}
              >
                {lvl === 'All' ? 'Tất cả' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="text-center py-20 text-gray-400">Đang tải dữ liệu...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white border border-dashed border-gray-200 rounded-2xl">
              Không tìm thấy câu hỏi nào.
            </div>
          ) : filtered.map(q => (
            <div key={q.questionId} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#1a7a4a]/30 transition-all shadow-sm group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">ID: {q.questionId}</span>
                    <span className="px-2.5 py-0.5 bg-green-50 text-[#1a7a4a] text-[10px] font-bold rounded-full uppercase tracking-wider">{q.category}</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">{q.level}</span>
                  </div>
                  <h3 className="text-gray-900 font-bold leading-relaxed">{q.content}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openEdit(q)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(q.questionId)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal (Simplified for now) */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-[#1a7a4a] flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">{editingQ ? 'Sửa câu hỏi' : 'Tạo câu hỏi mới'}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nội dung câu hỏi</label>
                  <textarea 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#1a7a4a]/20 focus:border-[#1a7a4a] outline-none transition-all min-h-[100px]"
                    value={form.content}
                    onChange={e => setForm({...form, content: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Danh mục</label>
                    <select 
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1a7a4a]"
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="New">+ Thêm danh mục mới...</option>
                    </select>
                    {form.category === 'New' && (
                      <input 
                        type="text"
                        placeholder="Nhập tên danh mục mới..."
                        className="w-full mt-2 px-4 py-2 bg-white border border-[#1a7a4a] rounded-xl text-sm outline-none"
                        autoFocus
                        onBlur={e => {
                          if (e.target.value) {
                            setForm({...form, category: e.target.value});
                            if (!categories.includes(e.target.value)) {
                              setCategories([...categories, e.target.value]);
                            }
                          } else {
                            setForm({...form, category: ''});
                          }
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Độ khó</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1a7a4a]"
                      value={form.level}
                      onChange={e => setForm({...form, level: e.target.value})}
                    >
                      <option>Sơ cấp</option>
                      <option>Trung cấp</option>
                      <option>Cao cấp</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Các đáp án (Tích chọn đáp án đúng)</label>
                  {form.options.map((opt, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-2 rounded-2xl border transition-all ${form.correctOption === idx ? 'bg-green-50 border-[#1a7a4a] shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="flex items-center cursor-pointer p-2">
                        <input 
                          type="radio" 
                          name="correctOption"
                          checked={form.correctOption === idx}
                          onChange={() => setForm({...form, correctOption: idx})}
                          className="w-4 h-4 text-[#1a7a4a] focus:ring-[#1a7a4a]"
                        />
                      </label>
                      <span className="text-xs font-bold text-gray-400 w-4">{(String.fromCharCode(65 + idx))}</span>
                      <input 
                        type="text" 
                        required
                        placeholder={`Nhập đáp án ${String.fromCharCode(65 + idx)}...`}
                        className="flex-1 bg-transparent border-none text-sm outline-none placeholder:text-gray-300"
                        value={opt}
                        onChange={e => {
                          const newOpts = [...form.options];
                          newOpts[idx] = e.target.value;
                          setForm({...form, options: newOpts});
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Giải thích đáp án (Tùy chọn)</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#1a7a4a]/20 focus:border-[#1a7a4a] outline-none transition-all min-h-[80px]"
                    placeholder="Giải thích tại sao đáp án này đúng..."
                    value={form.explanation}
                    onChange={e => setForm({...form, explanation: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all">Hủy</button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-2 flex-[2] bg-[#1a7a4a] text-white py-3 rounded-xl font-bold hover:bg-[#15633c] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/10"
                  >
                    {saving ? 'Đang lưu...' : <><Check size={20} /> Lưu câu hỏi</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminQuestions;
