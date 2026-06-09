import React, { useState, useRef, useEffect } from 'react';
import { chatbotApi } from '../../api/services';
import { Send, Bot, User as UserIcon, X, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';


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
// Đưa Markdown thành link và Card kết quả nếu có trong tin nhắn AI
  const renderMessageText = (text: string) => {
    // 1. Tách chuỗi bằng mật mã [CARD_RESULT|id|title|category]
    const cardRegex = /\[CARD_RESULT\|(.*?)\|(.*?)\|(.*?)\]/g;
    const parts = text.split(cardRegex);

    // Nếu không có mật mã card, xử lý link markdown bình thường
    if (parts.length === 1) {
      return renderStandardLinks(text);
    }

    const elements = [];
    for (let i = 0; i < parts.length; i += 4) {
      // In ra phần chữ bình thường (nếu có) trước cái card
      if (parts[i]) elements.push(renderStandardLinks(parts[i]));

      // Vẽ Card nếu có dữ liệu
      if (i + 1 < parts.length) {
        const resultId = parts[i + 1];
        const title = parts[i + 2];
        const category = parts[i + 3];

        elements.push(
          <Link 
            key={`card-${i}`} 
            to={`/user/result/${resultId}`} 
            // 1. Hover card
            className="block my-3 w-full border border-gray-100 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white group cursor-pointer"
          >
            {/* Định dạng card */}
            <div className="w-full h-[100px] relative overflow-hidden">
               
               {/* 2. Hiệu ứng Background khi Hover */}
               <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-[#125533] group-hover:scale-110 transition-transform duration-500 ease-out flex items-center justify-center">
                  <Bot size={56} className="text-white opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
               </div>
               
               {/* 3. Lớp phủ đen & Nút mũi tên trượt từ dưới lên */}
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                  <div className="bg-white text-[#1a7a4a] rounded-full p-2.5 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                     </svg>
                  </div>
               </div>

               {/* Badge thời lượng / Đã hoàn thành */}
               <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded-md font-medium backdrop-blur-sm border border-white/10 z-10">
                 Đã hoàn thành
               </div>
            </div>

            {/* Thông tin bên dưới */}
            <div className="p-3 flex gap-3 relative bg-white z-10">
              {/* Avatar card*/}
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5 text-[#1a7a4a] group-hover:bg-[#1a7a4a] group-hover:text-white transition-colors duration-300">
                 <CheckCircle size={16} />
              </div>

              {/* Chi tiết nội dung */}
              <div className="flex-1">
                 <h4 className="font-bold text-gray-800 text-[13px] line-clamp-2 leading-snug group-hover:text-[#1a7a4a] transition-colors duration-300">
                    {title}
                 </h4>
                 <div className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1.5 font-medium">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Môn: {category}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-[#1a7a4a] flex items-center gap-0.5 group-hover:underline">
                      Xem chi tiết
                    </span>
                 </div>
              </div>
            </div>
          </Link>
        );
      }
    }
    return <div>{elements}</div>;
  };

  // Xử lý Link Markdown 
  const renderStandardLinks = (rawText: string) => {
    const parts = rawText.split(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (parts.length === 1) return <span className="whitespace-pre-wrap">{rawText}</span>;

    const elements = [];
    for (let i = 0; i < parts.length; i += 3) {
      elements.push(<span key={i} className="whitespace-pre-wrap">{parts[i]}</span>);
      if (i + 1 < parts.length) {
        elements.push(
          <Link key={i + 1} to={parts[i + 2]} className="text-[#1a7a4a] underline font-bold hover:text-[#146039]">
            {parts[i + 1]}
          </Link>
        );
      }
    }
    return <>{elements}</>;
  };
  return (
    <>
      {/* 1. NÚT AI */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#1B8F3D] text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-900/30 hover:bg-[#146c2e] hover:-translate-y-1 transition-all z-50 group"
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
          <div className="px-4 py-3 bg-[#1B8F3D] flex items-center justify-between text-white shadow-sm z-10">
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-[#1B8F3D] text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {msg.role === 'ai' ? <Bot size={14} /> : <UserIcon size={14} />}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#1B8F3D] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-[#1B8F3D] text-white flex items-center justify-center flex-shrink-0"><Bot size={14} /></div>
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
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-full border border-gray-200 focus-within:border-[#1B8F3D] transition-colors">
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
                className="w-8 h-8 rounded-full bg-[#1B8F3D] text-white flex items-center justify-center hover:bg-[#15633c] disabled:opacity-50 transition-colors"
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