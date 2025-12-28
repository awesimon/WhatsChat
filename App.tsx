
import React, { useState, useEffect, useCallback } from 'react';
import { ChatSession, ChatMessage, Role, FileMetadata, KnowledgeBase } from './types';
import { storageService } from './services/storage';
import { GeminiService } from './services/gemini';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import KBManager from './components/KBManager';
import CitationSidebar from './components/CitationSidebar';

const geminiService = new GeminiService();

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isKBOpen, setIsKBOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  
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
      } catch (e) {
        console.error("Initialization error:", e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isDbReady && sessions.length > 0) {
      storageService.saveSessions(sessions);
    }
  }, [sessions, isDbReady]);

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      lastUpdated: Date.now(),
      settings: { useReasoning: true, useWebSearch: true, useMaps: false }
    };
    await storageService.saveSessions([newSession]);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
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
          content: "I'm having a little trouble connecting right now. Can we try that again?"
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

  const handleDeleteSession = async (id: string) => {
    await storageService.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(sessions.find(s => s.id !== id)?.id || null);
    }
  };

  if (!isDbReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fcfcfc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-teal-500 rounded-2xl animate-bounce flex items-center justify-center shadow-lg">
             <i className="fas fa-sparkles text-white text-2xl"></i>
          </div>
          <p className="text-sm font-medium text-slate-500">Waking up Lumi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#fcfcfc] text-slate-800 overflow-hidden font-sans">
      <Sidebar 
        sessions={sessions} 
        currentId={currentSessionId} 
        onSelect={setCurrentSessionId}
        onNew={createNewSession} 
        onDelete={handleDeleteSession}
        onOpenKB={() => setIsKBOpen(true)} 
        isOpen={isSidebarOpen} 
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <main className="flex-1 relative flex flex-col overflow-hidden bg-white z-10 my-0 md:my-2 md:mr-2 rounded-none md:rounded-[30px] border-0 md:border border-slate-100 shadow-xl">
        {currentSession ? (
          <ChatInterface 
            session={currentSession}
            knowledgeBases={knowledgeBases}
            onSendMessage={sendMessage}
            onUpdateSettings={(settings) => {
              setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
                ...s, 
                ...settings, 
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
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
               <i className="fas fa-comment-dots text-3xl text-slate-300"></i>
            </div>
            <p className="font-medium">Select a conversation to start</p>
          </div>
        )}
      </main>
      
      {previewCitation && (
        <CitationSidebar 
          url={previewCitation.uri}
          title={previewCitation.title}
          onClose={() => setPreviewCitation(null)}
        />
      )}

      {isKBOpen && (
        <KBManager 
          knowledgeBases={knowledgeBases}
          onAddKB={handleAddKB}
          onDeleteKB={handleDeleteKB}
          onUploadToFile={handleUploadToFile}
          onClose={() => setIsKBOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
