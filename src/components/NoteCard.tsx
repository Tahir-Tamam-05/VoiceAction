import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note } from '../types';
import { Mic, Sparkles, Pin, Trash2, MoreVertical, AlertTriangle, Pencil } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const Icon = note?.type === 'voice' ? Mic : Sparkles;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
    setShowOptions(false);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
    setShowConfirm(false);
  };

  return (
    <div className="relative group">
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`w-full max-w-full my-2 rounded-2xl p-3 sm:p-4 flex flex-col justify-between min-h-[84px] transition-all cursor-pointer group glass-card crystal-shimmer ${
          note?.pinned ? 'border-l-[3px] border-l-primary' : ''
        }`}
      >
        {/* Cover image */}
        {note?.coverImage && (
          <div className="h-16 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-3 rounded-t-2xl overflow-hidden relative">
            <img src={note.coverImage} alt="" className="w-full h-full object-cover opacity-60" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--surface-low), transparent)' }} />
          </div>
        )}

        <div className="flex justify-between items-center mb-2">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
            note?.type === 'voice' ? 'bg-primary/10 text-primary' : 'bg-surface-highest text-text-secondary'
          }`}
          >
            <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="flex items-center gap-2">
            {note?.pinned && <Pin size={10} className="text-primary fill-current" />}
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-text-secondary/80">
              {note?.timestamp}
            </span>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
              className="p-1 rounded-lg transition-colors text-text-secondary hover:text-on-surface"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>
        
        <h4 className="font-bold text-[14px] sm:text-[16px] line-clamp-2 mb-1 leading-snug text-on-surface">
          {note?.title}
        </h4>
        
        <div className="flex flex-wrap gap-1.5 overflow-hidden items-center">
          {note?.tags && note.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] sm:text-[11px] font-bold uppercase truncate max-w-[80px]">
              {tag}
            </span>
          ))}
          <span className="text-[12px] sm:text-[13px] line-clamp-1 flex-1 text-on-surface-variant/70">
            {note?.content}
          </span>
        </div>
      </motion.div>

      {/* Quick Options Menu */}
      <AnimatePresence>
        {showOptions && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              className="absolute right-2 top-10 w-32 rounded-xl shadow-2xl z-50 overflow-hidden bg-surface border border-primary/10"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); onClick(); setShowOptions(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors text-on-surface border-b border-primary/10"
              >
                <Pencil size={14} className="text-primary" />
                <span>Edit</span>
              </button>
              <button 
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-widest"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Inline Delete Confirmation */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-[60] backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center bg-surface/95 border border-red-500/20"
          >
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 mb-2">
              <AlertTriangle size={16} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-on-surface">Delete this note?</p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                className="flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-surface-low text-on-surface"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
