
import React, { useRef, useState } from 'react';
import { KnowledgeBase, FileMetadata, IndexingMethod } from '../types';

interface KBManagerProps {
  knowledgeBases: KnowledgeBase[];
  onAddKB: (name: string) => void;
  onDeleteKB: (id: string) => void;
  onUploadToFile: (kbId: string, files: FileMetadata[]) => void;
  onDeleteFile: (kbId: string, fileId: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const KBManager: React.FC<KBManagerProps> = ({ 
  knowledgeBases, 
  onAddKB, 
  onDeleteKB, 
  onUploadToFile, 
  onDeleteFile,
  isSidebarOpen, 
  onToggleSidebar 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentKBRef = useRef<string | null>(null);
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const [newKBName, setNewKBName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileMetadata[]>([]);
  // State is now an array for multiple selection
  const [indexingMethods, setIndexingMethods] = useState<IndexingMethod[]>(['vector']);

  const selectedKB = knowledgeBases.find(kb => kb.id === selectedKBId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If we are in detail view, use selectedKBId, otherwise use currentKBRef set by grid "+" button
    const targetId = selectedKBId || currentKBRef.current;
    if (!targetId) return;

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
      setIndexingMethods(['vector']); // Reset to default on new selection
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const confirmUpload = () => {
    const targetId = selectedKBId || currentKBRef.current;
    if (targetId && pendingFiles.length > 0) {
      // Ensure at least 'vector' is selected if empty
      const finalMethods: IndexingMethod[] = indexingMethods.length > 0 ? indexingMethods : ['vector'];
      const filesWithMethod = pendingFiles.map(f => ({ ...f, indexingMethod: finalMethods }));
      onUploadToFile(targetId, filesWithMethod);
      setPendingFiles([]);
      if (!selectedKBId) currentKBRef.current = null;
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

  const toggleMethod = (method: IndexingMethod) => {
    setIndexingMethods(prev => {
      if (prev.includes(method)) {
        return prev.filter(m => m !== method);
      } else {
        return [...prev, method];
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative animate-in fade-in duration-300">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur z-10 sticky top-0">
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button 
              onClick={onToggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <i className="fas fa-bars text-lg"></i>
            </button>
          )}
           
           {selectedKB ? (
             <div className="flex items-center gap-4">
               <button 
                 onClick={() => setSelectedKBId(null)}
                 className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
               >
                 <i className="fas fa-arrow-left text-lg"></i>
               </button>
               <div>
                 <div className="flex items-center gap-3">
                   <h2 className="text-xl font-bold text-slate-800">{selectedKB.name}</h2>
                   <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">Collection</span>
                 </div>
                 <p className="text-sm text-slate-500 font-medium">
                   {selectedKB.files.length} documents &middot; Created {new Date(selectedKB.createdAt).toLocaleDateString()}
                 </p>
               </div>
             </div>
           ) : (
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <i className="fas fa-book-open text-xl"></i>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Knowledge Library</h2>
                    <p className="text-sm text-slate-500 font-medium">Manage your documents and context</p>
                </div>
             </div>
           )}
        </div>
        
        {selectedKB && (
          <div className="flex gap-2">
             <button 
                onClick={() => { fileInputRef.current?.click(); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-semibold text-base"
             >
               <i className="fas fa-plus"></i> Upload Files
             </button>
             <button 
                onClick={() => { 
                  if(confirm("Are you sure you want to delete this collection?")) {
                    onDeleteKB(selectedKB.id);
                    setSelectedKBId(null);
                  }
                }}
                className="flex items-center justify-center w-11 h-11 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                title="Delete Collection"
             >
               <i className="fas fa-trash-alt text-lg"></i>
             </button>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar bg-[#f8fafc] relative">
        {/* File Upload Overlay */}
        {pendingFiles.length > 0 && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur z-20 p-8 md:p-12 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-bold text-slate-800">Review Files</h3>
                <p className="text-lg text-slate-500">Ready to add {pendingFiles.length} items to your library</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setPendingFiles([])}
                  className="px-8 py-4 rounded-xl font-bold text-lg text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmUpload}
                  className="px-8 py-4 rounded-xl font-bold text-lg bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                >
                  Confirm Upload
                </button>
              </div>
            </div>

            {/* Indexing Method Selection - Multiple Selection */}
            <div className="mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Indexing Strategy (Multi-select)</label>
                  <span className="text-sm text-slate-400">{indexingMethods.length} selected</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <button
                  onClick={() => toggleMethod('pageindex')}
                  className={`text-left px-6 py-5 rounded-2xl border-2 transition-all group relative ${indexingMethods.includes('pageindex') ? 'bg-white border-indigo-500 shadow-md shadow-indigo-50' : 'bg-white border-transparent hover:border-slate-200'}`}
                >
                  {indexingMethods.includes('pageindex') && <div className="absolute top-4 right-4 text-indigo-500"><i className="fas fa-check-circle text-lg"></i></div>}
                  <div className="font-bold text-lg text-slate-800 flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${indexingMethods.includes('pageindex') ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                       <i className="fas fa-layer-group text-lg"></i>
                    </div>
                    Page Index
                  </div>
                  <div className="text-sm text-slate-500 pl-12 leading-relaxed">Preserves page structure. Best for precise citations.</div>
                </button>
                
                <button
                  onClick={() => toggleMethod('vector')}
                  className={`text-left px-6 py-5 rounded-2xl border-2 transition-all group relative ${indexingMethods.includes('vector') ? 'bg-white border-indigo-500 shadow-md shadow-indigo-50' : 'bg-white border-transparent hover:border-slate-200'}`}
                >
                  {indexingMethods.includes('vector') && <div className="absolute top-4 right-4 text-indigo-500"><i className="fas fa-check-circle text-lg"></i></div>}
                  <div className="font-bold text-lg text-slate-800 flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${indexingMethods.includes('vector') ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                       <i className="fas fa-project-diagram text-lg"></i>
                    </div>
                    Vector Index
                  </div>
                  <div className="text-sm text-slate-500 pl-12 leading-relaxed">Semantic understanding. Best for general Q&A.</div>
                </button>

                <button
                  onClick={() => toggleMethod('fulltext')}
                  className={`text-left px-6 py-5 rounded-2xl border-2 transition-all group relative ${indexingMethods.includes('fulltext') ? 'bg-white border-indigo-500 shadow-md shadow-indigo-50' : 'bg-white border-transparent hover:border-slate-200'}`}
                >
                  {indexingMethods.includes('fulltext') && <div className="absolute top-4 right-4 text-indigo-500"><i className="fas fa-check-circle text-lg"></i></div>}
                  <div className="font-bold text-lg text-slate-800 flex items-center gap-3 mb-2">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${indexingMethods.includes('fulltext') ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                       <i className="fas fa-align-left text-lg"></i>
                    </div>
                    Full Text
                  </div>
                  <div className="text-sm text-slate-500 pl-12 leading-relaxed">Exact keyword matching. Best for specific terms.</div>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {pendingFiles.map(file => (
                <div key={file.id} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                    <i className={`fas ${file.type.startsWith('image/') ? 'fa-image' : 'fa-file-alt'} text-xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-slate-700 truncate">{file.name}</div>
                    <div className="text-sm text-slate-400 uppercase font-bold mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedKB ? (
           /* Detail View - File List */
           <div className="max-w-5xl mx-auto animate-in slide-in-from-right duration-300">
              {selectedKB.files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-folder-open text-4xl text-slate-300"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-700">Collection is empty</h3>
                  <p className="text-lg text-slate-500 mb-8 max-w-md">Upload documents, text files, or PDFs to give the AI context about this topic.</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 font-bold text-lg hover:underline"
                  >
                    Upload your first document
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-3 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <span>File Name</span>
                    <span className="mr-16">Size</span>
                  </div>
                  {selectedKB.files.map(file => (
                    <div key={file.id} className="bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl p-5 flex items-center gap-5 group transition-all hover:shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <i className={`fas ${file.type.startsWith('image/') ? 'fa-image' : 'fa-file-alt'} text-xl`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg text-slate-700 truncate">{file.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                           <span className="text-sm text-slate-400 mr-2">{file.type || 'Unknown Type'}</span>
                           {file.indexingMethod && Array.isArray(file.indexingMethod) && file.indexingMethod.map(method => (
                             <span key={method} className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                               method === 'vector' ? 'bg-purple-50 text-purple-600' : 
                               method === 'pageindex' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                             }`}>
                               {method === 'pageindex' ? 'Page Idx' : method}
                             </span>
                           ))}
                        </div>
                      </div>
                      <div className="text-base font-semibold text-slate-500 w-24 text-right">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                      <button 
                        onClick={() => onDeleteFile(selectedKB.id, file.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete File"
                      >
                        <i className="fas fa-trash-alt text-lg"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
           </div>
        ) : (
          /* Grid View - Collections List */
          <>
            {!isCreating ? (
              <button 
                onClick={() => setIsCreating(true)}
                className="w-full border-2 border-dashed border-slate-200 rounded-[2rem] py-16 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all flex flex-col items-center gap-4 group bg-white"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                  <i className="fas fa-plus text-2xl"></i>
                </div>
                <span className="font-bold text-lg">Create New Collection</span>
              </button>
            ) : (
              <form onSubmit={handleCreateKB} className="bg-white border border-slate-100 rounded-[2rem] p-10 shadow-sm animate-in fade-in">
                <label className="block text-base font-bold text-slate-700 mb-3">Collection Name</label>
                <input 
                  autoFocus
                  type="text"
                  value={newKBName}
                  onChange={(e) => setNewKBName(e.target.value)}
                  placeholder="e.g., Project Alpha Research"
                  className="w-full bg-slate-50 border-none rounded-xl p-5 text-xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-100 mb-8 placeholder-slate-400"
                />
                <div className="flex gap-4">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors text-lg">Create Collection</button>
                  <button type="button" onClick={() => setIsCreating(false)} className="px-10 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-lg">Cancel</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {knowledgeBases.map(kb => (
                <div 
                  key={kb.id} 
                  onClick={() => setSelectedKBId(kb.id)}
                  className="group bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 border border-slate-100 transition-all relative overflow-hidden flex flex-col h-72 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-xl text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[180px]">{kb.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1.5">{kb.files.length} Documents</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          currentKBRef.current = kb.id; 
                          fileInputRef.current?.click(); 
                        }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors z-10 relative"
                        title="Add Files"
                      >
                        <i className="fas fa-plus text-sm"></i>
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if(confirm("Are you sure you want to delete this collection?")) onDeleteKB(kb.id); 
                        }} 
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors z-10 relative"
                        title="Delete"
                      >
                        <i className="fas fa-trash-alt text-sm"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden pointer-events-none">
                      <div className="flex flex-wrap gap-2.5 content-start h-full">
                        {kb.files.slice(0, 5).map(f => (
                            <div key={f.id} className="bg-slate-50 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-100 truncate max-w-[160px]">
                            {f.name}
                            </div>
                        ))}
                        {kb.files.length > 5 && (
                            <div className="bg-indigo-50 px-3.5 py-2 rounded-lg text-sm font-bold text-indigo-600">
                            +{kb.files.length - 5} more
                            </div>
                        )}
                        {kb.files.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-base italic">
                                Empty collection
                            </div>
                        )}
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
    </div>
  );
};

export default KBManager;
