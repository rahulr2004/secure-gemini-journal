import React, { useState, useEffect } from 'react';
import {
  Brain,
  Trash2,
  X,
  Sparkles,
  ShieldCheck,
  Tag,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { AIMemoryItem } from '../types';
import { deleteAIMemoryItem, subscribeToUserMemories } from '../lib/firebase';

interface MemoryModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({
  userId,
  isOpen,
  onClose
}) => {
  const [memories, setMemories] = useState<AIMemoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (!isOpen || !userId) return;
    const unsubscribe = subscribeToUserMemories(
      userId,
      (fetched) => {
        setMemories(fetched);
      },
      (err) => {
        console.error('Memories subscription error:', err);
      }
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, userId, onClose]);

  if (!isOpen) return null;

  const handleDelete = async (memId: string) => {
    try {
      await deleteAIMemoryItem(userId, memId);
    } catch (err) {
      console.error('Failed to delete memory item:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all stored AI contextual memories?')) return;
    for (const mem of memories) {
      await deleteAIMemoryItem(userId, mem.id);
    }
  };

  const filtered = activeCategory === 'all'
    ? memories
    : memories.filter(m => m.category === activeCategory);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1815]/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#FBF9F6] border border-[#E0DBCF] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E0DBCF] flex items-center justify-between bg-white/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-semibold text-[#3A352F]">Privacy-First AI Memory</h2>
              <p className="text-xs text-[#7A7369]">Review, inspect, or delete enduring growth facts learned by Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A7369] hover:text-[#3A352F] hover:bg-[#EAE4D9] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-purple-50/60 border-b border-purple-100 px-6 py-2.5 flex items-center justify-between text-xs text-purple-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Memories are strictly isolated to your user profile and never shared or used to train public models.</span>
          </div>
          {memories.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-red-600 hover:text-red-800 font-medium underline shrink-0 cursor-pointer ml-2"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-[#E0DBCF] flex items-center gap-2 bg-[#F7F4EE]/50">
          {['all', 'preference', 'insight', 'growth', 'value'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 text-xs rounded-lg transition-all capitalize cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#3A352F] text-white'
                  : 'bg-white/80 text-[#7A7369] border border-[#E0DBCF] hover:bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#7A7369]">
              <Brain className="w-8 h-8 mx-auto mb-2 text-[#E0DBCF]" />
              <p className="text-xs">No contextual memories recorded in this category yet.</p>
              <p className="text-[11px] text-[#7A7369]/70 mt-1">As you reflect and click "Extract Insights", meaningful personal patterns will appear here.</p>
            </div>
          ) : (
            filtered.map((mem) => (
              <div
                key={mem.id}
                className="p-3.5 bg-white rounded-xl border border-[#E0DBCF] flex items-start justify-between gap-3 shadow-xs hover:border-[#8A9A8A] transition-all"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAE4D9] text-[#3A352F] font-medium uppercase tracking-wider">
                      {mem.category}
                    </span>
                    {mem.sourceEntryTitle && (
                      <span className="text-[11px] text-[#7A7369] flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        From: {mem.sourceEntryTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#3A352F] font-serif leading-relaxed">
                    "{mem.keyFact}"
                  </p>
                  <div className="text-[10px] text-[#7A7369] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(mem.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(mem.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Forget this memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
