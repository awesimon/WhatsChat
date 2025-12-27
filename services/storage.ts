
import { ChatSession } from '../types';

const STORAGE_KEY = 'gemini_chat_sessions';

export const storageService = {
  saveSessions: (sessions: ChatSession[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  },

  getSessions: (): ChatSession[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  clearSessions: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
