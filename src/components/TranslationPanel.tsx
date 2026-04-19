import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ChevronDown, Check, Loader2, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../utils/translationHelpers';
import { translateNote } from '../services/geminiService';
import { Note } from '../types';

interface TranslationPanelProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({ note, onUpdateNote }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const hasTranslation = !!note.translation;
  const translationIsStale = hasTranslation && note.translation!.updatedAt < note.createdAt; 
  // Very rough check, better would be to track body last updated vs translation last updated

  const handleTranslate = async (lang: SupportedLanguage) => {
    setShowPicker(false);
    setIsOpen(true);
    setIsTranslating(true);
    
    const textToTranslate = note.body || note.content;
    
    if (!textToTranslate) {
      setIsTranslating(false);
      alert('No text to translate. Add content to the note body first.');
      return;
    }

    try {
      const translatedText = await translateNote(textToTranslate, lang.label);
      if (translatedText) {
        onUpdateNote({
          ...note,
          translation: {
            lang: lang.code,
            langLabel: lang.label,
            text: translatedText,
            updatedAt: Date.now()
          }
        });
      } else {
        // translateNote returns null when API key is missing
        alert('Translation unavailable. Please set your GEMINI_API_KEY in the .env file to enable this feature.');
      }
    } catch (e) {
      console.error(e);
      alert('Translation failed. Check your internet connection and API key, then try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const removeTranslation = () => {
    // We clone using destructuring to remove translation
    const { translation, ...restNote } = note;
    onUpdateNote(restNote);
    setIsOpen(false);
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === note.translation?.lang);
  const isRtl = currentLang && 'rtl' in currentLang ? currentLang.rtl : false;

  return (
    <div className="mt-6 border-t border-primary/10 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/60 flex items-center gap-1.5">
            <Globe size={12} />
            Translation
          </h4>
          
          {hasTranslation && (
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-[10px] font-bold text-text-secondary uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"
            >
              {isOpen ? 'Hide' : 'Show'}
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="inline-block">
                <ChevronDown size={12} />
              </motion.div>
            </button>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-lowest hover:bg-surface-low border border-primary/10 rounded-lg text-xs font-bold text-primary transition-colors"
          >
            <Globe size={14} />
            {isTranslating ? 'Translating...' : hasTranslation ? note.translation!.langLabel : 'Translate'}
          </button>
          
          <AnimatePresence>
            {showPicker && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="absolute right-0 bottom-full mb-2 w-48 max-h-64 overflow-y-auto bg-surface border border-primary/10 rounded-xl shadow-2xl z-50 p-2"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => handleTranslate(l)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-surface-high transition-colors flex items-center justify-between group"
                  >
                    <span className="text-on-surface">{l.label}</span>
                    {note.translation?.lang === l.code && <Check size={14} className="text-primary group-hover:text-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {(isOpen || isTranslating) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-lowest border border-primary/5 rounded-2xl p-6 relative">
              {isTranslating ? (
                <div className="flex flex-col items-center justify-center py-8 text-primary">
                  <Loader2 className="animate-spin mb-3" size={24} />
                  <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Translating...</p>
                </div>
              ) : note.translation ? (
                <>
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {translationIsStale && (
                      <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded uppercase tracking-widest">
                        Stale
                      </span>
                    )}
                    <button 
                      onClick={removeTranslation}
                      className="p-1.5 text-text-secondary/40 hover:text-red-500 bg-surface-highest rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className={`text-on-surface/90 font-medium leading-relaxed mt-2 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                    {note.translation.text}
                  </p>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
