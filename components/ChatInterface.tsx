
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { ChatSession, ChatMessage, FileMetadata, Role, KnowledgeBase } from '../types';

interface ChatInterfaceProps {
  session: ChatSession;
  knowledgeBases: KnowledgeBase[];
  onSendMessage: (text: string, attachments: FileMetadata[], settings: any) => void;
  onUpdateSettings: (settings: any) => void;
  isTyping: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onPreviewCitation?: (citation: { title: string; uri: string }) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  session, 
  knowledgeBases, 
  onSendMessage, 
  onUpdateSettings, 
  isTyping,
  isSidebarOpen,
  onToggleSidebar,
  onPreviewCitation
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<FileMetadata[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, isTyping]);

  const handleSend = () => {
    if (inputText.trim() || attachments.length > 0) {
      onSendMessage(inputText, attachments, session.settings);
      setInputText('');
      setAttachments([]);
    }
  };

  const toggleSetting = (key: string) => {
    onUpdateSettings({ ...session.settings, [key]: !((session.settings as any)[key]) });
  };

  const currentKB = knowledgeBases.find(kb => kb.id === session.activeKBId);

  return (
    <div className="flex-1 flex flex-col h-full relative bg-white/40 backdrop-blur-sm">
      {/* Friendly Header */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-slate-50 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button 
              onClick={onToggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <i className="fas fa-bars"></i>
            </button>
          )}
          
          <div className="flex flex-col">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              {session.title}
              {currentKB && <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold border border-teal-100">KB: {currentKB.name}</span>}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className={`w-2 h-2 rounded-full ${isTyping ? 'bg-teal-500 animate-pulse' : 'bg-teal-300'}`}></span>
              {isTyping ? 'Lumi is thinking...' : 'Lumi is ready'}
            </div>
          </div>
        </div>

        <select 
          value={session.activeKBId || ''}
          onChange={(e) => onUpdateSettings({ ...session.settings, activeKBId: e.target.value })}
          className="text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:border-teal-400 cursor-pointer focus:ring-0 shadow-sm transition-colors"
        >
          <option value="">✨ General Chat</option>
          {knowledgeBases.map(kb => (
            <option key={kb.id} value={kb.id}>📚 {kb.name}</option>
          ))}
        </select>
      </div>

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto px-4 md:px-24 py-8 space-y-10 custom-scrollbar">
        {session.messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center animate-float pb-20">
            <div className="w-24 h-24 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-teal-100 mb-6">
               <i className="fas fa-hand-sparkles text-white text-4xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3 font-outfit">Hello, I'm Lumi!</h1>
            <p className="text-slate-500 max-w-md text-lg">
              I can help you analyze documents, plan your day, or just chat. How can I assist you?
            </p>
          </div>
        )}
        
        {session.messages.map((msg, idx) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            isLast={idx === session.messages.length - 1} 
            isTyping={isTyping} 
            onPreviewCitation={onPreviewCitation}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Bar */}
      <div className="p-6 max-w-4xl mx-auto w-full relative z-30">
        <div className="bg-white rounded-[2rem] p-3 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-200 transition-all focus-within:shadow-[0_20px_40px_-10px_rgba(13,148,136,0.15)] focus-within:border-teal-300">
          <div className="px-3 pt-1">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask me anything..."
              className="w-full bg-transparent border-none text-slate-700 placeholder-slate-400 focus:ring-0 outline-none min-h-[44px] max-h-32 resize-none text-lg"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            />
          </div>
          
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-1.5">
              <ToolToggle active={session.settings.useReasoning} onClick={() => toggleSetting('useReasoning')} icon="fa-lightbulb" label="Think" />
              <ToolToggle active={session.settings.useWebSearch} onClick={() => toggleSetting('useWebSearch')} icon="fa-globe" label="Web" />
              <ToolToggle active={session.settings.useMaps} onClick={() => toggleSetting('useMaps')} icon="fa-map-marker-alt" label="Maps" />
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => fileInputRef.current?.click()} 
                 className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-teal-600 transition-colors"
               >
                 <i className="fas fa-paperclip"></i>
               </button>
               <button 
                onClick={handleSend}
                disabled={!inputText.trim() && attachments.length === 0}
                className={`h-10 px-6 rounded-full font-bold transition-all flex items-center gap-2 ${
                  (!inputText.trim() && attachments.length === 0) 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-teal-600 text-white shadow-lg shadow-teal-200 hover:bg-teal-700 hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                <span>Send</span>
                <i className="fas fa-paper-plane text-sm"></i>
              </button>
            </div>
          </div>
        </div>
        <div className="text-center mt-3 text-xs text-slate-400 font-medium">
          Lumi can make mistakes. Please verify important information.
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" multiple />
    </div>
  );
};

const ToolToggle: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
      active 
        ? 'bg-teal-50 text-teal-700 border border-teal-100' 
        : 'text-slate-500 hover:bg-slate-50 border border-transparent'
    }`}
  >
    <i className={`fas ${icon} ${active ? 'text-amber-500' : ''}`}></i> {label}
  </button>
);

const MessageItem: React.FC<{ 
  message: ChatMessage; 
  isLast: boolean; 
  isTyping: boolean;
  onPreviewCitation?: (citation: { title: string; uri: string }) => void;
}> = ({ message, isLast, isTyping, onPreviewCitation }) => {
  const isUser = message.role === Role.USER;
  const [showThought, setShowThought] = useState(true);

  useEffect(() => {
    if (isLast && isTyping && message.thought) setShowThought(true);
  }, [message.thought, isLast, isTyping]);

  return (
    <div className={`flex gap-4 md:gap-6 ${isUser ? 'flex-row-reverse' : ''} group mb-6 animate-in fade-in duration-500`}>
      {/* Avatar */}
      <div className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl shadow-sm ${
        isUser 
          ? 'bg-white border border-slate-100 text-slate-400' 
          : 'bg-teal-600 text-white shadow-teal-200'
      }`}>
        {isUser ? <i className="fas fa-user"></i> : <i className="fas fa-sparkles"></i>}
      </div>
      
      <div className={`flex-1 min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Thought Bubble for Reasoning */}
        {message.thought && !isUser && (
          <div className="w-full max-w-2xl mb-4">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-teal-600 transition-colors mb-2 px-1 uppercase tracking-wider"
            >
              <i className={`fas ${showThought ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i> 
              Thinking Process
            </button>
            <div className={`expand-grid ${showThought ? 'expanded' : ''}`}>
              <div className="expand-content">
                <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600 leading-relaxed relative shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-amber-500 font-bold text-xs uppercase tracking-wider">
                     <i className="fas fa-lightbulb"></i> Analysis
                  </div>
                  <div className="whitespace-pre-wrap font-mono text-xs opacity-90 text-slate-500">{message.thought}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tool Invocations */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.toolInvocations.map((ti, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                Used: <span className="font-bold">{ti.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Bubble */}
        <div className={`relative max-w-2xl ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block px-6 py-4 rounded-2xl ${
            isUser 
              ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md shadow-teal-100 rounded-tr-none' 
              : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
          }`}>
            {isUser ? (
              <div className="text-base font-medium">{message.content}</div>
            ) : (
              <div className="prose prose-p:text-slate-700 prose-headings:text-slate-800 prose-strong:text-teal-700 max-w-none">
                {message.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                   isLast && isTyping && (
                     <div className="flex gap-1.5 items-center h-6 px-2">
                       <div className="w-2 h-2 bg-teal-400 rounded-full typing-dot"></div>
                       <div className="w-2 h-2 bg-teal-400 rounded-full typing-dot"></div>
                       <div className="w-2 h-2 bg-teal-400 rounded-full typing-dot"></div>
                     </div>
                   )
                )}
              </div>
            )}
            
            {/* Citations at the end of the bubble */}
            {message.groundingSources && message.groundingSources.length > 0 && !isUser && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {message.groundingSources.map((src, i) => (
                  <button 
                    key={i} 
                    onClick={() => onPreviewCitation?.(src)}
                    className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500 hover:text-teal-700 hover:bg-teal-50 hover:border-teal-200 transition-all max-w-full"
                  >
                    <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${new URL(src.uri).hostname}`} 
                        alt="" 
                        className="w-2.5 h-2.5 opacity-70"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'about:blank'; (e.target as HTMLImageElement).className = 'hidden'; }} 
                      />
                      <i className={`fas fa-link text-[8px] ${new URL(src.uri).hostname ? 'hidden' : 'block'}`}></i>
                    </span>
                    <span className="truncate max-w-[150px]">{src.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
