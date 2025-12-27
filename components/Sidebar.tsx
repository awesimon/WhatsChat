
import React from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sessions, currentId, onSelect, onNew, onDelete, isOpen, toggle }) => {
  return (
    <div className={`${isOpen ? 'w-80' : 'w-0'} transition-all duration-500 ease-in-out bg-[#0a0a0a] border-r border-white/5 flex flex-col overflow-hidden shrink-0 shadow-2xl z-20`}>
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <i className="fas fa-sparkles text-white text-xs"></i>
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Gemini Pro</span>
        </h1>
        <button onClick={toggle} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
          <i className="fas fa-sidebar"></i>
        </button>
      </div>

      <div className="px-4 mb-6">
        <button 
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all border border-white/5 group active:scale-[0.98]"
        >
          <i className="fas fa-plus text-violet-400 group-hover:rotate-90 transition-transform duration-300"></i> New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar">
        <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-600">History</div>
        {sessions.map(session => (
          <div 
            key={session.id}
            className={`group relative flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 ${
              currentId === session.id 
                ? 'bg-violet-500/10 text-violet-100 border border-violet-500/20' 
                : 'hover:bg-white/[0.03] text-gray-400 border border-transparent'
            }`}
            onClick={() => onSelect(session.id)}
          >
            <div className={`w-1.5 h-1.5 rounded-full mr-3 transition-all ${currentId === session.id ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'bg-gray-700'}`}></div>
            <span className="truncate flex-1 text-sm font-medium">{session.title}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-rose-400 transition-all transform hover:scale-110"
            >
              <i className="fas fa-trash-alt text-xs"></i>
            </button>
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-white/5 bg-[#080808] flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center">
          <i className="fas fa-user text-[10px] text-gray-400"></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">Premium User</p>
          <p className="text-[10px] text-gray-500 truncate">Settings & Profile</p>
        </div>
        <i className="fas fa-cog text-gray-600 hover:text-white cursor-pointer transition-colors"></i>
      </div>
    </div>
  );
};

export default Sidebar;
