
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

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [session.messages, isTyping]);

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
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Session Header / KB Selector */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10 min-h-[64px]">
        <div className="flex items-center">
          {!isSidebarOpen && (
            <button 
              onClick={onToggleSidebar}
              className="w-10 h-10 mr-4 flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-800 transition-all active:scale-90 animate-message"
              title="Expand sidebar"
            >
              <i className="fas fa-bars text-lg"></i>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">Active context:</div>
            <select 
              value={session.activeKBId || ''}
              onChange={(e) => onUpdateSettings({ ...session.settings, activeKBId: e.target.value })}
              className="text-xs font-bold bg-gray-100 border-none rounded-full px-4 py-1.5 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all hover:bg-gray-200"
            >
              <option value="">No Knowledge Base</option>
              {knowledgeBases.map(kb => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>
            {currentKB && <span className="text-[10px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-black animate-pulse">{currentKB.files.length} indexed</span>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-10 custom-scrollbar">
        {session.messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-message">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-500 mb-4 tracking-tight">Hello, how can I help?</h1>
            <div className="flex gap-3 flex-wrap justify-center max-w-2xl mt-8">
              {['Plan a trip', 'Summarize document', 'Write code', 'Research topic'].map((hint, idx) => (
                <button 
                  key={hint} 
                  onClick={() => setInputText(hint)} 
                  style={{ animationDelay: `${idx * 0.1}s` }}
                  className="p-4 px-6 border rounded-2xl hover:bg-gray-50 hover:border-blue-200 hover:shadow-sm text-sm font-medium transition-all active:scale-95 animate-message"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
        {session.messages.map(msg => <MessageItem key={msg.id} message={msg} />)}
        {isTyping && (
          <div className="max-w-4xl mx-auto flex gap-6 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <i className="fas fa-sparkles text-blue-300 text-[10px]"></i>
            </div>
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-2.5 bg-gray-100 rounded-full w-1/4"></div>
              <div className="h-2.5 bg-gray-50 rounded-full w-3/4"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 max-w-4xl mx-auto w-full">
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {attachments.map(a => (
              <div key={a.id} className="bg-gray-100 p-2 px-3 rounded-xl flex items-center gap-2 text-xs font-bold text-gray-600 border animate-message">
                <i className="fas fa-file-alt text-blue-500"></i> {a.name}
              </div>
            ))}
          </div>
        )}

        <div className="input-box bg-white rounded-[28px] p-2 px-4 relative">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask anything..."
            className="w-full bg-transparent border-none py-4 px-2 text-gray-800 focus:ring-0 min-h-[50px] max-h-48 resize-none font-medium text-base transition-all"
          />
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => toggleSetting('useReasoning')}
                className={`toggle-pill flex items-center gap-2 p-1.5 px-3 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${session.settings.useReasoning ? 'active' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <i className="fas fa-brain"></i> Reasoning
              </button>
              <button 
                onClick={() => toggleSetting('useWebSearch')}
                className={`toggle-pill flex items-center gap-2 p-1.5 px-3 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${session.settings.useWebSearch ? 'active' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <i className="fas fa-search"></i> Web Search
              </button>
              <button 
                onClick={() => toggleSetting('useMaps')}
                className={`toggle-pill flex items-center gap-2 p-1.5 px-3 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${session.settings.useMaps ? 'active' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <i className="fas fa-map"></i> Maps
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-all"><i className="fas fa-microphone"></i></button>
              <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-all" onClick={() => fileInputRef.current?.click()}><i className="fas fa-paperclip"></i></button>
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() && attachments.length === 0}
                className="ml-1 w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 text-white disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-lg shadow-blue-500/20 active:scale-90 hover:bg-blue-700 disabled:shadow-none"
              >
                <i className="fas fa-arrow-up"></i>
              </button>
            </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" multiple />
      </div>
    </div>
  );
};

const MessageItem: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [showThought, setShowThought] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard shortcut: Ctrl+C or Cmd+C when message is focused
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const selection = window.getSelection()?.toString();
      // Only trigger whole message copy if no specific text is manually selected
      if (!selection) {
        e.preventDefault();
        handleCopy();
      }
    }
  };

  return (
    <div 
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`group max-w-4xl mx-auto flex gap-6 animate-message focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-[32px] p-4 -m-4 transition-all duration-300 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border transition-all ${isUser ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/20' : 'bg-white border-gray-200 shadow-sm'}`}>
        <i className={`fas ${isUser ? 'fa-user text-white' : 'fa-sparkles text-blue-600'} text-[10px]`}></i>
      </div>
      
      <div className={`flex-1 min-w-0 space-y-4 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {message.thought && !isUser && (
          <div className="w-full space-y-2">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-blue-600 flex items-center gap-2 transition-colors py-1 group"
            >
              <i className={`fas ${showThought ? 'fa-chevron-down' : 'fa-chevron-right'} transition-transform duration-300`}></i> 
              <span className="group-hover:translate-x-1 transition-transform">Advanced Reasoning</span>
            </button>
            <div className={`expand-grid ${showThought ? 'expanded' : ''}`}>
              <div className="expand-content">
                <div className="thought-pill p-5 rounded-[20px] text-xs text-gray-600 leading-relaxed whitespace-pre-wrap mb-2 bg-gray-50/50 border border-gray-100">
                  {message.thought}
                </div>
              </div>
            </div>
          </div>
        )}

        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.toolInvocations.map((ti, i) => (
              <div key={i} className="text-[10px] font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-2 shadow-sm animate-message" style={{ animationDelay: `${i * 0.1}s` }}>
                <i className="fas fa-bolt text-[8px] animate-pulse"></i> Calling tool: {ti.name}
              </div>
            ))}
          </div>
        )}

        <div className={`relative flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`${isUser ? 'user-bubble text-gray-800 shadow-sm border border-blue-100' : 'ai-response prose text-gray-800 transition-all duration-300'}`}>
            {isUser ? (
              message.content
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw, rehypeHighlight]}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
          
          <button 
            onClick={handleCopy}
            className={`opacity-0 group-hover:opacity-100 p-2.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-all shrink-0 active:scale-90 ${copied ? 'opacity-100 text-green-500 bg-green-50' : ''}`}
            title="Copy message (Ctrl+C)"
          >
            <i className={`fas ${copied ? 'fa-check text-green-500' : 'fa-copy'} text-xs transition-all`}></i>
          </button>
        </div>

        {message.groundingSources && message.groundingSources.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {message.groundingSources.map((s, i) => (
              <a key={i} href={s.uri} target="_blank" className="text-[11px] font-bold border rounded-full px-3 py-1.5 hover:bg-gray-50 hover:border-blue-200 transition-all flex items-center gap-2 text-gray-600 shadow-sm animate-message" style={{ animationDelay: `${i * 0.05}s` }}>
                <i className="fas fa-link text-[9px] opacity-40"></i> {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
