
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, ChatMessage, FileMetadata, Role, KnowledgeBase } from '../types';

interface ChatInterfaceProps {
  session: ChatSession;
  knowledgeBases: KnowledgeBase[];
  onSendMessage: (text: string, attachments: FileMetadata[], settings: any) => void;
  onUpdateSettings: (settings: any) => void;
  isTyping: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ session, knowledgeBases, onSendMessage, onUpdateSettings, isTyping }) => {
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
      <div className="px-8 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active context:</div>
          <select 
            value={session.activeKBId || ''}
            onChange={(e) => onUpdateSettings({ ...session.settings, activeKBId: e.target.value })}
            className="text-xs font-bold bg-gray-100 border-none rounded-full px-4 py-1.5 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">No Knowledge Base</option>
            {knowledgeBases.map(kb => (
              <option key={kb.id} value={kb.id}>{kb.name}</option>
            ))}
          </select>
          {currentKB && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">{currentKB.files.length} indexed</span>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-10 custom-scrollbar">
        {session.messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-500 mb-4">Hello, how can I help?</h1>
            <div className="flex gap-4 flex-wrap justify-center max-w-2xl mt-8">
              {['Plan a trip', 'Summarize document', 'Write code', 'Research topic'].map(hint => (
                <button key={hint} className="p-4 px-6 border rounded-2xl hover:bg-gray-50 text-sm font-medium transition-colors">{hint}</button>
              ))}
            </div>
          </div>
        )}
        {session.messages.map(msg => <MessageItem key={msg.id} message={msg} />)}
        {isTyping && (
          <div className="max-w-4xl mx-auto flex gap-6">
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse"></div>
            <div className="flex-1 space-y-2 pt-2">
              <div className="h-2 bg-gray-100 rounded-full w-1/4 animate-pulse"></div>
              <div className="h-2 bg-gray-100 rounded-full w-3/4 animate-pulse"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 max-w-4xl mx-auto w-full">
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3">
            {attachments.map(a => (
              <div key={a.id} className="bg-gray-100 p-2 px-3 rounded-xl flex items-center gap-2 text-xs font-bold text-gray-600">
                <i className="fas fa-file"></i> {a.name}
              </div>
            ))}
          </div>
        )}

        <div className="input-box bg-white rounded-3xl p-2 px-4 relative">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type your message..."
            className="w-full bg-transparent border-none py-4 px-2 text-gray-800 focus:ring-0 min-h-[50px] max-h-48 resize-none font-medium text-base"
          />
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => toggleSetting('useReasoning')}
                className={`toggle-pill flex items-center gap-2 p-1.5 px-3 rounded-full text-[10px] font-bold border uppercase tracking-wider ${session.settings.useReasoning ? 'active' : 'border-gray-200 text-gray-500'}`}
              >
                <i className="fas fa-brain"></i> Reasoning
              </button>
              <button 
                onClick={() => toggleSetting('useWebSearch')}
                className={`toggle-pill flex items-center gap-2 p-1.5 px-3 rounded-full text-[10px] font-bold border uppercase tracking-wider ${session.settings.useWebSearch ? 'active' : 'border-gray-200 text-gray-500'}`}
              >
                <i className="fas fa-search"></i> Web Search
              </button>
              <button 
                onClick={() => toggleSetting('useMaps')}
                className={`toggle-pill flex items-center gap-2 p-1.5 px-3 rounded-full text-[10px] font-bold border uppercase tracking-wider ${session.settings.useMaps ? 'active' : 'border-gray-200 text-gray-500'}`}
              >
                <i className="fas fa-map"></i> Maps
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><i className="fas fa-microphone"></i></button>
              <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" onClick={() => fileInputRef.current?.click()}><i className="fas fa-paperclip"></i></button>
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() && attachments.length === 0}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-md active:scale-90"
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

  return (
    <div className={`max-w-4xl mx-auto flex gap-6 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${isUser ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}>
        <i className={`fas ${isUser ? 'fa-user text-white' : 'fa-sparkles text-blue-600'} text-[10px]`}></i>
      </div>
      
      <div className={`flex-1 min-w-0 space-y-4 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {message.thought && !isUser && (
          <div className="w-full space-y-2">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-blue-600 flex items-center gap-2"
            >
              <i className={`fas ${showThought ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i> Advanced Reasoning
            </button>
            {showThought && <div className="thought-pill p-4 rounded-2xl text-xs text-gray-600 leading-relaxed">{message.thought}</div>}
          </div>
        )}

        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="flex gap-2">
            {message.toolInvocations.map((ti, i) => (
              <div key={i} className="text-[10px] font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-2">
                <i className="fas fa-bolt text-[8px]"></i> {ti.name}
              </div>
            ))}
          </div>
        )}

        <div className={isUser ? 'user-bubble text-gray-800' : 'ai-response text-gray-800 leading-relaxed text-[15px] whitespace-pre-wrap'}>
          {message.content}
        </div>

        {message.groundingSources && message.groundingSources.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {message.groundingSources.map((s, i) => (
              <a key={i} href={s.uri} target="_blank" className="text-[11px] font-bold border rounded-full px-3 py-1 hover:bg-gray-50 flex items-center gap-2 text-gray-600">
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
