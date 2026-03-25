import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note } from '../types';
import { Mic, Sparkles, Pin, Trash2, MoreVertical, X, AlertTriangle, Pencil } from 'lucide-react';

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
        className={`bg-surface-low border border-primary/5 hover:border-primary/20 rounded-2xl p-3 sm:p-4 flex flex-col justify-between min-h-[84px] transition-all cursor-pointer group ghost-border ${
          note?.pinned ? 'border-l-[3px] border-l-primary' : ''
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
            note?.type === 'voice' ? 'bg-primary/10 text-primary' : 'bg-surface-highest text-text-secondary'
          }`}>
            <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="flex items-center gap-2">
            {note?.pinned && <Pin size={10} className="text-primary fill-current" />}
            <span className="text-[9px] sm:text-[10px] font-bold text-text-secondary/80 uppercase tracking-widest">{note?.timestamp}</span>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
              className="p-1 hover:bg-surface-highest rounded-lg text-text-secondary/60 hover:text-on-surface transition-colors"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>
        
        <h4 className="text-on-surface font-bold text-sm sm:text-base truncate mb-1">{note?.title}</h4>
        
        <div className="flex gap-1.5 overflow-hidden">
          <span className="px-2 py-0.5 bg-surface-highest rounded text-[9px] font-bold text-on-surface-variant uppercase truncate">
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
              className="absolute right-2 top-10 w-32 bg-surface border border-primary/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); onClick(); setShowOptions(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-on-surface hover:bg-surface-low transition-colors uppercase tracking-widest border-b border-primary/5"
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
            className="absolute inset-0 z-[60] bg-surface/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center border border-red-500/20"
          >
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 mb-2">
              <AlertTriangle size={16} />
            </div>
            <p className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-3">Delete this note?</p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                className="flex-1 py-2 bg-surface-low text-on-surface rounded-lg text-[9px] font-bold uppercase tracking-widest"
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
