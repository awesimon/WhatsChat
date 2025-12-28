
import React, { useState, useEffect, useCallback } from 'react';
import { ChatSession, ChatMessage, Role, FileMetadata, KnowledgeBase } from './types';
import { storageService } from './services/storage';
import { GeminiService } from './services/gemini';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import KBManager from './components/KBManager';
import CitationSidebar from './components/CitationSidebar';

const geminiService = new GeminiService();

type ViewState = 'chat' | 'kb';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Citation Preview State
  const [previewCitation, setPreviewCitation] = useState<{ title: string; uri: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await storageService.init();
        const savedSessions = await storageService.getSessions();
        const savedKBs = await storageService.getKnowledgeBases();
        
        setKnowledgeBases(savedKBs);
        
        if (savedSessions.length > 0) {
          setSessions(savedSessions);
          setCurrentSessionId(savedSessions[0].id);
        } else {
          const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: 'Hello there! 👋',
            messages: [],
            lastUpdated: Date.now(),
            settings: { useReasoning: true, useWebSearch: true, useMaps: false }
          };
          await storageService.saveSessions([newSession]);
          setSessions([newSession]);
          setCurrentSessionId(newSession.id);
        }
        setIsDbReady(true);
      } catch (e: any) {
        console.error("Initialization error:", e);
        setInitError(e.message || "Failed to initialize application resources. Please check your connection.");
      }
    };
    init();
  }, []);

  // Debounce saving sessions to disk to improve performance
  useEffect(() => {
    if (!isDbReady || sessions.length === 0) return;

    const timeoutId = setTimeout(() => {
      storageService.saveSessions(sessions);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [sessions, isDbReady]);

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      lastUpdated: Date.now(),
      settings: { useReasoning: true, useWebSearch: true, useMaps: false }
    };
    // Immediate save for new session is fine
    await storageService.saveSessions([newSession]);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setCurrentView('chat');
    if (!isSidebarOpen && window.innerWidth < 768) setIsSidebarOpen(true);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const sendMessage = useCallback(async (text: string, attachments: FileMetadata[], settings: any) => {
    if (!currentSessionId || !currentSession || !isDbReady) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: Role.USER,
      content: text,
      timestamp: Date.now(),
      attachments
    };

    setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
      ...s, 
      messages: [...s.messages, userMessage], 
      title: s.messages.length === 0 ? text.slice(0, 30) : s.title 
    } : s));
    
    setIsTyping(true);

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = { 
      id: assistantId, 
      role: Role.ASSISTANT, 
      content: '', 
      thought: '', 
      timestamp: Date.now() 
    };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
      ...s, 
      messages: [...s.messages, assistantMessage] 
    } : s));

    try {
      const activeKB = knowledgeBases.find(kb => kb.id === currentSession.activeKBId);
      const kbFiles = activeKB ? activeKB.files : [];
      
      await geminiService.generateStream(
        { ...currentSession, messages: [...currentSession.messages, userMessage], settings },
        kbFiles,
        (text, thought, sources) => {
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantId ? {
              ...m,
              content: text,
              thought: thought,
              groundingSources: sources?.map((src: any) => ({
                title: src.web?.title || src.maps?.title || 'Source',
                uri: src.web?.uri || src.maps?.uri || '#'
              }))
            } : m)
          } : s));
        },
        (tool, args) => {
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantId ? {
              ...m, 
              toolInvocations: [...(m.toolInvocations || []), { name: tool, args }]
            } : m)
          } : s));
        }
      );
    } catch (e: any) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? {
        ...s,
        messages: s.messages.map(m => m.id === assistantId ? {
          ...m,
          content: e.message?.includes("Failed to fetch") 
            ? "I'm having trouble connecting to the internet. Please check your network connection."
            : "I'm having a little trouble right now. Can we try that again?"
        } : m)
      } : s));
    } finally { 
      setIsTyping(false); 
    }
  }, [currentSessionId, knowledgeBases, currentSession, isDbReady]);

  const handleAddKB = async (name: string) => {
    const newKB: KnowledgeBase = {
      id: crypto.randomUUID(),
      name,
      description: '',
      files: [],
      createdAt: Date.now()
    };
    await storageService.saveKnowledgeBase(newKB);
    setKnowledgeBases(prev => [...prev, newKB]);
  };

  const handleUploadToFile = async (kbId: string, files: FileMetadata[]) => {
    const updatedKBs = knowledgeBases.map(kb => 
      kb.id === kbId ? { ...kb, files: [...kb.files, ...files] } : kb
    );
    const targetKB = updatedKBs.find(kb => kb.id === kbId);
    if (targetKB) {
      await storageService.saveKnowledgeBase(targetKB);
    }
    setKnowledgeBases(updatedKBs);
  };

  const handleDeleteKB = async (id: string) => {
    await storageService.deleteKnowledgeBase(id);
    setKnowledgeBases(prev => prev.filter(kb => kb.id !== id));
    setSessions(prev => prev.map(s => s.activeKBId === id ? { ...s, activeKBId: undefined } : s));
  };

  const handleDeleteFile = async (kbId: string, fileId: string) => {
    await storageService.deleteFile(fileId);
    setKnowledgeBases(prev => prev.map(kb => 
      kb.id === kbId 
        ? { ...kb, files: kb.files.filter(f => f.id !== fileId) } 
        : kb
    ));
  };

  const handleDeleteSession = async (id: string) => {
    await storageService.deleteSession(id);
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== id);
      if (currentSessionId === id) {
        if (newSessions.length > 0) {
          setCurrentSessionId(newSessions[0].id);
        } else {
          setCurrentSessionId(null);
        }
      }
      return newSessions;
    });
  };

  const handleSidebarSelect = (id: string) => {
    setCurrentSessionId(id);
    setCurrentView('chat');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  if (initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-rose-100">
           <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto text-rose-500 shadow-sm">
              <i className="fas fa-wifi text-3xl"></i>
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-3">Connection Issue</h2>
           <p className="text-slate-500 mb-8 leading-relaxed">
             We couldn't load the necessary resources. This usually happens when you are offline or a network restriction is blocking our library.
             <br/><br/>
             <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-400 font-mono">{initError}</span>
           </p>
           <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 hover:shadow-lg transition-all transform hover:-translate-y-1">
              Retry Connection
           </button>
        </div>
      </div>
    );
  }

  if (!isDbReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl animate-bounce flex items-center justify-center shadow-xl shadow-indigo-200">
             <i className="fas fa-bolt text-white text-4xl"></i>
          </div>
          <p className="text-lg font-bold text-slate-500 tracking-tight">Waking up Lumi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <Sidebar 
        sessions={sessions} 
        currentId={currentSessionId} 
        activeView={currentView}
        onSelect={handleSidebarSelect}
        onNew={createNewSession} 
        onDelete={handleDeleteSession}
        onOpenKB={() => { setCurrentView('kb'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
        isOpen={isSidebarOpen} 
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <main className="flex-1 relative flex flex-col overflow-hidden bg-white z-10 my-0 md:my-2 md:mr-2 rounded-none md:rounded-[30px] border-0 md:border border-slate-100 shadow-xl">
        {currentView === 'kb' ? (
           <KBManager 
             knowledgeBases={knowledgeBases}
             onAddKB={handleAddKB}
             onDeleteKB={handleDeleteKB}
             onUploadToFile={handleUploadToFile}
             onDeleteFile={handleDeleteFile}
             isSidebarOpen={isSidebarOpen}
             onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
           />
        ) : (
          currentSession ? (
            <ChatInterface 
              session={currentSession}
              knowledgeBases={knowledgeBases}
              onSendMessage={sendMessage}
              onUpdateSettings={(settings) => {
                setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
                  ...s, 
                  settings: { ...s.settings, ...settings } 
                } : s));
              }}
              isTyping={isTyping}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(true)}
              onPreviewCitation={setPreviewCitation}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                 <i className="fas fa-comment-dots text-4xl text-slate-300"></i>
              </div>
              <p className="font-bold text-lg">Select a conversation to start</p>
            </div>
          )
        )}
      </main>
      
      {previewCitation && (
        <CitationSidebar 
          url={previewCitation.uri}
          title={previewCitation.title}
          onClose={() => setPreviewCitation(null)}
        />
      )}
    </div>
  );
};

export default App;
