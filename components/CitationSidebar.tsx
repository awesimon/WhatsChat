
import React, { useState } from 'react';

interface CitationSidebarProps {
  url: string;
  title: string;
  onClose: () => void;
}

const CitationSidebar: React.FC<CitationSidebarProps> = ({ url, title, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-[400px] h-full bg-white border-l border-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative z-40 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur">
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Source Preview</div>
          <h3 className="font-bold text-slate-800 truncate" title={title}>{title}</h3>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:text-teal-700 truncate block mt-0.5">
            <i className="fas fa-external-link-alt mr-1"></i> {new URL(url).hostname}
          </a>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-slate-50">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <i className="fas fa-circle-notch fa-spin text-2xl"></i>
          </div>
        )}
        <iframe 
          src={url} 
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Citation Preview"
        />
        {/* Overlay for blocked iframes (fallback hint) */}
        <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-lg text-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
           <p className="text-xs text-slate-500 mb-2">If the content doesn't load, it might be blocked by the website.</p>
        </div>
      </div>
    </div>
  );
};

export default CitationSidebar;
