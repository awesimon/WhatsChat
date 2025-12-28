
import React, { useState, useEffect, useCallback } from 'react';
import { ChatSession, ChatMessage, Role, FileMetadata, KnowledgeBase } from './types';
import { storageService } from './services/storage';
import { GeminiService } from './services/gemini';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import KBManager from './components/KBManager';

const geminiService = new GeminiService();

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isKBOpen, setIsKBOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  // Load data on mount from SQLite
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
          // Trigger default session creation only after DB is ready
          const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: 'New chat',
            messages: [],
            lastUpdated: Date.now(),
            settings: { useReasoning: false, useWebSearch: true, useMaps: false }
          };
          await storageService.saveSessions([newSession]);
          setSessions([newSession]);
          setCurrentSessionId(newSession.id);
        }
        setIsDbReady(true);
      } catch (e) {
        console.error("Failed to initialize SQLite", e);
      }
    };
    init();
  }, []);

  // Sync state to SQLite on changes
  useEffect(() => {
    if (isDbReady && sessions.length > 0) {
      storageService.saveSessions(sessions);
    }
  }, [sessions, isDbReady]);

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New chat',
      messages: [],
      lastUpdated: Date.now(),
      settings: { useReasoning: false, useWebSearch: true, useMaps: false }
    };
    await storageService.saveSessions([newSession]);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (!isSidebarOpen) setIsSidebarOpen(true);
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
      console.error("Gemini stream error:", e);
      setSessions(prev => prev.map(s => s.id === currentSessionId ? {
        ...s,
        messages: s.messages.map(m => m.id === assistantId ? {
          ...m,
          content: "Sorry, I encountered an error. Please check your network or API key."
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
      <div className="flex h-screen items-center justify-center bg-white text-blue-600">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-database text-4xl animate-pulse"></i>
          <p className="text-xs font-black uppercase tracking-widest">Waking up SQLite Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
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
      
      <main className="flex-1 relative flex flex-col overflow-hidden">
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
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 relative bg-gray-50/30">
            {!isSidebarOpen && (
              <div className="absolute top-0 left-0 p-4 w-full border-b bg-white/80 backdrop-blur-sm min-h-[64px] flex items-center">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm text-gray-500 hover:text-gray-800 transition-all active:scale-90 animate-message"
                  title="Expand sidebar"
                >
                  <i className="fas fa-bars"></i>
                </button>
              </div>
            )}
            <i className="fas fa-comment-dots text-6xl mb-4 opacity-10"></i>
            <p className="font-bold uppercase tracking-widest text-xs opacity-50">Select a conversation to begin</p>
          </div>
        )}
      </main>

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
