import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { chatbotApi, examsApi } from '../../api/services';
import { Send, Bot, User, Pencil, Upload, Settings, Search, Bell, User as UserIcon, History as HistoryIcon } from 'lucide-react';
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
  category?: string;
  level?: string;
  status?: string;
  timeLimit?: number;
  totalScore?: number;
  questions?: QuestionDraft[];
  progress: number;
}

interface Msg {
  role: 'user' | 'ai';
  text: string;
  hasDraft?: boolean;
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

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setSending(true);

    try {
      const res = await chatbotApi.chat(userMsg);
      const data = res.data;
      
      const draftData = buildDraftFromResponse(data);
      const aiText = normalizeAssistantText(data.message ?? data.response ?? data);

      setMessages(prev => [...prev, { role: 'ai', text: aiText, hasDraft: draftData.hasDraft }]);

      if (draftData.warning) {
        setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${draftData.warning}` }]);
      }

      if (draftData.hasDraft && draftData.questions) {
        let p = 0;
        const totalQuestions = draftData.questions;
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
      setMessages(prev => [...prev, { role: 'ai', text: 'Đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại bằng tiếng Việt hoặc rút gọn yêu cầu.' }]);
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
    setPublishing(true);
    try {
      const payload = {
        title: draftExam.title,
        category: draftExam.category,
        level: draftExam.level || 'Trung cấp',
        timeLimit: draftExam.timeLimit,
        totalScore: draftExam.totalScore,
        status: 'Draft',
        questions: draftExam.questions?.map(q => ({
          text: q.text,
          type: q.type,
          options: q.options,
          answer: q.answer
        }))
      };
      const res = await examsApi.createFull(payload);
      setDraftExam(prev => prev ? { ...prev, examId: res.data.examId, status: 'Draft' } : null);
      setMessages(prev => [...prev, { role: 'ai', text: `💾 Đề thi nháp "${draftExam.title}" đã được lưu vào cơ sở dữ liệu.` }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', text: '❌ Lưu nháp thất bại. Vui lòng kiểm tra kết nối.' }]);
    }
    finally { setPublishing(false); }
  };

  const handlePublish = async () => {
    if (!draftExam) return;
    setPublishing(true);
    try {
      const payload = {
        title: draftExam.title,
        category: draftExam.category,
        level: draftExam.level || 'Trung cấp',
        timeLimit: draftExam.timeLimit,
        totalScore: draftExam.totalScore,
        status: 'Published',
        questions: draftExam.questions?.map(q => ({
          text: q.text,
          type: q.type,
          options: q.options,
          answer: q.answer
        }))
      };
      const res = await examsApi.createFull(payload);
      setDraftExam(prev => prev ? { ...prev, examId: res.data.examId, status: 'Published' } : null);
      setMessages(prev => [...prev, { role: 'ai', text: `🚀 Thành công! Đề thi "${draftExam.title}" đã được xuất bản công khai.` }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', text: '❌ Xuất bản thất bại. Vui lòng thử lại.' }]);
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
        <div className="chat-section">
          <div className="chat-header-custom">
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

          <div className="messages-container">
            {messages.map((msg, i) => (
              <div key={i} className={`message-wrapper ${msg.role}`}>
                <div className={`avatar-chat ${msg.role}`}>
                  {msg.role === 'ai' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="bubble">
                    {msg.text}
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
            <div className="input-wrapper-chat">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Gửi tin nhắn cho trợ lý AI..."
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
              <span className="text-[10px] text-gray-400 font-medium italic">AI có thể nhầm lẫn. Hãy kiểm tra lại thông tin quan trọng.</span>
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
                    <p className="text-sm font-bold text-gray-800 leading-relaxed mb-4">{q.text}</p>

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
                        <span className="text-xs text-[#1a7a4a] font-bold">{q.answer}</span>
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
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Pencil size={14} /> Chỉnh sửa
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={publishing || draftExam.progress < 100}
                    className="flex-1 py-2.5 bg-white text-[#1a7a4a] border border-[#1a7a4a]/20 text-xs font-bold rounded-xl hover:bg-green-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {publishing ? 'Đang lưu...' : 'Lưu nháp'}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing || draftExam.progress < 100}
                    className="flex-[1.5] py-2.5 bg-[#1a7a4a] text-white text-xs font-bold rounded-xl hover:bg-[#15633c] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 disabled:opacity-50"
                  >
                    <Upload size={14} /> {publishing ? 'Đang đăng...' : 'Xuất bản ngay'}
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
