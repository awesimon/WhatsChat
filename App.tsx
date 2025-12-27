
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatSession, ChatMessage, Role, FileMetadata } from './types';
import { storageService } from './services/storage';
import { GeminiService } from './services/gemini';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';

// Instantiate once; the service now creates the GoogleGenAI instance per-request
const geminiService = new GeminiService();

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const saved = storageService.getSessions();
    if (saved.length > 0) {
      setSessions(saved);
      setCurrentSessionId(saved[0].id);
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      storageService.saveSessions(sessions);
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      lastUpdated: Date.now(),
      knowledgeBase: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const sendMessage = useCallback(async (text: string, attachments: FileMetadata[]) => {
    if (!currentSessionId) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: Role.USER,
      content: text,
      timestamp: Date.now(),
      attachments
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage],
          lastUpdated: Date.now(),
          title: s.messages.length === 0 ? text.substring(0, 30) + (text.length > 30 ? '...' : '') : s.title
        };
      }
      return s;
    }));

    setIsTyping(true);

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: Role.ASSISTANT,
      content: '',
      thought: '',
      timestamp: Date.now(),
      toolInvocations: []
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, assistantMessage] };
      }
      return s;
    }));

    try {
      const updatedSession = sessions.find(s => s.id === currentSessionId)!;
      // Use the full message objects for mapping in geminiService
      const history = [...updatedSession.messages, userMessage];
      const kb = updatedSession.knowledgeBase;

      await geminiService.generateStream(
        history,
        kb,
        (text, thought, sources) => {
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                messages: s.messages.map(m => {
                  if (m.id === assistantId) {
                    return {
                      ...m,
                      content: text,
                      thought: thought,
                      groundingSources: sources?.map((src: any) => ({
                        title: src.web?.title || src.maps?.title || 'Source',
                        uri: src.web?.uri || src.maps?.uri || '#'
                      }))
                    };
                  }
                  return m;
                })
              };
            }
            return s;
          }));
        },
        (tool, args) => {
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                messages: s.messages.map(m => {
                  if (m.id === assistantId) {
                    const toolInvs = m.toolInvocations || [];
                    return {
                      ...m,
                      toolInvocations: [...toolInvs, { name: tool, args }]
                    };
                  }
                  return m;
                })
              };
            }
            return s;
          }));
        }
      );
    } catch (error: any) {
      console.error("Chat generation failed:", error);
      // Update assistant message with error information
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: s.messages.map(m => {
              if (m.id === assistantId) {
                return {
                  ...m,
                  content: `Error: ${error.message || "An unexpected error occurred while communicating with the AI."}. Please try again.`
                };
              }
              return m;
            })
          };
        }
        return s;
      }));
    } finally {
      setIsTyping(false);
    }
  }, [currentSessionId, sessions]);

  const addToKnowledgeBase = (files: FileMetadata[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, knowledgeBase: [...s.knowledgeBase, ...files] };
      }
      return s;
    }));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: 'New Conversation',
          messages: [],
          lastUpdated: Date.now(),
          knowledgeBase: []
        };
        return [newSession];
      }
      return filtered;
    });
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar 
        sessions={sessions}
        currentId={currentSessionId}
        onSelect={setCurrentSessionId}
        onNew={createNewSession}
        onDelete={deleteSession}
        isOpen={isSidebarOpen}
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {currentSession ? (
          <ChatInterface 
            session={currentSession}
            onSendMessage={sendMessage}
            onAddToKB={addToKnowledgeBase}
            isTyping={isTyping}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-pulse">
              <i className="fas fa-robot text-6xl text-blue-500 mb-4"></i>
              <p className="text-xl text-slate-400">Select or start a new conversation</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
