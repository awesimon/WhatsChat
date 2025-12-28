
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
    <div className={`${isOpen ? 'w-72' : 'w-0'} transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) bg-[#f0f4f9] flex flex-col overflow-hidden shrink-0 border-r relative`}>
      <div className="p-4 pt-6 pb-4 flex items-center justify-between min-w-[288px]">
        <button onClick={onNew} className="flex-1 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 hover:shadow-md text-[#1a73e8] font-semibold p-3 px-6 rounded-2xl transition-all shadow-sm active:scale-95 border border-transparent hover:border-blue-100 mr-2">
          <i className="fas fa-plus"></i> New chat
        </button>
        <button 
          onClick={toggle} 
          className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-xl text-gray-500 hover:text-gray-800 transition-all active:scale-90"
          title="Collapse sidebar"
        >
          <i className="fas fa-bars-staggered text-lg"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar min-w-[288px]">
        <div className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Recent</div>
        {sessions.map((session, idx) => (
          <div 
            key={session.id}
            className={`group flex items-center p-3.5 px-4 rounded-xl cursor-pointer transition-all duration-300 animate-message ${
              currentId === session.id 
                ? 'bg-white text-[#1a73e8] font-bold shadow-sm ring-1 ring-blue-50 border-transparent' 
                : 'hover:bg-black/5 text-gray-600 border-transparent'
            }`}
            style={{ animationDelay: `${idx * 0.03}s` }}
            onClick={() => onSelect(session.id)}
          >
            <i className={`fas fa-message text-xs mr-3 transition-opacity ${currentId === session.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'}`}></i>
            <span className="truncate flex-1 text-sm">{session.title}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            >
              <i className="fas fa-trash-alt text-[10px]"></i>
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="px-4 py-10 text-center opacity-30 italic text-xs text-gray-500">No recent chats</div>
        )}
      </div>

      <div className="p-4 space-y-1.5 border-t border-gray-200 min-w-[288px] bg-gray-50/50 backdrop-blur-sm">
        <button 
          onClick={onOpenKB}
          className="w-full flex items-center gap-4 p-3.5 px-4 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-blue-50 text-gray-600 text-sm font-bold transition-all group"
        >
          <i className="fas fa-layer-group text-blue-500 group-hover:scale-110 transition-transform"></i> Knowledge Library
        </button>
        <button className="w-full flex items-center gap-4 p-3.5 px-4 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-blue-50 text-gray-600 text-sm font-bold transition-all group">
          <i className="fas fa-clock-rotate-left text-gray-400 group-hover:rotate-[-45deg] transition-transform"></i> History
        </button>
        <button className="w-full flex items-center gap-4 p-3.5 px-4 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-blue-50 text-gray-600 text-sm font-bold transition-all group">
          <i className="fas fa-gear text-gray-400 group-hover:rotate-90 transition-transform"></i> Settings
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
