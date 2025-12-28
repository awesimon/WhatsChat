
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
    <div className={`sidebar-transition h-full flex flex-col bg-[#f8fafc] border-r border-slate-200/60 shrink-0 z-40 relative ${isOpen ? 'w-[280px]' : 'w-0 overflow-hidden'}`}>
      <div className="min-w-[280px] flex flex-col h-full">
        {/* Header with Logo & Toggle */}
        <div className="px-6 pt-7 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
               <i className="fas fa-sparkles text-[13px]"></i>
             </div>
             <span className="font-extrabold text-[15px] tracking-tight text-slate-800">Gemini Pro</span>
          </div>
          <button 
            onClick={toggle} 
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-all active:scale-90"
            title="Collapse Sidebar"
          >
            <i className="fas fa-sidebar text-base"></i>
          </button>
        </div>

        {/* Primary Action - Centered & Sized */}
        <div className="px-6 mb-6">
          <button 
            onClick={onNew} 
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 text-blue-600 font-bold py-3 rounded-2xl transition-all shadow-sm active:scale-[0.97]"
          >
            <i className="fas fa-plus text-[11px]"></i>
            <span className="text-[13px]">New Chat</span>
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5 custom-scrollbar">
          <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-1">Timeline</div>
          {sessions.map((session) => (
            <div 
              key={session.id}
              className={`group relative flex items-center p-3 px-3.5 rounded-xl cursor-pointer transition-all duration-200 ${
                currentId === session.id 
                  ? 'bg-white shadow-sm ring-1 ring-slate-200 text-blue-600' 
                  : 'hover:bg-slate-200/40 text-slate-600'
              }`}
              onClick={() => onSelect(session.id)}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-3.5 shrink-0 ${currentId === session.id ? 'bg-blue-500' : 'bg-transparent'}`}></div>
              <span className={`truncate flex-1 text-[13px] tracking-tight ${currentId === session.id ? 'font-bold' : 'font-semibold'}`}>
                {session.title}
              </span>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 transition-all ml-1 rounded-lg hover:bg-rose-50"
                title="Delete"
              >
                <i className="fas fa-trash-can text-[10px]"></i>
              </button>
            </div>
          ))}
          
          {sessions.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center opacity-10 grayscale">
              <i className="fas fa-inbox text-3xl mb-3"></i>
              <p className="text-[10px] font-black uppercase tracking-widest">No Sessions</p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200/40 mt-auto">
          <SidebarNavButton icon="fa-folder-tree" label="Knowledge" onClick={onOpenKB} highlight />
          <SidebarNavButton icon="fa-gear" label="Settings" onClick={() => {}} />
          
          <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center gap-3 px-2">
             <div className="w-7 h-7 rounded-full bg-slate-200 border border-white shadow-sm flex items-center justify-center text-slate-400 text-[10px]">
                <i className="fas fa-user"></i>
             </div>
             <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-700">Sandbox Mode</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Pro Developer</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SidebarNavButton: React.FC<{ icon: string; label: string; onClick: () => void; highlight?: boolean }> = ({ icon, label, onClick, highlight }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-3.5 p-2.5 px-3 rounded-xl text-[13px] font-bold transition-all group text-slate-600 hover:bg-white hover:shadow-sm"
  >
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
      highlight ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
    }`}>
      <i className={`fas ${icon} text-[12px]`}></i>
    </div>
    {label}
  </button>
);

export default Sidebar;
