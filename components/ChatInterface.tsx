
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
      {/* Session Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20 h-16">
        <div className="flex items-center gap-5">
          {!isSidebarOpen && (
            <button 
              onClick={onToggleSidebar}
              className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-500 transition-all active:scale-90"
              title="Expand Sidebar"
            >
              <i className="fas fa-sidebar text-lg"></i>
            </button>
          )}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden md:block">Active Library</span>
            <select 
              value={session.activeKBId || ''}
              onChange={(e) => onUpdateSettings({ ...session.settings, activeKBId: e.target.value })}
              className="text-[13px] font-bold bg-slate-50 border border-slate-100 rounded-xl px-4 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer transition-all hover:bg-slate-100 min-w-[160px] text-slate-700"
            >
              <option value="">Global Assistant</option>
              {knowledgeBases.map(kb => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {currentKB && (
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
             <i className="fas fa-database text-[9px] opacity-60"></i>
             {currentKB.files.length} documents grounded
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-12 py-10 space-y-12 custom-scrollbar">
        {session.messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-message">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white shadow-sm">
              <i className="fas fa-wand-magic-sparkles text-blue-500 text-3xl"></i>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">How can I assist you?</h1>
            <p className="text-slate-500 text-base font-medium max-w-md mb-12 leading-relaxed">
              I'm powered by Gemini 3.0 Pro. Ask me to research topics, analyze data, or generate creative ideas.
            </p>
            <div className="flex gap-3 flex-wrap justify-center max-w-2xl">
              {['Research market trends 2024', 'Write a strategy brief', 'Analyze quarterly results', 'Creative brainstorming'].map((hint, idx) => (
                <button 
                  key={hint} 
                  onClick={() => setInputText(hint)} 
                  className="p-3.5 px-6 border border-slate-100 rounded-2xl hover:bg-blue-50/50 hover:border-blue-100 hover:text-blue-700 text-[13.5px] font-bold text-slate-600 transition-all active:scale-95 bg-white shadow-sm"
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
        {isTyping && session.messages[session.messages.length - 1]?.role === Role.USER && (
          <div className="max-w-4xl mx-auto flex gap-6 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <i className="fas fa-sparkles text-blue-300 text-xs"></i>
            </div>
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-2.5 bg-slate-100 rounded-full w-32"></div>
              <div className="h-2.5 bg-slate-50 rounded-full w-64"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 pb-12 pt-4 max-w-4xl mx-auto w-full">
        {attachments.length > 0 && (
          <div className="flex gap-3 mb-5 overflow-x-auto pb-2 no-scrollbar">
            {attachments.map(a => (
              <div key={a.id} className="bg-slate-50 p-2.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold text-slate-700 border border-slate-100 animate-message shadow-sm">
                <i className="fas fa-file-invoice text-blue-500"></i>
                <span className="truncate max-w-[180px]">{a.name}</span>
                <button onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))} className="ml-1 hover:text-rose-500 transition-colors"><i className="fas fa-circle-xmark"></i></button>
              </div>
            ))}
          </div>
        )}

        <div className="input-box rounded-[32px] overflow-hidden flex flex-col p-3">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type your command..."
            className="w-full bg-transparent border-none py-4 px-5 text-slate-800 focus:ring-0 outline-none min-h-[64px] max-h-60 resize-none text-[17px] font-medium placeholder-slate-400"
          />
          
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
              <ToolPill active={session.settings.useReasoning} onClick={() => toggleSetting('useReasoning')} icon="fa-brain" label="Reasoning" />
              <ToolPill active={session.settings.useWebSearch} onClick={() => toggleSetting('useWebSearch')} icon="fa-globe" label="Web Search" />
              <ToolPill active={session.settings.useMaps} onClick={() => toggleSetting('useMaps')} icon="fa-location-dot" label="Locations" />
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <IconButton icon="fa-microphone-lines" onClick={() => {}} title="Voice" />
              <IconButton icon="fa-paperclip" onClick={() => fileInputRef.current?.click()} title="Attach" />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() && attachments.length === 0}
                className={`ml-2 w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                  (!inputText.trim() && attachments.length === 0) 
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                  : 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30'
                }`}
              >
                <i className="fas fa-arrow-up text-lg"></i>
              </button>
            </div>
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            files.forEach(f => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const data = (ev.target?.result as string).split(',')[1];
                setAttachments(prev => [...prev, { id: crypto.randomUUID(), name: f.name, type: f.type, size: f.size, data }]);
              };
              reader.readAsDataURL(f);
            });
            e.target.value = '';
          }} 
        />
        <div className="flex items-center justify-center gap-6 mt-8 opacity-20 grayscale hover:grayscale-0 transition-all cursor-default">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Enterprise AI Grade</span>
        </div>
      </div>
    </div>
  );
};

const ToolPill: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2.5 p-2 px-4 rounded-xl transition-all active:scale-95 border ${
      active 
        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10' 
        : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100 hover:border-slate-200'
    }`}
  >
    <i className={`fas ${icon} text-[11px]`}></i>
    <span className="text-[11px] font-extrabold uppercase tracking-widest">{label}</span>
  </button>
);

const IconButton: React.FC<{ icon: string; onClick: () => void; title: string }> = ({ icon, onClick, title }) => (
  <button 
    onClick={onClick}
    className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all active:scale-90"
    title={title}
  >
    <i className={`fas ${icon} text-lg`}></i>
  </button>
);

const MessageItem: React.FC<{ message: ChatMessage; isLast: boolean; isTyping: boolean }> = ({ message, isLast, isTyping }) => {
  const isUser = message.role === Role.USER;
  const [showThought, setShowThought] = useState(true);
  const [copied, setCopied] = useState(false);

  // Auto-expand reasoning if it's currently generating
  useEffect(() => {
    if (isLast && isTyping && message.thought) {
      setShowThought(true);
    }
  }, [message.thought, isLast, isTyping]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group max-w-4xl mx-auto flex gap-6 animate-message ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center border transition-all ${
        isUser ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <i className={`fas ${isUser ? 'fa-user text-white' : 'fa-sparkles text-blue-600'} text-sm`}></i>
      </div>
      
      <div className={`flex-1 min-w-0 space-y-5 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Reasoning / Thought Block */}
        {message.thought && !isUser && (
          <div className="w-full space-y-3">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] hover:text-blue-600 flex items-center gap-3 py-1 transition-colors group/toggle"
            >
              <i className={`fas ${showThought ? 'fa-chevron-down' : 'fa-chevron-right'} transition-transform duration-300`}></i> 
              <span className="flex items-center gap-2">
                System Reasoning Loop
                {isLast && isTyping && !message.content && (
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-200"></span>
                  </span>
                )}
              </span>
            </button>
            <div className={`expand-grid ${showThought ? 'expanded' : ''}`}>
              <div className="expand-content">
                <div className="thought-pill p-6 rounded-3xl text-[14px] text-slate-500 leading-relaxed italic whitespace-pre-wrap mb-3 shadow-inner bg-slate-50/50 border border-slate-100 font-mono">
                  {message.thought}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tool Invocations */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {message.toolInvocations.map((ti, i) => (
              <div key={i} className="text-[10px] font-black bg-white text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2.5 uppercase tracking-widest shadow-sm">
                <i className="fas fa-microchip text-blue-400 animate-pulse"></i> Executing: {ti.name}
              </div>
            ))}
          </div>
        )}

        {/* Response Content */}
        <div className={`relative flex items-center group/bubble gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`${isUser ? 'user-bubble' : 'ai-response prose text-slate-800'}`}>
            {isUser ? (
              message.content
            ) : (
              message.content ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                isLast && isTyping && (
                  <div className="flex gap-1.5 py-2">
                    <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce delay-300"></div>
                  </div>
                )
              )
            )}
          </div>
          
          {message.content && (
            <button 
              onClick={handleCopy}
              className={`opacity-0 group-hover/bubble:opacity-100 p-3 text-slate-300 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-all active:scale-90 ${copied ? 'opacity-100 text-emerald-500' : ''}`}
              title="Copy"
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-clone'} text-sm`}></i>
            </button>
          )}
        </div>

        {/* Grounding Sources */}
        {message.groundingSources && message.groundingSources.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {message.groundingSources.map((s, i) => (
              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold border border-slate-100 rounded-2xl px-4 py-2 hover:bg-blue-50 hover:border-blue-200 transition-all text-slate-600 flex items-center gap-3 bg-white shadow-sm hover:shadow-md">
                <i className="fas fa-link text-[10px] text-blue-400/50"></i> {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
