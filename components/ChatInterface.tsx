
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, ChatMessage, FileMetadata, Role } from '../types';

interface ChatInterfaceProps {
  session: ChatSession;
  onSendMessage: (text: string, attachments: FileMetadata[]) => void;
  onAddToKB: (files: FileMetadata[]) => void;
  isTyping: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ session, onSendMessage, onAddToKB, isTyping }) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<FileMetadata[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kbInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [session.messages, isTyping]);

  const handleSend = () => {
    if (inputText.trim() || attachments.length > 0) {
      onSendMessage(inputText, attachments);
      setInputText('');
      setAttachments([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isKB: boolean) => {
    const files: File[] = Array.from(e.target.files || []);
    const processed: Promise<FileMetadata>[] = files.map((file: File) => new Promise<FileMetadata>((resolve) => {
      const reader = new FileReader();
      const isText = file.type.startsWith('text/') || 
                     file.name.endsWith('.md') || 
                     file.name.endsWith('.txt') || 
                     file.name.endsWith('.json') ||
                     file.name.endsWith('.ts') ||
                     file.name.endsWith('.tsx') ||
                     file.name.endsWith('.js');

      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (isText) {
          const textReader = new FileReader();
          textReader.onload = (textEv) => {
            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type,
              size: file.size,
              data: result.split(',')[1],
              content: textEv.target?.result as string
            });
          };
          textReader.readAsText(file);
        } else {
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            data: result.split(',')[1]
          });
        }
      };
      reader.readAsDataURL(file);
    }));

    Promise.all(processed).then(results => {
      if (isKB) onAddToKB(results);
      else setAttachments(prev => [...prev, ...results]);
    });
  };

  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input not supported.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev + ' ' + transcript);
    };
    recognition.start();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden">
      {/* Knowledge Base Header */}
      <div className="px-8 py-3 glass-header flex items-center justify-between z-10">
        <div className="flex items-center gap-6 overflow-hidden">
          <div className="flex items-center gap-2 text-violet-400 font-bold text-[10px] uppercase tracking-widest shrink-0">
            <i className="fas fa-layer-group"></i> Knowledge Hub
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar pb-1">
            {session.knowledgeBase.map(f => (
              <div key={f.id} className="bg-white/5 border border-white/5 px-3 py-1 rounded-full flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <i className="fas fa-file-code text-[10px] text-violet-300/50"></i>
                <span className="text-[10px] text-gray-300 font-medium truncate max-w-[120px]">{f.name}</span>
              </div>
            ))}
            {session.knowledgeBase.length === 0 && (
              <span className="text-[10px] text-gray-600 italic">No assets indexed</span>
            )}
          </div>
        </div>
        <button 
          onClick={() => kbInputRef.current?.click()}
          className="ml-4 shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-violet-300 border border-violet-500/20 hover:bg-violet-500/10 transition-all flex items-center gap-2"
        >
          <i className="fas fa-plus"></i> Index Asset
        </button>
        <input type="file" ref={kbInputRef} className="hidden" multiple onChange={(e) => handleFileChange(e, true)} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar">
        {session.messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 to-rose-500 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/20">
              <i className="fas fa-bolt text-2xl text-white"></i>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">How can I assist today?</h2>
            <p className="text-gray-500 text-sm text-center max-w-sm">Ask about your documents, search the web, or visualize local maps with real-time grounding.</p>
          </div>
        )}
        {session.messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {isTyping && (
          <div className="flex gap-6 max-w-5xl mx-auto w-full">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 animate-pulse">
              <i className="fas fa-robot text-xs text-gray-600"></i>
            </div>
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-2 bg-white/5 rounded-full w-1/4 animate-pulse"></div>
              <div className="h-2 bg-white/5 rounded-full w-3/4 animate-pulse delay-75"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-8">
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-violet-500/5 blur-3xl -z-10 rounded-full"></div>
          
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 animate-in slide-in-from-bottom-2 duration-300">
              {attachments.map(att => (
                <div key={att.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-2 pl-3 pr-2 rounded-xl flex items-center gap-3">
                  <i className="fas fa-file-alt text-violet-400 text-xs"></i>
                  <span className="text-[10px] font-bold text-gray-300 truncate max-w-[150px]">{att.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="w-6 h-6 flex items-center justify-center hover:bg-rose-500/20 rounded-lg text-gray-500 hover:text-rose-400 transition-colors">
                    <i className="fas fa-times text-[10px]"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#121212] border border-white/5 rounded-3xl p-2 focus-within:border-violet-500/50 transition-all shadow-2xl relative">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Query the index or search the web..."
              className="w-full bg-transparent border-none py-4 px-6 text-white placeholder-gray-600 focus:ring-0 min-h-[60px] max-h-48 resize-none font-medium text-sm"
            />
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="flex items-center gap-1">
                <button 
                  onClick={startVoiceRecording}
                  className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${isRecording ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse' : 'hover:bg-white/5 text-gray-500 hover:text-white'}`}
                >
                  <i className="fas fa-microphone"></i>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all"
                >
                  <i className="fas fa-paperclip"></i>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e, false)} />
              </div>

              <button 
                onClick={handleSend}
                disabled={!inputText.trim() && attachments.length === 0}
                className="h-10 px-6 rounded-2xl bg-white text-black font-bold text-xs hover:bg-violet-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-white/5 flex items-center gap-2"
              >
                Send <i className="fas fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          </div>
          <p className="mt-4 text-center text-[9px] uppercase tracking-[0.3em] font-bold text-gray-700">Neural Engine v3.14.0</p>
        </div>
      </div>
    </div>
  );
};

const MessageItem: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [showThought, setShowThought] = useState(true);

  return (
    <div className={`flex gap-6 max-w-5xl mx-auto w-full group ${isUser ? 'flex-row-reverse' : 'animate-in fade-in slide-in-from-bottom-4 duration-500'}`}>
      <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center border shadow-xl transition-transform group-hover:scale-105 ${
        isUser ? 'user-bubble border-white/10' : 'bg-black border-white/5'
      }`}>
        <i className={`fas ${isUser ? 'fa-user' : 'fa-sparkles'} text-xs text-white`}></i>
      </div>
      
      <div className={`flex-1 min-w-0 space-y-3 ${isUser ? 'text-right flex flex-col items-end' : ''}`}>
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 px-1">
          {isUser ? '' : <span className="text-violet-500">System Core</span>}
          {isUser ? 'Identity Protocol' : ''}
          <span className="font-normal normal-case tracking-normal opacity-40">{new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>

        {/* Reasoning Section */}
        {message.thought && (
          <div className="w-full bg-[#080808]/50 border border-white/5 rounded-2xl overflow-hidden mb-4 shadow-inner">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="w-full flex items-center gap-3 p-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-violet-400 transition-colors"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${showThought ? 'bg-violet-500 animate-pulse' : 'bg-gray-700'}`}></div>
              Internal Reasoning
              <i className={`fas ${showThought ? 'fa-chevron-down' : 'fa-chevron-right'} ml-auto opacity-30`}></i>
            </button>
            {showThought && (
              <div className="p-4 pt-0 text-xs text-gray-400 leading-relaxed thought-block bg-transparent border-none">
                {message.thought}
              </div>
            )}
          </div>
        )}

        {/* Tool Calls */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
            {message.toolInvocations.map((inv, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-2 px-3 text-[10px] flex items-center gap-3 text-gray-400 group/tool">
                <i className={`fas ${inv.name.includes('Search') ? 'fa-globe' : 'fa-map-pin'} text-violet-400 group-hover/tool:animate-bounce`}></i>
                <span className="font-bold text-gray-300">Executing {inv.name}...</span>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className={`p-5 px-7 rounded-3xl text-sm leading-relaxed max-w-[90%] shadow-2xl ${
          isUser ? 'user-bubble text-white text-left' : 'ai-bubble text-gray-300 backdrop-blur-md'
        }`}>
          {message.content ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            !isUser && <div className="flex gap-1 items-center h-5"><div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce"></div><div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce delay-75"></div><div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce delay-150"></div></div>
          )}
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.attachments.map(att => (
                <div key={att.id} className="bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center gap-3 text-[10px] font-bold">
                  <i className="fas fa-file-invoice text-violet-400"></i>
                  <span className="text-gray-200">{att.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grounding / Citations */}
        {!isUser && message.groundingSources && message.groundingSources.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-3 ml-1">Real-time Grounding</h4>
            <div className="flex flex-wrap gap-2">
              {message.groundingSources.map((source, idx) => (
                <a 
                  key={idx} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white/5 hover:bg-violet-500/10 px-4 py-2 rounded-2xl text-[10px] font-bold text-violet-300 border border-white/5 hover:border-violet-500/30 transition-all flex items-center gap-3 shadow-lg"
                >
                  <i className="fas fa-external-link-alt text-[9px] opacity-40"></i>
                  {source.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
