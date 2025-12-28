
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
}

const EchoMiniLogo = () => (
  <div className="relative w-6 h-6 flex items-center justify-center scale-[0.6]">
    <div className="absolute inset-0 border-[2px] border-sky-500 rounded-full echo-ring-outer"></div>
    <div className="w-3 h-3 bg-sky-500 rounded-full echo-core-pulse"></div>
  </div>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  session, 
  knowledgeBases, 
  onSendMessage, 
  onUpdateSettings, 
  isTyping,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<FileMetadata[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20 h-16">
        <div className="flex items-center gap-5">
          {!isSidebarOpen && (
            <button 
              onClick={onToggleSidebar}
              className="w-11 h-11 flex items-center justify-center hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-500 transition-all active:scale-90"
              title="Expand System"
            >
              <i className="fas fa-sidebar text-lg"></i>
            </button>
          )}
          <div className="flex items-center gap-5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hidden md:block">Neural Link</span>
            <select 
              value={session.activeKBId || ''}
              onChange={(e) => onUpdateSettings({ ...session.settings, activeKBId: e.target.value })}
              className="text-[13px] font-bold bg-slate-50 border border-slate-100 rounded-xl px-5 py-2 focus:ring-2 focus:ring-sky-500/20 outline-none cursor-pointer transition-all hover:bg-slate-100 min-w-[180px] text-slate-700"
            >
              <option value="">Core Processor</option>
              {knowledgeBases.map(kb => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {currentKB && (
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-sky-600 bg-sky-50 px-4 py-2 rounded-full border border-sky-100">
             <i className="fas fa-microchip text-[10px] opacity-60"></i>
             {currentKB.files.length} Modules Indexed
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-14 py-12 space-y-12 custom-scrollbar">
        {session.messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-message">
            <div className="relative w-28 h-28 flex items-center justify-center mb-10 group">
                <div className="absolute inset-0 border-2 border-sky-400/20 rounded-full scale-110 echo-ring-outer"></div>
                <div className="absolute inset-4 border-2 border-sky-300/10 rounded-full scale-90 echo-ring-inner"></div>
                <div className="w-12 h-12 bg-sky-500 rounded-full echo-core-pulse shadow-[0_0_30px_#0ea5e9]"></div>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-5 tracking-tight">How shall we proceed?</h1>
            <p className="text-slate-500 text-lg font-medium max-w-lg mb-14 leading-relaxed opacity-80">
              I am <span className="text-sky-600 font-bold">ECHO</span>. My neural processors are synchronized with Gemini 3 Pro for real-time analysis and global intelligence.
            </p>
            <div className="flex gap-4 flex-wrap justify-center max-w-3xl">
              {['Analyze market volatility', 'Draft system architecture', 'Synthesize research data', 'Generate creative concepts'].map((hint) => (
                <button 
                  key={hint} 
                  onClick={() => setInputText(hint)} 
                  className="p-4 px-8 border border-slate-100 rounded-2xl hover:bg-sky-50/50 hover:border-sky-200 hover:text-sky-700 text-[14px] font-bold text-slate-600 transition-all active:scale-95 bg-white shadow-sm"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
        {session.messages.map((msg, idx) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            isLast={idx === session.messages.length - 1} 
            isTyping={isTyping} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-12 pt-4 max-w-4xl mx-auto w-full">
        <div className="input-box rounded-[32px] overflow-hidden flex flex-col p-3">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="System input command..."
            className="w-full bg-transparent border-none py-5 px-6 text-slate-800 focus:ring-0 outline-none min-h-[64px] max-h-60 resize-none text-[18px] font-medium placeholder-slate-400"
          />
          
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              <ToolPill active={session.settings.useReasoning} onClick={() => toggleSetting('useReasoning')} icon="fa-bolt" label="Analysis" />
              <ToolPill active={session.settings.useWebSearch} onClick={() => toggleSetting('useWebSearch')} icon="fa-satellite" label="Net Search" />
              <ToolPill active={session.settings.useMaps} onClick={() => toggleSetting('useMaps')} icon="fa-location-crosshairs" label="Geo Link" />
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <IconButton icon="fa-waveform" onClick={() => {}} title="Voice" />
              <IconButton icon="fa-paperclip" onClick={() => fileInputRef.current?.click()} title="Data" />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() && attachments.length === 0}
                className={`ml-2 w-14 h-14 flex items-center justify-center rounded-[22px] transition-all active:scale-90 ${
                  (!inputText.trim() && attachments.length === 0) 
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                  : 'bg-sky-600 text-white shadow-xl shadow-sky-500/20 hover:bg-sky-700 hover:shadow-sky-500/30'
                }`}
              >
                <i className="fas fa-arrow-up text-xl"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToolPill: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2.5 p-2.5 px-4 rounded-xl transition-all active:scale-95 border ${
      active 
        ? 'bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-500/10' 
        : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100 hover:border-slate-200'
    }`}
  >
    <i className={`fas ${icon} text-[12px]`}></i>
    <span className="text-[11.5px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const IconButton: React.FC<{ icon: string; onClick: () => void; title: string }> = ({ icon, onClick, title }) => (
  <button 
    onClick={onClick}
    className="w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all active:scale-90"
    title={title}
  >
    <i className={`fas ${icon} text-lg`}></i>
  </button>
);

const MessageItem: React.FC<{ message: ChatMessage; isLast: boolean; isTyping: boolean }> = ({ message, isLast, isTyping }) => {
  const isUser = message.role === Role.USER;
  const [showThought, setShowThought] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isLast && isTyping && message.thought) setShowThought(true);
  }, [message.thought, isLast, isTyping]);

  return (
    <div className={`group max-w-4xl mx-auto flex gap-6 animate-message ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center border transition-all ${
        isUser ? 'bg-sky-600 border-sky-600 shadow-lg shadow-sky-500/20' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {isUser ? <i className="fas fa-user text-white text-sm"></i> : <EchoMiniLogo />}
      </div>
      
      <div className={`flex-1 min-w-0 space-y-6 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {message.thought && !isUser && (
          <div className="w-full space-y-3">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-sky-600 flex items-center gap-3 py-1 transition-colors"
            >
              <i className={`fas ${showThought ? 'fa-chevron-down' : 'fa-chevron-right'} transition-transform`}></i> 
              Logical Core Diagnostics
            </button>
            <div className={`expand-grid ${showThought ? 'expanded' : ''}`}>
              <div className="expand-content">
                <div className="p-6 rounded-3xl text-[14px] text-slate-500 leading-relaxed italic whitespace-pre-wrap mb-3 bg-slate-50/50 border border-slate-100 font-mono shadow-inner border-l-4 border-l-sky-400">
                  {message.thought}
                </div>
              </div>
            </div>
          </div>
        )}

        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {message.toolInvocations.map((ti, i) => (
              <div key={i} className="text-[10px] font-black bg-white text-sky-700 px-5 py-2.5 rounded-xl border border-sky-100 flex items-center gap-3 uppercase tracking-widest shadow-sm">
                <i className="fas fa-microchip text-sky-400 animate-pulse"></i> Protocol: {ti.name}
              </div>
            ))}
          </div>
        )}

        <div className={`relative flex items-center group/bubble gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`${isUser ? 'user-bubble' : 'ai-response prose text-slate-800'}`}>
            {isUser ? (
              message.content
            ) : (
              message.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                isLast && isTyping && (
                  <div className="flex gap-2 py-3">
                    <div className="w-2.5 h-2.5 bg-sky-200 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-sky-300 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce delay-300"></div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
