
import React from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenKB: () => void;
  isOpen: boolean;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sessions, currentId, onSelect, onNew, onDelete, onOpenKB, isOpen, toggle }) => {
  return (
    <div className={`transition-all duration-300 h-full flex flex-col bg-[#fcfcfc] shrink-0 relative ${isOpen ? 'w-[280px]' : 'w-0 overflow-hidden'}`}>
      <div className="min-w-[280px] flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-100">
                <i className="fas fa-sparkles text-white text-sm"></i>
             </div>
             <span className="font-bold text-xl text-slate-800 tracking-tight">Lumi</span>
          </div>
          <button 
            onClick={toggle} 
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
        </div>

        {/* Action Button */}
        <div className="px-6 py-4">
          <button 
            onClick={onNew} 
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-teal-300 text-teal-700 font-bold py-3.5 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95 group"
          >
            <i className="fas fa-plus text-sm group-hover:rotate-90 transition-transform"></i>
            <span className="text-sm">New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
          <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Your Chats</div>
          {sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`group flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                currentId === session.id 
                  ? 'bg-teal-50 text-teal-800 font-semibold' 
                  : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors ${
                currentId === session.id ? 'bg-white text-teal-600 shadow-sm' : 'bg-transparent text-slate-400'
              }`}>
                <i className="fas fa-comment-alt text-xs"></i>
              </div>
              <span className="truncate flex-1 text-sm">
                {session.title}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 mx-4 mb-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={onOpenKB}
            className="w-full flex items-center gap-3 p-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <i className="fas fa-book-open text-xs"></i>
            </div>
            <span>Knowledge Base</span>
          </button>
          
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 px-2">
             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <i className="fas fa-user"></i>
             </div>
             <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700">Guest User</span>
                <span className="text-[10px] text-slate-400">Pro Plan Active</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
