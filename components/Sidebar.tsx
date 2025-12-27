
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
    <div className={`${isOpen ? 'w-72' : 'w-0'} transition-all duration-300 ease-in-out bg-[#f0f4f9] flex flex-col overflow-hidden shrink-0 border-r`}>
      <div className="p-6 flex items-center justify-between">
        <button onClick={onNew} className="flex items-center gap-3 bg-white hover:shadow-md text-[#1a73e8] font-semibold p-3 px-6 rounded-full transition-all shadow-sm active:scale-95">
          <i className="fas fa-plus"></i> New chat
        </button>
        <button onClick={toggle} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full text-gray-600"><i className="fas fa-bars"></i></button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Recent</div>
        {sessions.map(session => (
          <div 
            key={session.id}
            className={`group flex items-center p-3 px-4 rounded-full cursor-pointer transition-all ${
              currentId === session.id ? 'bg-[#e8f0fe] text-[#1a73e8] font-medium' : 'hover:bg-black/5 text-gray-700'
            }`}
            onClick={() => onSelect(session.id)}
          >
            <i className="fas fa-message text-xs mr-3 opacity-60"></i>
            <span className="truncate flex-1 text-sm">{session.title}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 transition-opacity"
            >
              <i className="fas fa-ellipsis-v text-[10px]"></i>
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 space-y-1 border-t border-gray-200">
        <button 
          onClick={onOpenKB}
          className="w-full flex items-center gap-4 p-3 px-4 rounded-full hover:bg-black/5 text-gray-700 text-sm font-medium transition-colors"
        >
          <i className="fas fa-layer-group text-blue-600"></i> Knowledge Library
        </button>
        <button className="w-full flex items-center gap-4 p-3 px-4 rounded-full hover:bg-black/5 text-gray-700 text-sm font-medium transition-colors">
          <i className="fas fa-clock-rotate-left"></i> History
        </button>
        <button className="w-full flex items-center gap-4 p-3 px-4 rounded-full hover:bg-black/5 text-gray-700 text-sm font-medium transition-colors">
          <i className="fas fa-gear"></i> Settings
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
