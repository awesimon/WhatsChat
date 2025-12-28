
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

const SUGGESTION_CATEGORIES = {
  write: {
    id: 'write',
    label: 'Write for me',
    icon: 'fa-pen-nib',
    color: 'text-blue-500',
    prompts: [
      "Write a satire about modern smartphone addiction",
      "Create a superhero origin story for a hamster",
      "Draft a polite but firm email declining a meeting",
      "Write a short story about a library that exists outside of time"
    ]
  },
  study: {
    id: 'study',
    label: 'Help me study',
    icon: 'fa-graduation-cap',
    color: 'text-indigo-500',
    prompts: [
      "Explain the concept of 'entropy' to a 10-year-old",
      "Summarize the key events of the French Revolution",
      "Create a 3-day study schedule for a biology exam",
      "What are the differences between classical and quantum mechanics?"
    ]
  },
  lifestyle: {
    id: 'lifestyle',
    label: 'Energize day',
    icon: 'fa-leaf',
    color: 'text-green-500',
    prompts: [
      "Design a low-impact 15-minute workout routine",
      "Suggest 3 healthy & quick breakfast recipes",
      "Give me a strategy to organize my chaotic to-do list",
      "List 5 mindfulness techniques for stress relief"
    ]
  }
};

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
  const [activeCategory, setActiveCategory] = useState<keyof typeof SUGGESTION_CATEGORIES | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMessages = session.messages.length > 0;
  
  // Auto-scroll effect
  useEffect(() => {
    if (hasMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session.messages.length, isTyping, hasMessages]);

  const handleSend = () => {
    if (inputText.trim() || attachments.length > 0) {
      onSendMessage(inputText, attachments, session.settings);
      setInputText('');
      setAttachments([]);
      setActiveCategory(null);
    }
  };

  const handleSuggestion = (text: string) => {
    onSendMessage(text, [], session.settings);
    setActiveCategory(null);
  };

  const toggleSetting = (key: string) => {
    onUpdateSettings({ ...session.settings, [key]: !((session.settings as any)[key]) });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      Promise.all(files.map(file => new Promise<FileMetadata>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = (ev.target?.result as string).split(',')[1];
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          });
        };
        reader.readAsDataURL(file);
      }))).then(newAttachments => {
        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
    }
  };

  const currentKB = knowledgeBases.find(kb => kb.id === session.activeKBId);

  return (
    <div className="flex-1 flex flex-col h-full relative bg-white/40 backdrop-blur-sm overflow-hidden font-nunito">
      {/* Dynamic Animations Styles */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-in {
          animation: slideIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes particle-fly {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
      `}</style>

      {/* Friendly Header - Fade out when empty to focus on center content */}
      <div className={`px-8 py-5 flex items-center justify-between absolute top-0 left-0 right-0 z-20 transition-all duration-500 ${hasMessages ? 'opacity-100 translate-y-0 bg-white/80 backdrop-blur border-b border-slate-50' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button 
              onClick={onToggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <i className="fas fa-bars text-lg"></i>
            </button>
          )}
          
          <div className="flex flex-col">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              {session.title}
              {currentKB && <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-100">KB: {currentKB.name}</span>}
            </h2>
            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Lumi is thinking...
              </div>
            )}
          </div>
        </div>

        <select 
          value={session.activeKBId || ''}
          onChange={(e) => onUpdateSettings({ ...session.settings, activeKBId: e.target.value })}
          className="text-sm font-semibold text-slate-600 bg-slate-50 border-transparent rounded-lg px-3 py-2 hover:bg-slate-100 cursor-pointer focus:ring-0 transition-colors"
        >
          <option value="">✨ General Chat</option>
          {knowledgeBases.map(kb => (
            <option key={kb.id} value={kb.id}>📚 {kb.name}</option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative w-full h-full">
        {/* Welcome Screen (Centered Top) - Visible when no messages */}
        <div className={`absolute left-0 right-0 top-[15%] md:top-[20%] flex flex-col items-center justify-start transition-all duration-700 ease-in-out pointer-events-none z-10 ${hasMessages ? 'opacity-0 -translate-y-20 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
            <div className="w-full max-w-4xl px-6">
               <div className="flex items-center gap-3 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  {/* Gradient Star Icon */}
                  <div className="relative w-8 h-8">
                    <i className="fas fa-star text-2xl absolute inset-0 text-transparent bg-clip-text bg-gradient-to-tr from-indigo-400 via-purple-400 to-pink-400 animate-pulse"></i>
                  </div>
                  <span className="text-2xl font-medium text-slate-600">Hello there</span>
               </div>
               <h1 className="text-6xl md:text-7xl font-medium text-slate-800 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
                 How can I help you today?
               </h1>
            </div>
        </div>

        {/* Chat Stream - Visible when messages exist */}
        <div className={`absolute inset-0 overflow-y-auto custom-scrollbar transition-opacity duration-1000 ${hasMessages ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}>
            <div className="px-4 md:px-12 py-24 pb-48 space-y-8 min-h-full flex flex-col justify-end md:justify-start">
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
        </div>

        {/* Floating Input Bar (Animates from Center to Bottom) */}
        <div className={`absolute left-0 right-0 z-30 transition-all duration-[800ms] cubic-bezier(0.22, 1, 0.36, 1) flex flex-col items-center px-4 md:px-6 ${
            hasMessages 
                ? 'bottom-8 translate-y-0' 
                : 'bottom-1/2 translate-y-[50%]' 
        }`}>
            <div className="w-full max-w-4xl relative">
                {/* Particle Effects Container */}
                <ParticleBurst trigger={hasMessages} />

                {/* Input Pill */}
                <div className={`bg-white rounded-[2rem] transition-all duration-500 relative z-20 flex flex-col ${
                    hasMessages 
                    ? 'shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-200' 
                    : 'shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] border border-slate-100 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]'
                }`}>
                  
                  {/* Pending Attachments Preview */}
                  {attachments.length > 0 && (
                    <div className="px-8 pt-4 flex gap-3 overflow-x-auto custom-scrollbar">
                      {attachments.map(att => (
                        <div key={att.id} className="relative group shrink-0 animate-in zoom-in-50 duration-200">
                          {att.type.startsWith('image/') ? (
                            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden relative">
                               <img src={`data:${att.type};base64,${att.data}`} className="w-full h-full object-cover" alt="preview" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                              <i className="fas fa-file text-xl"></i>
                            </div>
                          )}
                          <button 
                            onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs shadow-sm hover:scale-110 transition-transform"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Text Input */}
                  <div className={`px-8 pb-3 ${attachments.length > 0 ? 'pt-3' : 'pt-5'}`}>
                      <textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Ask Lumi..."
                      className="w-full bg-transparent border-none text-slate-700 placeholder-slate-400 focus:ring-0 outline-none min-h-[32px] max-h-40 resize-none text-xl font-medium"
                      style={{ fontFamily: 'Nunito, sans-serif' }}
                      />
                  </div>
                  
                  {/* Toolbar Row */}
                  <div className="flex items-center justify-between px-6 pb-4">
                      <div className="flex items-center gap-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            title="Add Attachment"
                        >
                            <i className="fas fa-plus text-lg"></i>
                        </button>
                        
                        <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

                        {/* Tools Group */}
                        <div className="flex items-center gap-1">
                          <ToolToggle active={session.settings.useWebSearch} onClick={() => toggleSetting('useWebSearch')} icon="fa-globe" label="Web" />
                          <ToolToggle active={session.settings.useMaps} onClick={() => toggleSetting('useMaps')} icon="fa-map-marker-alt" label="Maps" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         {/* Model/Reasoning Selector */}
                         <button 
                           onClick={() => toggleSetting('useReasoning')}
                           className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                             session.settings.useReasoning 
                               ? 'bg-slate-800 text-white' 
                               : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                           }`}
                         >
                           <span className="text-sm">Pro</span>
                           <i className={`fas fa-chevron-down text-[10px] transition-transform ${session.settings.useReasoning ? 'rotate-180' : ''}`}></i>
                         </button>
                         
                         {/* Send Button */}
                         <button 
                          onClick={handleSend}
                          disabled={!inputText.trim() && attachments.length === 0}
                          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                            (inputText.trim() || attachments.length > 0) 
                            ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <i className="fas fa-paper-plane text-base translate-x-[-1px] translate-y-[1px]"></i>
                        </button>
                      </div>
                  </div>
                </div>

                {/* Interactive Suggestions Container */}
                <div className={`mt-8 flex flex-col items-center gap-6 transition-all duration-500 ${hasMessages ? 'opacity-0 scale-95 pointer-events-none h-0 overflow-hidden' : 'opacity-100 scale-100'}`}>
                   {/* Category Chips */}
                   <div className="flex flex-wrap justify-center gap-3">
                       {Object.values(SUGGESTION_CATEGORIES).map(cat => (
                           <SuggestionChip 
                             key={cat.id}
                             icon={cat.icon} 
                             label={cat.label} 
                             color={cat.color} 
                             isActive={activeCategory === cat.id}
                             onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id as any)} 
                           />
                       ))}
                   </div>

                   {/* Example Prompts List - Collapsible with animation */}
                   <div className={`w-full max-w-2xl grid transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                       activeCategory 
                         ? 'grid-rows-[1fr] opacity-100 mt-2' 
                         : 'grid-rows-[0fr] opacity-0 mt-0'
                   }`}>
                     <div className="overflow-hidden">
                        {/* Key is crucial here: Changing key forces React to remount the list, triggering the entry animation */}
                        {activeCategory && (
                            <div key={activeCategory} className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                                {SUGGESTION_CATEGORIES[activeCategory].prompts.map((prompt, idx) => (
                                    <button 
                                        key={`${activeCategory}-${idx}`}
                                        onClick={() => handleSuggestion(prompt)}
                                        className="text-left p-4 rounded-xl bg-white/50 border border-slate-200 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all text-slate-600 font-medium text-base group opacity-0 animate-slide-in"
                                        style={{ animationDelay: `${idx * 60}ms` }}
                                    >
                                        <span className="group-hover:text-indigo-600 transition-colors">{prompt}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                     </div>
                   </div>
                </div>
                
                {/* Footer Text */}
                <div className={`text-center mt-6 text-xs text-slate-300 font-medium transition-opacity duration-500 ${hasMessages ? 'opacity-100' : 'opacity-0'}`}>
                   Lumi can make mistakes. Please verify important information.
                </div>
            </div>
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
    </div>
  );
};

const ImageAttachment: React.FC<{ attachment: FileMetadata }> = ({ attachment }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-square max-h-72">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <i className="fas fa-spinner fa-spin text-slate-400 text-2xl"></i>
        </div>
      )}
      <img
        src={`data:${attachment.type};base64,${attachment.data}`}
        alt={attachment.name}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

const SuggestionChip: React.FC<{ icon: string; label: string; color: string; onClick: () => void; isActive?: boolean }> = ({ icon, label, color, onClick, isActive }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-sm border transition-all duration-300 group ${
      isActive 
        ? 'bg-slate-800 text-white border-slate-800 scale-105 shadow-md' 
        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5'
    }`}
  >
    <i className={`fas ${icon} text-base group-hover:scale-110 transition-transform ${isActive ? 'text-white' : color}`}></i>
    <span className="text-base font-semibold">{label}</span>
  </button>
);

const ParticleBurst: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const [active, setActive] = useState(false);
  
  useEffect(() => {
    if (trigger) {
      setActive(true);
      const timer = setTimeout(() => setActive(false), 1000); // Cleanup after animation
      return () => clearTimeout(timer);
    } else {
        setActive(false);
    }
  }, [trigger]);

  if (!active) return null;

  // Generate ~12 particles
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * 360;
    const distance = 100 + Math.random() * 50;
    const tx = Math.cos(angle * Math.PI / 180) * distance;
    const ty = Math.sin(angle * Math.PI / 180) * distance;
    const delay = Math.random() * 0.2;
    const color = i % 2 === 0 ? '#4f46e5' : '#8b5cf6'; // Indigo and Violet
    
    return (
      <div 
        key={i}
        className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full opacity-0 pointer-events-none"
        style={{
          backgroundColor: color,
          animation: `particle-fly 0.8s ease-out forwards ${delay}s`,
          '--tx': `${tx}px`,
          '--ty': `${ty}px`
        } as React.CSSProperties}
      />
    );
  });

  return (
    <div className="absolute inset-0 overflow-visible pointer-events-none z-0">
        {particles}
    </div>
  );
}

const ToolToggle: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
      active 
        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
        : 'text-slate-400 hover:bg-slate-50 border border-transparent hover:text-slate-600'
    }`}
  >
    <i className={`fas ${icon} text-sm ${active ? 'text-indigo-600' : ''}`}></i>
    <span className={`text-sm ${active ? 'block' : 'hidden md:block'}`}>{label}</span>
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
    <div className={`flex gap-5 md:gap-7 ${isUser ? 'flex-row-reverse' : ''} group mb-8 animate-in fade-in duration-500 slide-in-from-bottom-2`}>
      {/* Avatar */}
      <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl shadow-sm ${
        isUser 
          ? 'bg-white border border-slate-100 text-slate-400' 
          : 'bg-indigo-600 text-white shadow-indigo-200'
      }`}>
        {isUser ? <i className="fas fa-user text-base"></i> : <i className="fas fa-bolt text-base"></i>}
      </div>
      
      <div className={`flex-1 min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Thought Bubble for Reasoning */}
        {message.thought && !isUser && (
          <div className="w-full max-w-4xl mb-4">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors mb-2 px-1 uppercase tracking-wider"
            >
              <i className={`fas ${showThought ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i> 
              Thinking Process
            </button>
            <div className={`expand-grid ${showThought ? 'expanded' : ''}`}>
              <div className="expand-content">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-base text-slate-600 leading-relaxed relative shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-amber-500 font-bold text-sm uppercase tracking-wider">
                     <i className="fas fa-lightbulb"></i> Analysis
                  </div>
                  <div className="whitespace-pre-wrap font-mono text-sm opacity-90 text-slate-500">{message.thought}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tool Invocations */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.toolInvocations.map((ti, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                Used: <span className="font-bold">{ti.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Attachments Grid */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={`grid grid-cols-2 gap-3 mb-4 max-w-lg ${isUser ? 'ml-auto' : 'mr-auto'}`}>
            {message.attachments.map(att => (
               att.type.startsWith('image/') ? (
                 <ImageAttachment key={att.id} attachment={att} />
               ) : (
                 <div key={att.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm">
                     <i className="fas fa-file text-lg"></i>
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="text-sm font-bold text-slate-700 truncate">{att.name}</div>
                     <div className="text-xs text-slate-400">{(att.size / 1024).toFixed(1)} KB</div>
                   </div>
                 </div>
               )
            ))}
          </div>
        )}

        {/* Main Content Bubble */}
        <div className={`relative max-w-4xl ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block px-7 py-5 rounded-3xl ${
            isUser 
              ? 'bg-slate-100 text-slate-800 rounded-tr-none' 
              : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
          }`}>
            {isUser ? (
              <div className="text-lg font-medium whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div className="prose prose-p:text-slate-700 prose-headings:text-slate-800 prose-strong:text-indigo-700 max-w-none">
                {message.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                   isLast && isTyping && (
                     <div className="flex gap-2 items-center h-8 px-2">
                       <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full typing-dot"></div>
                       <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full typing-dot"></div>
                       <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full typing-dot"></div>
                     </div>
                   )
                )}
              </div>
            )}
            
            {/* Citations at the end of the bubble */}
            {message.groundingSources && message.groundingSources.length > 0 && !isUser && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                {message.groundingSources.map((src, i) => (
                  <button 
                    key={i} 
                    onClick={() => onPreviewCitation?.(src)}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 transition-all max-w-full"
                  >
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${new URL(src.uri).hostname}`} 
                        alt="" 
                        className="w-3.5 h-3.5 opacity-70"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'about:blank'; (e.target as HTMLImageElement).className = 'hidden'; }} 
                      />
                      <i className={`fas fa-link text-[10px] ${new URL(src.uri).hostname ? 'hidden' : 'block'}`}></i>
                    </span>
                    <span className="truncate max-w-[180px]">{src.title}</span>
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
