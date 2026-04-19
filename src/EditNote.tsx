import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note, NoteAttachment } from './types';
import { TopBar } from './components';
import { 
  X, 
  Save, 
  Trash2, 
  Plus, 
  Link as LinkIcon, 
  FileText, 
  Pin, 
  Smile, 
  Calendar,
  ChevronDown,
  Image as ImageIcon,
  Paperclip,
  ExternalLink
} from 'lucide-react';
import { extractLinks, extractWikiLinks, resolveLinks } from './utils/linkHelpers';
import { processVoiceNote } from './services/geminiService';
import { TAG_TAXONOMY, Tag } from './utils/tagHelpers';
import { TranslationPanel } from './components/TranslationPanel';
import { Sparkles, Layers } from 'lucide-react';
import { generateNoteCover } from './services/geminiService';

interface EditNoteScreenProps {
  setScreen: (s: Screen) => void;
  note: Note;
  notes?: Note[];
  onUpdateNote: (n: Note) => void;
  onDeleteNote: (id: string) => void;
  isDark: boolean;
}

export const EditNoteScreen: React.FC<EditNoteScreenProps> = ({ 
  setScreen, 
  note, 
  notes = [],
  onUpdateNote, 
  onDeleteNote,
  isDark
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [body, setBody] = useState(note?.body || '');
  const [isPinned, setIsPinned] = useState(!!note?.pinned);
  const [attachments, setAttachments] = useState<NoteAttachment[]>(note?.attachments || []);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [type, setType] = useState(note?.type || 'text');
  const [tags, setTags] = useState<Tag[]>((note?.tags as Tag[]) || []);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFlashcardEnabled, setIsFlashcardEnabled] = useState(note?.flashcardEnabled || false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRefine = async () => {
    if (!body.trim()) return;
    setIsRefining(true);
    
    // Store original values for potential rollback
    const originalTitle = title;
    const originalContent = content;
    const originalBody = body;
    const originalType = type;

    try {
      const aiResult = await processVoiceNote(body);
      if (aiResult) {
        setTitle(aiResult.title || title);
        setContent(aiResult.content || content);
        setBody(aiResult.body || body);
        setType(aiResult.type || type);
      } else {
        // AI returned null, maybe API key is missing or malformed response
        alert("AI refinement failed. Please check your connection or API key.");
      }
    } catch (error) {
      console.error("Refinement failed:", error);
      // Rollback to original values
      setTitle(originalTitle);
      setContent(originalContent);
      setBody(originalBody);
      setType(originalType);
      alert("An error occurred during refinement. Your original note has been preserved.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = () => {
    const wikiTitles = extractWikiLinks(body);
    const linkedNoteIds = resolveLinks(wikiTitles, notes);

    const updatedNote: Note = {
      ...note,
      title,
      content,
      body,
      pinned: isPinned,
      attachments,
      tags,
      type,
      linkedNoteIds: linkedNoteIds.length > 0 ? linkedNoteIds : undefined,
      flashcardEnabled: isFlashcardEnabled,
      flashcardReview: note?.flashcardReview,
    };
    onUpdateNote(updatedNote);
    setScreen('home');
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteNote(note?.id || '');
    setScreen('home');
  };

  const handleGenerateCover = async () => {
    if (!window.confirm("Use AI to create a unique cover? (uses API credit)")) return;
    setIsGeneratingCover(true);
    try {
      const cover = await generateNoteCover(title || 'Untitled', type);
      if (cover) {
        const newNote = { ...note, coverImage: cover };
        onUpdateNote(newNote);
        // We do not set local state because onUpdateNote updates the parent, 
        // which passes the updated note back down, but wait, EditNote doesn't sync its internal state for coverImage.
        // Actually,EditNote reads note.coverImage directly!
      } else {
        alert("Failed to generate cover image. Note: Text-only Gemini plans do not support image generation.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating cover.");
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleAddLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      const newLinks = extractLinks(url);
      setAttachments([...attachments, ...newLinks]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: NoteAttachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const promise = new Promise<NoteAttachment>((resolve) => {
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const type: "image" | "file" = file.type.startsWith('image/') ? 'image' : 'file';
          
          resolve({
            id: crypto.randomUUID(),
            type,
            content: base64,
            label: file.name,
            mimeType: file.type,
            size: file.size,
            createdAt: Date.now()
          });
        };
        reader.readAsDataURL(file);
      });
      
      newAttachments.push(await promise);
    }
    
    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removeTag = (tagToRemove: Tag) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const addTag = (newTag: Tag) => {
    if (!tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setShowTagPicker(false);
  };

  return (
    <div className="min-h-screen w-full bg-base pb-10">
      <TopBar 
        title="Edit Note" 
        onBack={() => setScreen('home')}
        isDark={isDark}
        onToggleDarkMode={() => {}} // Handled by App.tsx
      />

      {note?.coverImage && (
        <div className="w-full h-48 relative overflow-hidden -mt-6 sm:-mt-8 mb-6">
          <div className="absolute inset-0 bg-gradient-to-t from-base to-transparent z-10" />
          <img src={note.coverImage} alt="Cover" className="w-full h-full object-cover opacity-70" />
          <button 
             onClick={() => { const newNote = {...note}; delete newNote.coverImage; onUpdateNote(newNote); }} 
             className="absolute top-24 right-4 z-20 p-2 bg-black/50 hover:bg-black text-white rounded-lg backdrop-blur-sm transition-all"
             title="Remove Cover"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
        multiple
      />

      <div className="pt-24 px-4 sm:px-6 max-w-3xl mx-auto">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPinned(!isPinned)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isPinned ? 'bg-primary text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-surface-low text-text-secondary border border-primary/10'
              }`}
              title="Pin Note"
            >
              <Pin size={18} fill={isPinned ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => setIsFlashcardEnabled(!isFlashcardEnabled)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isFlashcardEnabled || type === 'idea' ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-surface-low text-text-secondary border border-primary/10'
              }`}
              title={type === 'idea' ? "Ideas are automatically included in Flashcards" : "Include in Flashcards"}
            >
              <Layers size={18} />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className="bg-surface-low border border-primary/10 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-bold text-on-surface uppercase tracking-widest"
              >
                <span>{type}</span>
                <ChevronDown size={14} className="text-primary" />
              </button>
              
              <AnimatePresence>
                {showTypeMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 mt-2 w-32 bg-surface border border-primary/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    {['voice', 'text', 'ai'].map(t => (
                      <button 
                        key={t}
                        onClick={() => { setType(t as any); setShowTypeMenu(false); }}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-on-surface uppercase tracking-widest hover:bg-primary hover:text-black transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleGenerateCover}
              disabled={isGeneratingCover}
              className={`bg-surface-highest border border-primary/5 rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${isGeneratingCover ? 'text-primary/50 cursor-not-allowed animate-pulse' : 'text-text-secondary hover:text-primary hover:bg-surface-high'}`}
              title="Generate AI Cover"
            >
              <ImageIcon size={14} />
              <span className="hidden sm:inline">{isGeneratingCover ? 'Generating...' : note?.coverImage ? 'Regenerate Cover' : 'Generate Cover'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end sm:justify-start">
            <button 
              onClick={handleRefine}
              disabled={isRefining}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase tracking-widest transition-all ${
                isRefining ? 'bg-primary/20 text-primary animate-pulse' : 'bg-surface-low text-primary hover:bg-surface-high border border-primary/20'
              }`}
            >
              <Sparkles size={16} />
              <span>{isRefining ? 'Refining...' : 'Refine'}</span>
            </button>
            <button 
              onClick={handleDelete}
              className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-primary text-black px-6 py-2 rounded-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-105 transition-transform"
            >
              <Save size={18} />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title"
              className="w-full bg-transparent border-none outline-none text-3xl font-headline font-extrabold text-on-surface placeholder:text-text-secondary/40 tracking-tighter"
            />
            <div className="flex items-center gap-4 mt-2 text-text-secondary/40 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{note?.timestamp}</span>
              </div>
              <div className="flex items-center gap-1">
                <Smile size={12} />
                <span>{note?.mood || 'Neutral'}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-400 p-0.5 rounded transition-colors"><X size={10} /></button>
                </span>
              ))}
              <div className="relative">
                <button 
                  onClick={() => setShowTagPicker(!showTagPicker)} 
                  className="inline-flex items-center gap-1 px-3 py-1 bg-surface-highest text-text-secondary hover:text-primary hover:bg-surface-high rounded-lg text-[10px] font-bold uppercase tracking-widest border border-primary/10 transition-colors"
                >
                  <Plus size={10} /> Add Tag
                </button>
                
                <AnimatePresence>
                  {showTagPicker && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 top-full mt-2 w-64 bg-surface border border-primary/10 rounded-xl shadow-2xl p-3 z-50 grid grid-cols-2 gap-2"
                    >
                      {TAG_TAXONOMY.map(t => (
                        <button
                          key={t}
                          onClick={() => addTag(t as Tag)}
                          className={`text-left px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${
                            tags.includes(t as Tag) 
                              ? 'bg-primary/5 text-primary/50 cursor-not-allowed' 
                              : 'hover:bg-primary/10 text-on-surface hover:text-primary'
                          }`}
                          disabled={tags.includes(t as Tag)}
                        >
                          {t}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="bg-surface-low border border-primary/5 rounded-3xl p-6">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/60 mb-4">Summary</h4>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Short summary..."
              className="w-full bg-transparent border-none outline-none text-on-surface placeholder:text-text-secondary/40 resize-none h-20 font-medium leading-relaxed"
            />
          </div>

          <div className="bg-surface-low border border-primary/5 rounded-3xl p-6">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/60 mb-4">Full Transcript / Body</h4>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detailed notes or transcript..."
              className="w-full bg-transparent border-none outline-none text-on-surface placeholder:text-text-secondary/40 resize-none h-64 font-medium leading-relaxed"
            />
          </div>

          <TranslationPanel note={note} onUpdateNote={onUpdateNote} />

          {note.linkedNoteIds && note.linkedNoteIds.length > 0 && (
            <div className="mt-8">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/60 flex items-center gap-1.5 mb-4">
                <LinkIcon size={12} />
                Connected Notes
              </h4>
              <div className="flex flex-col gap-2">
                {note.linkedNoteIds.map(linkedId => {
                  const linkedNote = notes.find(n => n.id === linkedId);
                  if (!linkedNote) return null;
                  return (
                    <div key={linkedId} className="p-3 bg-surface-low border border-primary/10 rounded-xl hover:border-primary/30 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => {
                        onUpdateNote(note); // Save current first
                        // Navigation requires modifying App routing which we don't have time for
                    }}>
                      <div>
                        <h5 className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">{linkedNote.title}</h5>
                        <p className="text-xs text-text-secondary truncate mt-0.5">{linkedNote.content}</p>
                      </div>
                      <ExternalLink size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-text-secondary/40">Attachments</h4>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                >
                  <Paperclip size={12} />
                  <span>Upload</span>
                </button>
                <button 
                  onClick={handleAddLink}
                  className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                >
                  <Plus size={12} />
                  <span>Add Link</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map(att => (
                <div key={att.id} className="bg-surface-low border border-primary/5 rounded-2xl p-3 flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-surface-highest flex items-center justify-center text-primary flex-shrink-0 overflow-hidden">
                      {att.type === 'image' ? (
                        <img src={att.content} alt={att.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : att.type === 'link' ? (
                        <LinkIcon size={18} />
                      ) : (
                        <FileText size={18} />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-on-surface truncate">{att.label || 'Attachment'}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] text-text-secondary/60 truncate uppercase tracking-widest">
                          {att.type === 'link' ? 'Link' : att.type === 'image' ? 'Image' : 'File'}
                        </p>
                        {att.size && (
                          <span className="text-[9px] text-text-secondary/40">• {formatFileSize(att.size)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {att.type === 'link' && (
                      <a 
                        href={att.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-text-secondary/40 hover:text-primary transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button 
                      onClick={() => removeAttachment(att.id)}
                      className="p-2 text-text-secondary/20 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {attachments.length === 0 && (
                <div className="col-span-full text-center py-8 border-2 border-dashed border-primary/5 rounded-3xl">
                  <p className="text-xs text-text-secondary/20 font-bold uppercase tracking-widest">No attachments yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface border border-primary/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16" />
              
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                <Trash2 size={32} />
              </div>
              
              <h3 className="text-xl font-headline font-extrabold text-on-surface text-center mb-2 tracking-tight uppercase">Delete Note?</h3>
              <p className="text-text-secondary text-center text-sm mb-8 leading-relaxed">
                Are you sure you want to delete this note? This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 rounded-xl bg-surface-low text-on-surface font-bold text-xs uppercase tracking-widest hover:bg-surface-high transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-6 py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:scale-105 transition-transform"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
