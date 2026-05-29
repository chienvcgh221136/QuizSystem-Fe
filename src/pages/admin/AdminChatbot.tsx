import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { chatbotApi, examsApi } from '../../api/services';
import { Send, Bot, User, Pencil, Upload, Settings, Search, Bell, User as UserIcon, History as HistoryIcon, Paperclip, X, FileText } from 'lucide-react';
import { stripCreatedByAI } from '../../utils/strings';
import { getImageUrl } from '../../utils/imageUrl';
import './AdminChatbot.css';

interface QuestionDraft {
  id: number;
  text: string;
  type: string;
  options?: string[];
  answer?: string;
}

interface DraftExam {
  examId: number;
  title: string;
  description?: string;
  category?: string;
  level?: string;
  status?: string;
  timeLimit?: number;
  totalScore?: number;
  questions?: QuestionDraft[];
  progress: number;
  createdByAI?: boolean;
}

interface Msg {
  role: 'user' | 'ai';
  text: string;
  hasDraft?: boolean;
  attachedFileName?: string;  // file attachment shown as card in bubble
}

interface ChatbotResponseDraft {
  intent?: string;
  hasDraft?: boolean;
  message?: string;
  response?: string;
  warning?: string | null;
  questionCountRequested?: number;
  questionCountActual?: number;
  questionCountAdjusted?: boolean;
  examId?: number;
  title?: string;
  category?: string;
  level?: string;
  timeLimit?: number;
  totalScore?: number;
  questions?: QuestionDraft[];
}

interface AttachedFile {
  name: string;
  content: string;
  charCount: number;
  imageUrls?: string[];  // Ảnh upload lên Cloudinary
}

const repairTruncatedJson = (json: string) => {
  const trimmed = json.trim();
  if (!trimmed) return '{}';

  const stack: string[] = [];
  let inQuote = false;
  let escaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === '\\') {
      escaped = true;
      continue;
    }
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote) {
      if (c === '{' || c === '[') {
        stack.push(c);
      } else if (c === '}' || c === ']') {
        if (stack.length > 0) {
          const expected = c === '}' ? '{' : '[';
          if (stack[stack.length - 1] === expected) {
            stack.pop();
          }
        }
      }
    }
  }

  let repaired = trimmed;
  if (inQuote) {
    repaired += '"';
  }

  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']';
  }

  return repaired;
};

const extractJsonCandidate = (rawText: string) => {
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return cleaned.substring(start, end + 1);
};

const tryParseChatbotJson = (rawText: string) => {
  const candidate = extractJsonCandidate(rawText);
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(repairTruncatedJson(candidate));
    } catch {
      return null;
    }
  }
};

const buildFriendlyDraftMessage = (parsed: any) => {
  const title = typeof parsed?.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'đề thi mới';
  const category = typeof parsed?.category === 'string' && parsed.category.trim() ? parsed.category.trim() : '';
  const count = typeof parsed?.questionCountActual === 'number'
    ? parsed.questionCountActual
    : Array.isArray(parsed?.questions)
      ? parsed.questions.length
      : undefined;

  if (count && category) {
    return `Tôi đã tạo xong ${count} câu cho đề "${title}" (${category}). Bạn có thể xem bản thảo ở khung bên phải.`;
  }

  if (count) {
    return `Tôi đã tạo xong ${count} câu cho đề "${title}". Bạn có thể xem bản thảo ở khung bên phải.`;
  }

  if (category) {
    return `Tôi đã tạo xong đề "${title}" (${category}). Bạn có thể xem bản thảo ở khung bên phải.`;
  }

  return `Tôi đã tạo xong đề "${title}". Bạn có thể xem bản thảo ở khung bên phải.`;
};

const normalizeAssistantText = (text: unknown) => {
  if (typeof text !== 'string') return 'Tôi đã nhận được yêu cầu của bạn.';

  const trimmed = text.trim();
  if (!trimmed) return 'Tôi đã nhận được yêu cầu của bạn.';

  const parsed = tryParseChatbotJson(trimmed);
  if (parsed) {
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }

    if (typeof parsed.response === 'string' && parsed.response.trim()) {
      return parsed.response.trim();
    }

    if (parsed.intent === 'create_exam' || Array.isArray(parsed.questions)) {
      return buildFriendlyDraftMessage(parsed);
    }

    return 'Tôi đã nhận được yêu cầu của bạn.';
  }

  const messageMatch = trimmed.match(/"message"\s*:\s*"([\s\S]*?)"\s*$/);
  if (messageMatch?.[1]) {
    return messageMatch[1].replace(/\\"/g, '"');
  }

  if (trimmed.startsWith('{') && (trimmed.includes('"intent"') || trimmed.includes('"questions"'))) {
    const titleMatch = trimmed.match(/"title"\s*:\s*"([^"]+)"/);
    const categoryMatch = trimmed.match(/"category"\s*:\s*"([^"]+)"/);
    const countMatch = trimmed.match(/"questionCountActual"\s*:\s*(\d+)/) || trimmed.match(/"questions"\s*:\s*\[(.*?)\]/s);
    const preview = {
      title: titleMatch?.[1],
      category: categoryMatch?.[1],
      questionCountActual: countMatch?.[1] ? Number(countMatch[1]) : undefined,
    };

    return buildFriendlyDraftMessage(preview);
  }

  return trimmed.replace(/^"|"$/g, '');
};

const isDraftQuestionList = (value: unknown): value is QuestionDraft[] => Array.isArray(value) && value.length > 0;

const buildDraftFromResponse = (data: any) => {
  const responseLike: ChatbotResponseDraft = data ?? {};
  const parsedMessage = typeof responseLike.message === 'string' ? tryParseChatbotJson(responseLike.message) : null;
  const parsedResponse = typeof responseLike.response === 'string' ? tryParseChatbotJson(responseLike.response) : null;
  const parsed = parsedMessage || parsedResponse || responseLike;
  const questions = isDraftQuestionList(parsed.questions) ? parsed.questions : isDraftQuestionList(responseLike.questions) ? responseLike.questions : undefined;
  const hasDraft = Boolean(responseLike.hasDraft || parsed.intent === 'create_exam' || questions);

  return {
    hasDraft,
    title: parsed.title || responseLike.title,
    category: parsed.category || responseLike.category,
    level: parsed.level || responseLike.level,
    timeLimit: parsed.timeLimit || responseLike.timeLimit,
    totalScore: parsed.totalScore || responseLike.totalScore,
    examId: parsed.examId || responseLike.examId,
    warning: parsed.warning || responseLike.warning || null,
    questionCountRequested: parsed.questionCountRequested || responseLike.questionCountRequested,
    questionCountActual: parsed.questionCountActual || responseLike.questionCountActual,
    questionCountAdjusted: Boolean(parsed.questionCountAdjusted || responseLike.questionCountAdjusted),
    questions
  };
};

const mergeQuestionLists = (current: QuestionDraft[], newQs: QuestionDraft[]) => {
  return [...current, ...newQs];
};

const AdminChatbot: React.FC = () => {
 // Khôi phục tin nhắn từ sessionStorage (nếu có)
  const [messages, setMessages] = useState<Msg[]>(() => {
    const saved = sessionStorage.getItem('quiz_chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [{ role: 'ai', text: "Xin chào! Tôi đã sẵn sàng hỗ trợ bạn soạn thảo đề thi. Hôm nay chúng ta sẽ xây dựng bộ đề thuộc chủ đề nào?" }];
  });

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track whether the current draftExam has been persisted to DB (has a real DB examId)
  // We use a separate ref so we can distinguish fake random IDs from real DB IDs
  const [dbExamId, setDbExamId] = useState<number | null>(null);

  // Khôi phục bản thảo đề thi từ sessionStorage (nếu có)
  const [draftExam, setDraftExam] = useState<DraftExam | null>(() => {
    const saved = sessionStorage.getItem('quiz_draft_exam');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return null;
  });
  const [publishing, setPublishing] = useState(false);
  const [highlightDraft, setHighlightDraft] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLDivElement>(null);
// Tự động lưu lịch sử chat mỗi khi có tin nhắn mới
  useEffect(() => {
    sessionStorage.setItem('quiz_chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Tự động lưu đề thi nháp mỗi khi AI cập nhật
  useEffect(() => {
    if (draftExam) {
      sessionStorage.setItem('quiz_draft_exam', JSON.stringify(draftExam));
    } else {
      sessionStorage.removeItem('quiz_draft_exam');
    }
  }, [draftExam]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      showToast(`Chỉ chấp nhận tệp định dạng .pdf hoặc .docx. Tệp "${file.name}" không được hỗ trợ.`, 'error');
      return;
    }
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await chatbotApi.uploadFile(fd);
      const imgs: string[] = res.data.imageUrls ?? [];
      setAttachedFile({ name: res.data.fileName, content: res.data.text, charCount: res.data.charCount, imageUrls: imgs });
      const imgMsg = imgs.length > 0 ? ` + ${imgs.length} hình ảnh` : '';
      showToast(`Đã đính kèm tài liệu "${res.data.fileName}" (${Math.round(res.data.charCount / 1000)}K ký tự${imgMsg}).`, 'success');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể đọc tệp. Vui lòng thử lại.';
      showToast(errorMsg, 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    const lowerUserMsg = userMsg.toLowerCase();
    const isAddQuestionsRequest = lowerUserMsg.includes('thêm câu hỏi') || lowerUserMsg.includes('bổ sung') || lowerUserMsg.includes('tạo thêm');
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, attachedFileName: attachedFile?.name }]);
    setSending(true);

    try {
      const res = await chatbotApi.chat(userMsg, attachedFile?.content, attachedFile?.name, attachedFile?.imageUrls);
      // Clear attached file after sending
      setAttachedFile(null);
      const data = res.data;
      
      const draftData = buildDraftFromResponse(data);
      const aiText = normalizeAssistantText(data.message ?? data.response ?? data);

      setMessages(prev => [...prev, { role: 'ai', text: aiText, hasDraft: draftData.hasDraft }]);

      if (draftData.warning) {
        setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${draftData.warning}` }]);
      }

      if (draftData.hasDraft && draftData.questions) {
        const currentQuestions = Array.isArray(draftExam?.questions) ? draftExam.questions : [];
        const totalQuestions = isAddQuestionsRequest && currentQuestions.length > 0
          ? mergeQuestionLists(currentQuestions, draftData.questions)
          : draftData.questions;
        const isModification = isAddQuestionsRequest || lowerUserMsg.includes('sửa') || lowerUserMsg.includes('thay đổi') || lowerUserMsg.includes('đổi');
        
        // Nếu đây là yêu cầu tạo đề mới hoàn toàn (không phải sửa/thêm câu hỏi),
        // reset dbExamId để khi lưu sẽ tạo thành 1 record mới trong DB.
        if (!isModification) {
          setDbExamId(null);
        }

        let p = 0;
        setDraftExam({
          examId: draftData.examId || Math.floor(Math.random() * 9000) + 1000,
          title: draftData.title || 'Đề thi mới tạo bởi AI',
          category: draftData.category || 'Chung',
          level: draftData.level || 'Trung cấp',
          status: 'Nháp',
          timeLimit: draftData.timeLimit || 30,
          totalScore: draftData.totalScore || 10,
          progress: 0,
          questions: []
        });

        const interval = setInterval(() => {
          p += 10;
          setDraftExam(prev => {
            if (!prev) return null;
            const showCount = Math.floor((p / 100) * totalQuestions.length);
            return {
              ...prev,
              progress: p,
              questions: totalQuestions.slice(0, showCount)
            };
          });
          if (p >= 100) {
            clearInterval(interval);
            setHighlightDraft(true);
            setTimeout(() => setHighlightDraft(false), 2000);
          }
        }, 100);
      }
    } catch (err) {
      console.error(err);
      showToast('Đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại bằng tiếng Việt hoặc rút gọn yêu cầu.', 'error');
    } finally {
      setSending(false);
    }
  };


  const handleViewDraft = () => {
    draftRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHighlightDraft(true);
    setTimeout(() => setHighlightDraft(false), 2000);
  };

  const handleEdit = () => {
    window.location.href = `/admin/exams`;
  };

  const handleSaveDraft = async () => {
    if (!draftExam) return;
    if (draftExam.status === 'Draft' || draftExam.status === 'Published') {
      showToast('Đề thi này đã được lưu trước đó.', 'info');
      return;
    }
    setPublishing(true);
    try {
      if (dbExamId) {
        // Đã lưu nháp DB trước rồi -> chỉ cập nhật metadata
        await examsApi.update(dbExamId, {
          examId: dbExamId,
          title: draftExam.title,
          category: draftExam.category,
          level: draftExam.level || 'Trung cấp',
          timeLimit: draftExam.timeLimit,
          totalScore: draftExam.totalScore,
          status: 'Draft',
        });
        showToast(`Đề thi nháp "${stripCreatedByAI(draftExam.title)}" đã được cập nhật.`, 'success');
      } else {
        // Lần đầu lưu nháp -> tạo mới trong DB
        const payload = {
          title: draftExam.title,
          category: draftExam.category,
          createdByAI: draftExam.createdByAI || false,
          level: draftExam.level || 'Trung cấp',
          timeLimit: draftExam.timeLimit,
          totalScore: draftExam.totalScore,
          status: 'Draft',
          questions: draftExam.questions?.map(q => ({
            text: q.text,
            type: q.type,
            options: q.options,
            answer: q.answer,
            imageUrl: (q as any).imageUrl ?? null
          }))
        };
        const res = await examsApi.createFull(payload);
        const newDbId = res.data.examId;
        setDbExamId(newDbId);
        setDraftExam(prev => prev ? { ...prev, examId: newDbId, status: 'Draft' } : null);
        showToast(`Đề thi nháp "${stripCreatedByAI(draftExam.title)}" đã được lưu (Mã: #${newDbId}).`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Lưu nháp thất bại. Vui lòng kiểm tra kết nối.', 'error');
    } finally { setPublishing(false); }
  };

  const handlePublish = async () => {
    if (!draftExam) return;
    if (draftExam.status === 'Published') {
      showToast('Đề thi này đã được xuất bản trước đó.', 'info');
      return;
    }
    setPublishing(true);
    try {
      if (dbExamId) {
        // Đã có trong DB (nháp) -> chỉ cần update status thành Published
        await examsApi.update(dbExamId, {
          examId: dbExamId,
          title: draftExam.title,
          description: draftExam.description,
          category: draftExam.category,
          level: draftExam.level || 'Trung cấp',
          timeLimit: draftExam.timeLimit,
          totalScore: draftExam.totalScore,
          status: 'Published',
        });
        setDraftExam(prev => prev ? { ...prev, status: 'Published' } : null);
        showToast(`Thành công! Đề thi "${stripCreatedByAI(draftExam.title)}" đã được xuất bản công khai (Mã: #${dbExamId}).`, 'success');
      } else {
        // Chưa có trong DB -> tạo mới thẳng với status Published
        const payload = {
          title: draftExam.title,
          description: draftExam.description,
          createdByAI: draftExam.createdByAI || false,
          category: draftExam.category,
          level: draftExam.level || 'Trung cấp',
          timeLimit: draftExam.timeLimit,
          totalScore: draftExam.totalScore,
          status: 'Published',
          questions: draftExam.questions?.map(q => ({
            text: q.text,
            type: q.type,
            options: q.options,
            answer: q.answer,
            imageUrl: (q as any).imageUrl ?? null
          }))
        };
        const res = await examsApi.createFull(payload);
        const newDbId = res.data.examId;
        setDbExamId(newDbId);
        setDraftExam(prev => prev ? { ...prev, examId: newDbId, status: 'Published' } : null);
        showToast(`Thành công! Đề thi "${stripCreatedByAI(draftExam.title)}" đã được xuất bản công khai (Mã: #${newDbId}).`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Xuất bản thất bại. Vui lòng thử lại.', 'error');
    }
    finally { setPublishing(false); }
  };

  return (
    <AdminLayout>
      {/* Custom Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">QuizAI Pro</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm tài nguyên..."
              className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-xs focus:ring-2 focus:ring-[#1a7a4a]/20 outline-none w-64"
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-[#1a7a4a] transition-colors"><Bell size={20} /></button>
          <div className="w-8 h-8 rounded-full bg-[#1a7a4a]/10 flex items-center justify-center text-[#1a7a4a]"><UserIcon size={18} /></div>
        </div>
      </div>

      <div className="chatbot-container">
        {/* Main Chat Section */}
        <div
          className="chat-section relative"
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
          onDrop={async (e) => {
            e.preventDefault(); e.stopPropagation(); setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) await handleFileUpload(file);
          }}
        >
          {/* Drag-and-drop overlay */}
          {isDragging && (
            <div className="drop-overlay">
              <div className="drop-overlay-inner">
                <div className="drop-icon-ring">
                  <Paperclip size={32} />
                </div>
                <p className="drop-title">Thả tệp vào đây</p>
                <p className="drop-subtitle">Hỗ trợ tệp định dạng <strong>.PDF</strong> và <strong>.DOCX</strong></p>
              </div>
            </div>
          )}
          <div className="chatbot-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-[#1a7a4a] flex items-center justify-center">
                <Bot size={24} />
              </div>
              <div>
                <h2>Trợ lý AI</h2>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đang hoạt động</span>
                </div>
              </div>
            </div>

          </div>

          {toast && (
            <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-[13px] font-medium flex items-center gap-2 max-w-[85%] text-center transition-all duration-300 ${
              toast.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
              toast.type === 'success' ? 'bg-green-50 text-[#1a7a4a] border-green-100' : 
              'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              {toast.message}
            </div>
          )}

          <div className="messages-container">
            {messages.map((msg, i) => (
              <div key={i} className={`message-wrapper ${msg.role}`}>
                <div className={`avatar-chat ${msg.role}`}>
                  {msg.role === 'ai' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="bubble flex flex-col gap-2">
                    {msg.attachedFileName && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-black/10 rounded-lg border border-black/5 w-fit">
                        <FileText size={16} className="opacity-80" />
                        <span className="text-xs font-semibold opacity-90">{msg.attachedFileName}</span>
                      </div>
                    )}
                    {msg.text && <div>{msg.text}</div>}
                  </div>
                  {msg.hasDraft && (
                    <button
                      onClick={handleViewDraft}
                      className="flex items-center gap-2 self-start px-3 py-1.5 bg-[#1a7a4a]/10 text-[#1a7a4a] text-[10px] font-bold rounded-lg hover:bg-[#1a7a4a] hover:text-white transition-all border border-[#1a7a4a]/20"
                    >
                      <HistoryIcon size={12} /> Xem đề thi nháp
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="message-wrapper ai">
                <div className="avatar-chat ai"><Bot size={18} /></div>
                <div className="bubble">
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="input-area-custom">
            {/* File attachment chip */}
          {attachedFile && (
              <>
                <div className="attached-file-chip">
                  <FileText size={12} />
                  <span className="attached-file-name">{attachedFile.name}</span>
                  <span className="attached-file-meta">
                    ({Math.round(attachedFile.charCount / 1000)}K ký tự
                    {attachedFile.imageUrls && attachedFile.imageUrls.length > 0 && ` · ${attachedFile.imageUrls.length} ảnh`})
                  </span>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="attached-file-remove"
                    title="Gỡ tệp đính kèm"
                  >
                    <X size={10} />
                  </button>
                </div>

                {/* Hiển thị thumbnail ảnh đã đọc từ file */}
                {attachedFile.imageUrls && attachedFile.imageUrls.length > 0 && (
                  <div className="flex gap-2 px-1 pb-1 flex-wrap">
                    {attachedFile.imageUrls.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          alt={`Ảnh ${i + 1}`}
                          className="h-16 w-20 object-cover rounded-lg border border-violet-200 bg-gray-50 cursor-zoom-in"
                          onClick={() => window.open(url, '_blank')}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity py-0.5">
                          Ảnh {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Simple hint row */}
                <div className="file-guide-banner">
                  <div className="file-guide-icon">💡</div>
                  <div className="file-guide-content">
                    <p className="file-guide-title">File chưa có đáp án / level? Ghi thêm vào ô bên dưới rồi gửi.</p>
                    <p className="file-guide-desc">
                      Ví dụ: <code>Đáp án: 1-A, 2-C, 3-B, 4-D. Level: Trung cấp. Hãy tạo đề từ file này.</code>
                    </p>
                  </div>
                </div>
              </>
            )}


            <div className="input-wrapper-chat">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              <button
                className={`upload-button-chat ${uploadingFile ? 'uploading' : ''} ${attachedFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || sending}
                title={attachedFile ? `Đang đính kèm: ${attachedFile.name}` : 'Tải lên tài liệu PDF/Word'}
              >
                {uploadingFile ? (
                  <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#1a7a4a] rounded-full animate-spin" />
                ) : (
                  <Paperclip size={16} />
                )}
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={attachedFile
                  ? `Ghi thêm đáp án, level, hoặc yêu cầu... (Shift+Enter xuống dòng)`
                  : 'Gửi tin nhắn cho trợ lý AI... (Shift+Enter xuống dòng)'}
                rows={Math.min(5, Math.max(1, input.split('\n').length))}
                className="chat-textarea"
              />
              <button
                className="send-button-chat"
                onClick={handleSend}
                disabled={sending || !input.trim()}
              >
                <Send size={18} />
              </button>
            </div>
            <div className="text-center mt-3">
              <span className="text-[10px] text-gray-400 font-medium italic">AI có thể nhầm lẫn. Hãy kiểm tra lại thông tin quan trọng.&nbsp;&nbsp;|&nbsp;&nbsp;<strong>Shift+Enter</strong> để xuống dòng.</span>
            </div>
          </div>
        </div>

        {/* Draft Section */}
        <div className={`draft-section ${highlightDraft ? 'highlight-ring' : ''}`}>
          <div ref={draftRef} />
          <div className="draft-header-custom flex items-center justify-between">
            <div>
              <h3>Bản thảo đề thi</h3>
              {draftExam && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{draftExam.title}</p>}
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-xl border border-gray-100 shadow-sm transition-all">
              <Settings size={16} />
            </button>
          </div>

          <div className="draft-scroll-area">
            {!draftExam ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-200 mb-4 border border-dashed border-gray-200">
                  <Bot size={40} />
                </div>
                <p className="text-sm text-gray-400 font-medium">Yêu cầu AI tạo đề thi.<br />Bản thảo sẽ xuất hiện tại đây.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {["Tạo đề ASP.NET CORE", "Tạo đề C#", "Tạo đề SQL"].map(hint => (
                    <button
                      key={hint}
                      onClick={() => setInput(hint)}
                      className="px-3 py-1.5 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-lg hover:bg-[#1a7a4a] hover:text-white transition-all"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {draftExam && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                    Bản thảo đã sẵn sàng. Nếu số câu bị AI lệch hoặc hệ thống đã tự thêm câu, bạn sẽ thấy thông báo trong khung hội thoại.
                  </div>
                )}
                {draftExam && draftExam.questions && draftExam.questions.length > 0 && (
                  <div className="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                    Đề hiện có {draftExam.questions.length} câu trong bản nháp.
                  </div>
                )}
                <div className={`draft-card ${highlightDraft ? 'active' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-[#1a7a4a] bg-green-50 px-2 py-0.5 rounded">NHÁP</span>
                      {draftExam.level && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${draftExam.level === 'Sơ cấp' ? 'text-blue-600 bg-blue-50 border border-blue-100' :
                            draftExam.level === 'Cao cấp' ? 'text-amber-600 bg-amber-50 border border-amber-100' :
                              'text-[#1a7a4a] bg-green-50 border border-green-100'
                          }`}>
                          {draftExam.level}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">#{draftExam.examId}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-4">{draftExam.title}</h4>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase">
                      <span>Đang tạo câu hỏi...</span>
                      <span>{draftExam.progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${draftExam.progress}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Xem trước câu hỏi</div>

                {draftExam.questions?.map((q, idx) => (
                  <div key={idx} className="draft-card">
                    <div className="flex items-center justify-between mb-3">
                      <span className="question-tag">Câu hỏi {idx + 1}</span>
                      <span className="text-[10px] font-bold text-gray-400">{q.type}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 leading-relaxed mb-3">{q.text}</p>

                    {/* Hiển thị ảnh đính kèm câu hỏi (nếu có) */}
                    {(q as any).imageUrl && (
                      <div className="mb-3">
                        <img
                          src={getImageUrl((q as any).imageUrl)!}
                          alt={`Ảnh câu hỏi ${idx + 1}`}
                          className="w-full max-h-56 object-contain rounded-xl border border-violet-100 bg-gray-50"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}

                    {q.options && (
                      <div className="space-y-2">
                        {q.options.filter(o => o).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-black text-gray-400">
                              {String.fromCharCode(65 + oIdx)}
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.answer && (
                      <div className="mt-3 p-3 bg-green-50/50 rounded-xl border border-green-100 border-dashed">
                        <span className="text-[10px] font-black text-[#1a7a4a] block mb-1">ĐÁP ÁN:</span>
                        <span className="text-xs text-[#1a7a4a] font-bold">
                          {(() => {
                            const ans = (q.answer || '').toString().trim();
                            if (ans.length === 1 && q.options && q.options.length > 0) {
                              const idx = ans.toUpperCase().charCodeAt(0) - 65;
                              if (idx >= 0 && idx < q.options.length) {
                                return `${ans.toUpperCase()}: ${q.options[idx]}`;
                              }
                            }
                            return ans;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}


                {draftExam.progress < 100 && (
                  <div className="flex items-center justify-center py-4 gap-2 text-gray-400">
                    <div className="w-3 h-3 border-2 border-gray-200 border-t-[#1a7a4a] rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">AI đang làm việc...</span>
                  </div>
                )}

              <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleEdit}
                    disabled={draftExam.progress < 100}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Pencil size={14} /> Chỉnh sửa
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={publishing || draftExam.progress < 100}
                    className="flex-1 py-2.5 bg-white text-[#1a7a4a] border border-[#1a7a4a]/20 text-xs font-bold rounded-xl hover:bg-green-50 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {publishing ? 'Đang lưu...' : dbExamId ? 'Cập nhật nháp' : 'Lưu nháp'}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing || draftExam.progress < 100}
                    className="flex-[1.5] py-2.5 bg-[#1a7a4a] text-white text-xs font-bold rounded-xl hover:bg-[#15633c] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Upload size={14} /> {publishing ? 'Đang xử lý...' : dbExamId ? 'Xuất bản' : 'Xuất bản ngay'}
                  </button>
                </div>
              </div>
            )
            }</div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminChatbot;
