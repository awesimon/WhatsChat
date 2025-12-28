
import React, { useRef, useState } from 'react';
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
  const [newKBName, setNewKBName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileMetadata[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentKBRef.current) return;
    const files = Array.from(e.target.files || []) as File[];
    
    Promise.all(files.map((file: File) => new Promise<FileMetadata>((resolve) => {
      const reader = new FileReader();
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt');
      
      reader.onload = (ev) => {
        const data = (ev.target?.result as string).split(',')[1];
        if (isText) {
          const textReader = new FileReader();
          textReader.onload = (tev) => resolve({ 
            id: crypto.randomUUID(), 
            name: file.name, 
            type: file.type, 
            size: file.size, 
            data, 
            content: tev.target?.result as string 
          });
          textReader.readAsText(file);
        } else {
          resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, data });
        }
      };
      reader.readAsDataURL(file);
    }))).then(results => {
      setPendingFiles(results);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const confirmUpload = () => {
    if (currentKBRef.current && pendingFiles.length > 0) {
      onUploadToFile(currentKBRef.current, pendingFiles);
      setPendingFiles([]);
      currentKBRef.current = null;
    }
  };

  const handleCreateKB = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKBName.trim()) {
      onAddKB(newKBName.trim());
      setNewKBName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative border border-white/50">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                <i className="fas fa-book-open text-xl"></i>
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-800">Knowledge Library</h2>
               <p className="text-sm text-slate-500">Manage your documents and context</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/50">
          {/* File Upload Overlay */}
          {pendingFiles.length > 0 && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur z-20 p-10 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Review Files</h3>
                  <p className="text-slate-500">Ready to add {pendingFiles.length} items to your library</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPendingFiles([])}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmUpload}
                    className="px-6 py-3 rounded-xl font-bold bg-teal-600 text-white shadow-lg shadow-teal-200 hover:bg-teal-700 hover:-translate-y-0.5 transition-all"
                  >
                    Upload Files
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {pendingFiles.map(file => (
                  <div key={file.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-teal-500 shadow-sm">
                      <i className={`fas ${file.type.startsWith('image/') ? 'fa-image' : 'fa-file-alt'}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-700 truncate">{file.name}</div>
                      <div className="text-xs text-slate-400 uppercase font-bold mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isCreating ? (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full border-2 border-dashed border-slate-200 rounded-3xl py-12 text-slate-400 hover:border-teal-400 hover:bg-teal-50/50 hover:text-teal-600 transition-all flex flex-col items-center gap-3 group bg-white"
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                <i className="fas fa-plus text-xl"></i>
              </div>
              <span className="font-bold text-sm">Create New Collection</span>
            </button>
          ) : (
            <form onSubmit={handleCreateKB} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm animate-in fade-in">
              <label className="block text-sm font-bold text-slate-700 mb-2">Collection Name</label>
              <input 
                autoFocus
                type="text"
                value={newKBName}
                onChange={(e) => setNewKBName(e.target.value)}
                placeholder="e.g., Project Alpha Research"
                className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-800 font-medium focus:ring-2 focus:ring-teal-100 mb-6 placeholder-slate-400"
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-teal-600 text-white font-bold py-3.5 rounded-xl hover:bg-teal-700 transition-colors">Create Collection</button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-8 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {knowledgeBases.map(kb => (
              <div key={kb.id} className="group bg-white p-6 rounded-[1.5rem] shadow-sm hover:shadow-xl hover:shadow-teal-100/50 border border-slate-100 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-teal-600 transition-colors">{kb.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">{kb.files.length} Documents</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { currentKBRef.current = kb.id; fileInputRef.current?.click(); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                      title="Add Files"
                    >
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                    <button 
                      onClick={() => onDeleteKB(kb.id)} 
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                      title="Delete"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {kb.files.slice(0, 3).map(f => (
                    <div key={f.id} className="bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-100 truncate max-w-[120px]">
                      {f.name}
                    </div>
                  ))}
                  {kb.files.length > 3 && (
                    <div className="bg-teal-50 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-600">
                      +{kb.files.length - 3} more
                    </div>
                  )}
                  {kb.files.length === 0 && (
                    <div className="text-xs text-slate-400 italic py-1">No documents yet</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
      </div>
    </div>
  );
};

export default KBManager;
