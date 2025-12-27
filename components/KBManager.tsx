
import React, { useRef } from 'react';
import { KnowledgeBase, FileMetadata } from '../types';

interface KBManagerProps {
  knowledgeBases: KnowledgeBase[];
  onAddKB: (name: string) => void;
  onDeleteKB: (id: string) => void;
  onUploadToFile: (kbId: string, files: FileMetadata[]) => void;
  onClose: () => void;
}

const KBManager: React.FC<KBManagerProps> = ({ knowledgeBases, onAddKB, onDeleteKB, onUploadToFile, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentKBRef = useRef<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentKBRef.current) return;
    const files = Array.from(e.target.files || []);
    
    Promise.all(files.map(file => new Promise<FileMetadata>((resolve) => {
      const reader = new FileReader();
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md');
      reader.onload = (ev) => {
        const data = (ev.target?.result as string).split(',')[1];
        if (isText) {
          const textReader = new FileReader();
          textReader.onload = (tev) => resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, data, content: tev.target?.result as string });
          textReader.readAsText(file);
        } else {
          resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, data });
        }
      };
      reader.readAsDataURL(file);
    }))).then(results => onUploadToFile(currentKBRef.current!, results as FileMetadata[]));
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <i className="fas fa-layer-group text-blue-600"></i> Knowledge Library
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <button 
            onClick={() => { const name = prompt('Library Name?'); if(name) onAddKB(name); }}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-8 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all flex flex-col items-center gap-2"
          >
            <i className="fas fa-plus-circle text-2xl"></i>
            <span className="font-bold">Create New Knowledge Base</span>
          </button>

          {knowledgeBases.map(kb => (
            <div key={kb.id} className="border rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{kb.name}</h3>
                  <p className="text-xs text-gray-500">{kb.files.length} assets indexed</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { currentKBRef.current = kb.id; fileInputRef.current?.click(); }}
                    className="p-2 px-4 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    Add Files
                  </button>
                  <button onClick={() => onDeleteKB(kb.id)} className="p-2 text-gray-400 hover:text-rose-500"><i className="fas fa-trash-alt"></i></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {kb.files.map(f => (
                  <div key={f.id} className="bg-gray-100 px-3 py-1.5 rounded-full text-[10px] font-medium flex items-center gap-2">
                    <i className="fas fa-file-alt opacity-50"></i> {f.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
      </div>
    </div>
  );
};

export default KBManager;
