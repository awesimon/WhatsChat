
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-3 text-gray-900">
              <i className="fas fa-layer-group text-blue-600"></i> Knowledge Library
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Manage your document indices for grounded AI responses.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative">
          {/* File Preview Overlay */}
          {pendingFiles.length > 0 && (
            <div className="absolute inset-0 bg-white z-20 p-8 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Preview Assets</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Reviewing {pendingFiles.length} files before indexing</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPendingFiles([])}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={confirmUpload}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                  >
                    Confirm & Index
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {pendingFiles.map(file => (
                  <div key={file.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <i className={`fas ${file.type.startsWith('image/') ? 'fa-image' : 'fa-file-alt'}`}></i>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-800">{file.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown Type'}
                        </div>
                      </div>
                    </div>
                    {file.content && (
                      <div className="bg-white border border-gray-100 rounded-xl p-3 max-h-40 overflow-y-auto text-xs font-mono text-gray-600 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                        {file.content}
                      </div>
                    )}
                    {!file.content && file.type.startsWith('image/') && (
                      <div className="bg-white border border-gray-100 rounded-xl p-2 flex justify-center">
                        <img src={`data:${file.type};base64,${file.data}`} alt="preview" className="max-h-32 rounded-lg object-contain" />
                      </div>
                    )}
                    {!file.content && !file.type.startsWith('image/') && (
                      <div className="text-[10px] text-gray-400 italic text-center py-2">Binary file - Content preview unavailable</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isCreating ? (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full border-2 border-dashed border-gray-200 rounded-3xl py-10 text-gray-400 hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-600 transition-all flex flex-col items-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <i className="fas fa-plus text-xl"></i>
              </div>
              <span className="font-bold text-sm tracking-tight">Create New Knowledge Base</span>
            </button>
          ) : (
            <form onSubmit={handleCreateKB} className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 animate-in slide-in-from-top-4 duration-300">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2 ml-1">Library Name</label>
              <input 
                autoFocus
                type="text"
                value={newKBName}
                onChange={(e) => setNewKBName(e.target.value)}
                placeholder="e.g. Legal Documents 2024"
                className="w-full bg-white border border-blue-200 rounded-2xl py-4 px-5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 shadow-sm"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95">Create Library</button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-6 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
              </div>
            </form>
          )}

          <div className="grid gap-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Active Indices ({knowledgeBases.length})</h3>
            {knowledgeBases.length === 0 && !isCreating && (
              <div className="text-center py-10 opacity-30 italic text-sm text-gray-500">No libraries created yet.</div>
            )}
            {knowledgeBases.map(kb => (
              <div key={kb.id} className="group border border-gray-100 rounded-[28px] p-6 hover:shadow-xl hover:border-blue-100 transition-all bg-white relative overflow-hidden">
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div>
                    <h3 className="font-black text-lg text-gray-800 group-hover:text-blue-700 transition-colors">{kb.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{kb.files.length} indexed assets</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { currentKBRef.current = kb.id; fileInputRef.current?.click(); }}
                      className="p-2 px-5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                      <i className="fas fa-cloud-upload-alt"></i> Add Assets
                    </button>
                    <button 
                      onClick={() => onDeleteKB(kb.id)} 
                      className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <i className="fas fa-trash-alt text-sm"></i>
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 relative z-10">
                  {kb.files.map(f => (
                    <div key={f.id} className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-[10px] font-bold text-gray-600 flex items-center gap-2 hover:bg-white hover:border-blue-200 transition-all cursor-default">
                      <i className="fas fa-file-alt text-blue-400/70"></i> {f.name}
                    </div>
                  ))}
                  {kb.files.length === 0 && (
                    <div className="text-[10px] text-gray-400 italic">No files in this library.</div>
                  )}
                </div>
                
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                  <i className="fas fa-folder-open text-8xl"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
        
        <div className="p-6 bg-gray-50 border-t flex justify-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
          Knowledge Base Management Protocol v2.1
        </div>
      </div>
    </div>
  );
};

export default KBManager;
