import React, { useState, useRef, useEffect } from 'react';
import { chatbotApi } from '../../api/services';
import { Send, Bot, User as UserIcon, X } from 'lucide-react';

const UserChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>(() => {
    const saved = sessionStorage.getItem('user_chat_messages');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed; 
      } catch (e) {}
    }
    return [{ role: 'ai', text: "Xin chào! Mình là Gia sư AI. Bạn cần hỗ trợ gì nào?" }];
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem('user_chat_messages', JSON.stringify(messages));
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setSending(true);

    try {
      const res = await chatbotApi.tutor(userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: res.data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Xin lỗi, kết nối mạng đang gián đoạn. Vui lòng thử lại.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* 1. NÚT AI */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#1a7a4a] text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-900/30 hover:bg-[#146039] hover:-translate-y-1 transition-all z-50 group"
        >
          <Bot size={26} />
          <span className="absolute right-full mr-4 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Hỏi Gia sư AI
          </span>
        </button>
      )}

      {/* 2. KHUNG CHAT */}
      {isOpen && (
        <div className="fixed bottom-8 right-8 w-[40vw] h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          
          {/* Header */}
          <div className="px-4 py-3 bg-[#1a7a4a] flex items-center justify-between text-white shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Gia sư AI</h3>
                <div className="flex items-center gap-1 text-[10px] text-green-100 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Đang hoạt động
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-[#1a7a4a] text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {msg.role === 'ai' ? <Bot size={14} /> : <UserIcon size={14} />}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#1a7a4a] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-[#1a7a4a] text-white flex items-center justify-center flex-shrink-0"><Bot size={14} /></div>
                <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-full border border-gray-200 focus-within:border-[#1a7a4a] transition-colors">
              <input
                className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none"
                placeholder="Hỏi bài AI..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-8 h-8 rounded-full bg-[#1a7a4a] text-white flex items-center justify-center hover:bg-[#15633c] disabled:opacity-50 transition-colors"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};

export default UserChatbot;