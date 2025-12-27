
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

  useEffect(() => {
    const savedSessions = storageService.getSessions();
    const savedKB = localStorage.getItem('gemini_knowledge_bases');
    if (savedSessions.length > 0) {
      setSessions(savedSessions);
      setCurrentSessionId(savedSessions[0].id);
    } else {
      createNewSession();
    }
    if (savedKB) setKnowledgeBases(JSON.parse(savedKB));
  }, []);

  useEffect(() => {
    storageService.saveSessions(sessions);
    localStorage.setItem('gemini_knowledge_bases', JSON.stringify(knowledgeBases));
  }, [sessions, knowledgeBases]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New chat',
      messages: [],
      lastUpdated: Date.now(),
      settings: { useReasoning: false, useWebSearch: true, useMaps: false }
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const sendMessage = useCallback(async (text: string, attachments: FileMetadata[], settings: any) => {
    if (!currentSessionId) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: Role.USER,
      content: text,
      timestamp: Date.now(),
      attachments
    };

    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, userMessage], title: s.messages.length === 0 ? text.slice(0, 30) : s.title } : s));
    setIsTyping(true);

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = { id: assistantId, role: Role.ASSISTANT, content: '', thought: '', timestamp: Date.now() };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, assistantMessage] } : s));

    try {
      const activeKB = knowledgeBases.find(kb => kb.id === currentSession?.activeKBId);
      const kbFiles = activeKB ? activeKB.files : [];
      
      await geminiService.generateStream(
        { ...currentSession!, messages: [...currentSession!.messages, userMessage], settings },
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
              ...m, toolInvocations: [...(m.toolInvocations || []), { name: tool, args }]
            } : m)
          } : s));
        }
      );
    } catch (e: any) {
      console.error(e);
    } finally { setIsTyping(false); }
  }, [currentSessionId, knowledgeBases, currentSession]);

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      <Sidebar 
        sessions={sessions} currentId={currentSessionId} onSelect={setCurrentSessionId}
        onNew={createNewSession} onDelete={(id) => setSessions(prev => prev.filter(s => s.id !== id))}
        onOpenKB={() => setIsKBOpen(true)} isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {currentSession ? (
          <ChatInterface 
            session={currentSession}
            knowledgeBases={knowledgeBases}
            onSendMessage={sendMessage}
            onUpdateSettings={(settings) => setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, ...settings, settings } : s))}
            isTyping={isTyping}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">Select or start a new chat</div>
        )}
      </main>

      {isKBOpen && (
        <KBManager 
          knowledgeBases={knowledgeBases}
          onAddKB={(name) => setKnowledgeBases(prev => [...prev, { id: crypto.randomUUID(), name, description: '', files: [], createdAt: Date.now() }])}
          onDeleteKB={(id) => setKnowledgeBases(prev => prev.filter(kb => kb.id !== id))}
          onUploadToFile={(id, files) => setKnowledgeBases(prev => prev.map(kb => kb.id === id ? { ...kb, files: [...kb.files, ...files] } : kb))}
          onClose={() => setIsKBOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
