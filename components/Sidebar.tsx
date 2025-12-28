
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

const EchoLogo = () => (
  <div className="relative w-9 h-9 flex items-center justify-center">
    {/* Outer Ring */}
    <div className="absolute inset-0 border-[1.5px] border-sky-400/30 rounded-full echo-ring-outer">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sky-400 rounded-full shadow-[0_0_8px_#38bdf8]"></div>
    </div>
    {/* Inner Ring */}
    <div className="absolute inset-2 border-[1px] border-sky-300/40 rounded-full echo-ring-inner">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-300 rounded-full"></div>
    </div>
    {/* Core */}
    <div className="w-2.5 h-2.5 bg-sky-500 rounded-full echo-core-pulse shadow-[0_0_12px_#0ea5e9]"></div>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ sessions, currentId, onSelect, onNew, onDelete, onOpenKB, isOpen, toggle }) => {
  return (
    <div className={`sidebar-transition h-full flex flex-col bg-[#f8fafc] border-r border-slate-200/60 shrink-0 z-40 relative ${isOpen ? 'w-[280px]' : 'w-0 overflow-hidden'}`}>
      <div className="min-w-[280px] flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-8 pb-7 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <EchoLogo />
             <span className="font-extrabold text-[17px] tracking-[-0.03em] text-slate-800">ECHO</span>
          </div>
          <button 
            onClick={toggle} 
            className="w-9 h-9 flex items-center justify-center hover:bg-slate-200/50 rounded-xl text-slate-400 hover:text-slate-600 transition-all active:scale-90"
          >
            <i className="fas fa-sidebar text-lg"></i>
          </button>
        </div>

        {/* Primary Action */}
        <div className="px-6 mb-8">
          <button 
            onClick={onNew} 
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 text-sky-600 font-bold py-3.5 rounded-[20px] transition-all shadow-sm active:scale-[0.97]"
          >
            <i className="fas fa-plus text-[11px]"></i>
            <span className="text-[13.5px]">Initiate Session</span>
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 opacity-70">Diagnostic Logs</div>
          {sessions.map((session) => (
            <div 
              key={session.id}
              className={`group relative flex items-center p-3.5 px-4 rounded-[18px] cursor-pointer transition-all duration-200 ${
                currentId === session.id 
                  ? 'bg-white shadow-md ring-1 ring-slate-200/50 text-sky-600' 
                  : 'hover:bg-slate-200/40 text-slate-600'
              }`}
              onClick={() => onSelect(session.id)}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-4 shrink-0 transition-all ${currentId === session.id ? 'bg-sky-500 scale-125 shadow-[0_0_8px_#0ea5e9]' : 'bg-slate-300'}`}></div>
              <span className={`truncate flex-1 text-[13.5px] tracking-tight ${currentId === session.id ? 'font-bold' : 'font-semibold'}`}>
                {session.title}
              </span>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all ml-1 rounded-lg hover:bg-rose-50"
                title="Purge"
              >
                <i className="fas fa-trash-can text-[11px]"></i>
              </button>
            </div>
          ))}
          
          {sessions.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center opacity-10">
              <i className="fas fa-microchip text-4xl mb-3"></i>
              <p className="text-[10px] font-black uppercase tracking-widest">System Idle</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-100/30 border-t border-slate-200/40 mt-auto">
          <SidebarNavButton icon="fa-brain-circuit" label="Neural Hub" onClick={onOpenKB} highlight />
          <SidebarNavButton icon="fa-sliders" label="Core Settings" onClick={() => {}} />
          
          <div className="mt-5 pt-5 border-t border-slate-200/60 flex items-center gap-3.5 px-2">
             <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 text-[11px]">
                <i className="fas fa-user-robot"></i>
             </div>
             <div className="flex flex-col">
                <span className="text-[11.5px] font-bold text-slate-700">Protocol Beta</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Link</span>
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
    className="w-full flex items-center gap-4 p-3 px-4 rounded-xl text-[13.5px] font-bold transition-all group text-slate-600 hover:bg-white hover:shadow-sm active:scale-95"
  >
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 ${
      highlight ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-slate-100 text-slate-400'
    }`}>
      <i className={`fas ${icon} text-[13px]`}></i>
    </div>
    {label}
  </button>
);

export default Sidebar;
