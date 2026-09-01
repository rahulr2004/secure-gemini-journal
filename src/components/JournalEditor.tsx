import React, { useState, useEffect, useRef, useMemo } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Save,
  Check,
  Tag,
  Folder,
  Compass,
  FileText,
  Lightbulb,
  HelpCircle,
  Clock,
  Cpu,
  Layers,
  ChevronDown,
  RotateCcw,
  Bot,
  User as UserIcon,
  Copy,
  CheckCheck,
  FileDown,
  X,
  Zap,
  Flame,
  BrainCircuit,
  Brain,
  MessageSquare,
  Mic,
  MicOff,
  Radio
} from 'lucide-react';

import { JournalEntry, JournalTurn, AIMode, EntryCategory, InteractionRecord, AIMemoryItem, UserProfile } from '../types';
import { saveJournalEntry, recordInteractionLog, saveAIMemoryItem } from '../lib/firebase';

import { RetryBanner } from './RetryBanner';

interface JournalEditorProps {
  userId: string;
  entry: JournalEntry;
  allEntries?: JournalEntry[];
  userProfile?: UserProfile;
  onEntryUpdated: (updatedEntry: JournalEntry) => void;
  onOpenExport?: (entry?: JournalEntry) => void;
}

const PROMPT_SUGGESTIONS: { label: string; mode: AIMode; prompt: string }[] = [
  {
    label: 'Deep Reflection',
    mode: 'reflection',
    prompt: 'Help me reflect on what I just wrote: what underlying patterns or feelings stand out?'
  },
  {
    label: 'Synthesize & Summarize',
    mode: 'summary',
    prompt: 'Please synthesize this reflection into key breakthroughs, emotional tone, and core takeaways.'
  },
  {
    label: 'Brainstorm Next Steps',
    mode: 'brainstorm',
    prompt: 'What are 3-5 creative angles or next actions I can take from here?'
  },
  {
    label: 'Actionable Advice',
    mode: 'advice',
    prompt: 'How can I break this challenge down into small, practical steps?'
  }
];

const CATEGORIES: EntryCategory[] = [
  'Reflection',
  'Brainstorm',
  'Personal',
  'Work',
  'Gratitude',
  'Goals',
  'Creative'
];

const MODES: { id: AIMode; label: string; icon: any; desc: string }[] = [
  { id: 'reflection', label: 'Reflection', icon: Compass, desc: 'Empathetic introspection & guiding questions' },
  { id: 'summary', label: 'Summary', icon: FileText, desc: 'Synthesis, emotional tone & key takeaways' },
  { id: 'brainstorm', label: 'Brainstorm', icon: Lightbulb, desc: 'Creative ideas, angles & thought expansions' },
  { id: 'advice', label: 'Advice', icon: HelpCircle, desc: 'Constructive coaching & actionable steps' },
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  userId,
  entry,
  allEntries = [],
  userProfile,
  onEntryUpdated,
  onOpenExport,
}) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetryingSave, setIsRetryingSave] = useState(false);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExtractingMemories, setIsExtractingMemories] = useState(false);
  const [extractedMemories, setExtractedMemories] = useState<AIMemoryItem[]>([]);
  const [memorySuccessMsg, setMemorySuccessMsg] = useState<string | null>(null);
  const [isNudgeDismissed, setIsNudgeDismissed] = useState(false);


  // Web Speech API Voice-to-Text State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptBeforeListeningRef = useRef<string>('');

  // Check Web Speech API support and cleanup on unmount
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.turns, isGenerating]);

  // Dynamic Pattern-Based Reflective Insight Layer ("Insight Nudges")
  // Reads only current user's past entries, strictly human-in-the-loop
  const activeNudge = useMemo(() => {
    if (isNudgeDismissed || allEntries.length < 2) return null;

    // Aggregate tags and categories across past entries (excluding current if empty)
    const tagFrequencies: Record<string, number> = {};
    const categoryFrequencies: Record<string, number> = {};
    let totalPastTurns = 0;

    allEntries.forEach((e) => {
      if (e.id !== entry.id) {
        (e.tags || []).forEach((t) => {
          tagFrequencies[t] = (tagFrequencies[t] || 0) + 1;
        });
        if (e.category) {
          categoryFrequencies[e.category] = (categoryFrequencies[e.category] || 0) + 1;
        }
        totalPastTurns += (e.turns || []).length;
      }
    });

    const topTagEntry = Object.entries(tagFrequencies).sort((a, b) => b[1] - a[1])[0];
    const topCatEntry = Object.entries(categoryFrequencies).sort((a, b) => b[1] - a[1])[0];

    if (topTagEntry && topTagEntry[1] >= 2) {
      return {
        type: 'tag_pattern',
        title: `Recurring Theme: #${topTagEntry[0]}`,
        text: `You have reflected on #${topTagEntry[0]} across ${topTagEntry[1]} previous sessions. What new clarity or questions do you have on this today?`,
        prompt: `Looking across my past entries about #${topTagEntry[0]}, help me explore how my mindset or approach has shifted today.`
      };
    }

    if (topCatEntry && topCatEntry[1] >= 2) {
      return {
        type: 'category_pattern',
        title: `Deep Focus: ${topCatEntry[0]}`,
        text: `${topCatEntry[0]} is your most active reflection area with ${topCatEntry[1]} entries recorded.`,
        prompt: `Considering my focus on ${topCatEntry[0]}, what deeper questions should I ask myself right now?`
      };
    }

    if (totalPastTurns > 5) {
      return {
        type: 'depth_pattern',
        title: 'Conversational Momentum',
        text: `You've engaged in over ${totalPastTurns} conversational reflection turns in your vault. Ready to synthesize today's breakthroughs?`,
        prompt: `Help me reflect on the major insights I've developed recently and connect them to where I am today.`
      };
    }

    return null;
  }, [allEntries, entry.id, isNudgeDismissed]);

  // Persist entry changes to Firestore
  const persistEntry = async (updated: JournalEntry) => {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      await saveJournalEntry(userId, updated);
      onEntryUpdated(updated);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      setSaveStatus('error');
      setErrorMessage(err?.message || 'Failed to save entry to Firestore. Please retry.');
    }
  };

  const handleTitleChange = (newTitle: string) => {
    const updated: JournalEntry = {
      ...entry,
      title: newTitle,
      updatedAt: new Date().toISOString()
    };
    persistEntry(updated);
  };

  const handleCategoryChange = (category: EntryCategory) => {
    const updated: JournalEntry = {
      ...entry,
      category,
      updatedAt: new Date().toISOString()
    };
    persistEntry(updated);
  };

  const handleModeChange = (aiMode: AIMode) => {
    const updated: JournalEntry = {
      ...entry,
      aiMode,
      updatedAt: new Date().toISOString()
    };
    persistEntry(updated);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const cleaned = tagInput.trim().replace(/^#/, '');
      if (!entry.tags.includes(cleaned)) {
        const updated: JournalEntry = {
          ...entry,
          tags: [...entry.tags, cleaned],
          updatedAt: new Date().toISOString()
        };
        persistEntry(updated);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated: JournalEntry = {
      ...entry,
      tags: entry.tags.filter((t) => t !== tagToRemove),
      updatedAt: new Date().toISOString()
    };
    persistEntry(updated);
  };

  const handleSendPrompt = async (customPrompt?: string, customMode?: AIMode) => {
    const promptToSend = (customPrompt || currentPrompt).trim();
    if (!promptToSend || isGenerating) return;

    const activeMode = customMode || entry.aiMode;
    const userTurnId = `turn-user-${Date.now()}`;
    const userTurn: JournalTurn = {
      id: userTurnId,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toISOString()
    };

    const entryWithUserTurn: JournalEntry = {
      ...entry,
      title: entry.title === 'New Reflection' && promptToSend.length > 5
        ? promptToSend.slice(0, 35) + (promptToSend.length > 35 ? '...' : '')
        : entry.title,
      turns: [...entry.turns, userTurn],
      updatedAt: new Date().toISOString()
    };

    setCurrentPrompt('');
    setIsGenerating(true);
    setErrorMessage(null);

    // Save user's turn to Firestore immediately
    await persistEntry(entryWithUserTurn);

    try {
      const res = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history: entry.turns,
          mode: activeMode,
          title: entry.title
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gemini API returned an error.');
      }

      const modelTurnId = `turn-gemini-${Date.now()}`;
      const modelTurn: JournalTurn = {
        id: modelTurnId,
        role: 'model',
        content: data.text,
        timestamp: new Date().toISOString(),
        modelUsed: data.modelUsed
      };

      const finalEntry: JournalEntry = {
        ...entryWithUserTurn,
        turns: [...entryWithUserTurn.turns, modelTurn],
        updatedAt: new Date().toISOString()
      };

      // Persist full multi-turn conversation in Firestore
      await persistEntry(finalEntry);

      // Record interaction audit log
      const auditLog: InteractionRecord = {
        id: `int-${Date.now()}`,
        userId,
        entryId: entry.id,
        prompt: promptToSend,
        response: data.text,
        mode: activeMode,
        modelUsed: data.modelUsed,
        timestamp: new Date().toISOString()
      };
      await recordInteractionLog(userId, auditLog);

    } catch (err: any) {
      console.error('Gemini reflection error:', err);
      setErrorMessage(`AI Reflection failed: ${err.message || 'Check connection'}`);
    } finally {
      setIsGenerating(false);
      textareaRef.current?.focus();
    }
  };

  const handleGenerateSummary = async () => {
    if (entry.turns.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          turns: entry.turns
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize summary.');
      }

      const updated: JournalEntry = {
        ...entry,
        summary: data.summary,
        updatedAt: new Date().toISOString()
      };

      await persistEntry(updated);
    } catch (err: any) {
      console.error('Summary error:', err);
      setErrorMessage(`Failed to summarize: ${err.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExtractMemories = async () => {
    if (entry.turns.length === 0 || isExtractingMemories) return;
    setIsExtractingMemories(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/gemini/extract-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          turns: entry.turns
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract memories.');
      }

      const generated = (data.memories || []).map((m: any, idx: number) => ({
        id: `mem-${Date.now()}-${idx}`,
        userId,
        keyFact: m.keyFact,
        category: m.category || 'insight',
        sourceEntryId: entry.id,
        sourceEntryTitle: entry.title,
        confidenceScore: m.confidenceScore || 0.9,
        createdAt: new Date().toISOString()
      }));

      setExtractedMemories(generated);
    } catch (err: any) {
      console.error('Memory extraction error:', err);
      setErrorMessage(`Failed to extract memories: ${err.message}`);
    } finally {
      setIsExtractingMemories(false);
    }
  };

  const handleSaveMemoryItem = async (mem: AIMemoryItem) => {
    try {
      await saveAIMemoryItem(userId, mem);
      setExtractedMemories((prev) => prev.filter((m) => m.id !== mem.id));
      setMemorySuccessMsg(`Saved to your private AI memory!`);
      setTimeout(() => setMemorySuccessMsg(null), 2500);
    } catch (err: any) {
      console.error('Failed to save memory item:', err);
      setErrorMessage('Failed to save memory item.');
    }
  };


  const handleRetrySave = async () => {
    setIsRetryingSave(true);
    await persistEntry(entry);
    setIsRetryingSave(false);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTurnId(id);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const handleExploreNudge = (nudgePrompt: string) => {
    setCurrentPrompt(nudgePrompt);
    textareaRef.current?.focus();

    // PART B: Single-channel notification webhook trigger on accepting insight nudge
    if (userProfile?.notifications?.webhookUrl) {
      fetch('/api/notifications/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: userProfile.notifications.webhookUrl,
          event: 'insight_nudge_accepted',
          title: activeNudge?.title || 'Insight Nudge Explored',
          summary: activeNudge?.text || 'User explored past pattern reflection prompt.',
          timestamp: new Date().toISOString()
        })
      }).catch((err) => console.warn('Notification webhook non-fatal notice:', err));
    }
  };

  // Web Speech API Voice Dictation Methods
  const startListening = () => {
    setSpeechError(null);
    const SpeechRecognitionClass = typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

    if (!SpeechRecognitionClass) {
      setSpeechError('Web Speech API is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      transcriptBeforeListeningRef.current = currentPrompt;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk;
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        const combinedTranscript = (finalTranscript + ' ' + interimTranscript).trim();
        const base = transcriptBeforeListeningRef.current;
        const separator = base && !base.endsWith(' ') && !base.endsWith('\n') ? ' ' : '';
        const newText = base ? `${base}${separator}${combinedTranscript}` : combinedTranscript;

        setCurrentPrompt(newText);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser.');
        } else if (event.error === 'network') {
          setSpeechError('Network connectivity error during voice recognition.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice recognition: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError(err.message || 'Failed to initialize voice recognition.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleToggleVoiceDictation = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FBF9F6] overflow-hidden">
      {/* Top Meta Toolbar with 3D Glassmorphism */}
      <div className="border-b border-[#E0DBCF]/80 glass-panel-subtle p-4 shrink-0 space-y-3 shadow-xs">
        {/* Title Input & Save Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            id="journal-entry-title-input"
            type="text"
            value={entry.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Title of this reflection..."
            className="text-lg sm:text-xl font-serif font-medium text-[#3A352F] bg-transparent border-b border-transparent hover:border-[#E0DBCF] focus:border-[#8A9A8A] focus:outline-none px-1 py-0.5 transition-all w-full sm:max-w-xl"
          />

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 font-sans">
            {/* Save Status Badge */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === 'saving' && (
                <span className="text-[#8A9A8A] flex items-center gap-1.5 font-medium glass-pill px-3 py-1 rounded-full">
                  <div className="w-3 h-3 border-2 border-[#8A9A8A]/30 border-t-[#8A9A8A] rounded-full animate-spin" />
                  Saving to Firestore...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[#4E614E] flex items-center gap-1.5 font-medium bg-[#8A9A8A]/15 px-3 py-1 rounded-full border border-[#8A9A8A]/30 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-[#5C6E5C]" />
                  Saved in Firestore
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-rose-700 font-medium bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 shadow-2xs">
                  Save Error
                </span>
              )}
            </div>

            {/* Quick Summary Generator Button */}
            <button
              onClick={handleGenerateSummary}
              disabled={entry.turns.length === 0 || isSummarizing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#3A352F] glass-panel hover:bg-white rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-40 cursor-pointer transform-gpu hover:-translate-y-0.5"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[#8A9A8A] ${isSummarizing ? 'animate-spin' : ''}`} />
              <span>{isSummarizing ? 'Synthesizing...' : 'AI Summary'}</span>
            </button>

            {/* Extract Memory Insights Button */}
            <button
              onClick={handleExtractMemories}
              disabled={entry.turns.length === 0 || isExtractingMemories}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#3A352F] glass-panel hover:bg-white rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-40 cursor-pointer transform-gpu hover:-translate-y-0.5"
              title="Extract enduring facts, preferences and core values into private AI memory"
            >
              <Brain className={`w-3.5 h-3.5 text-purple-600 ${isExtractingMemories ? 'animate-spin' : ''}`} />
              <span>{isExtractingMemories ? 'Extracting...' : 'Extract Memory'}</span>
            </button>


            {/* Export Entry Button */}
            {onOpenExport && (
              <button
                id="editor-export-entry-btn"
                onClick={() => onOpenExport(entry)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7A7369] hover:text-[#3A352F] glass-panel hover:bg-white rounded-xl shadow-xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
                title="Export this reflection session to Text or JSON"
              >
                <FileDown className="w-3.5 h-3.5 text-[#8A9A8A]" />
                <span className="hidden sm:inline">Export Entry</span>
                <span className="sm:hidden">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Categories, Tags & AI Mode Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 text-[#7A7369]">
              <Folder className="w-3.5 h-3.5 text-[#8A9A8A]" />
              <select
                value={entry.category}
                onChange={(e) => handleCategoryChange(e.target.value as EntryCategory)}
                className="glass-panel px-2.5 py-1 text-xs text-[#3A352F] font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8A9A8A] cursor-pointer shadow-2xs"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags list */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-[#8A9A8A]" />
              {entry.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg glass-pill text-[#7A7369] text-[11px] font-medium shadow-2xs"
                >
                  #{t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-600 text-[#A69E94] text-xs cursor-pointer ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Add tag (Enter)"
                className="w-24 bg-transparent border-b border-dashed border-[#A69E94] text-[11px] text-[#3A352F] placeholder-[#A69E94] focus:outline-none focus:border-[#8A9A8A] px-1"
              />
            </div>
          </div>

          {/* AI Mode Selector Tabs */}
          <div className="flex items-center gap-1 glass-pill p-1 rounded-xl">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isActive = entry.aiMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  title={m.desc}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#3A352F] text-[#FBF9F6] shadow-xs font-semibold'
                      : 'text-[#7A7369] hover:text-[#3A352F] hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3 h-3 ${isActive ? 'text-[#8A9A8A]' : 'text-[#A69E94]'}`} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Conversation & Journal Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Error Banner */}
        {errorMessage && (
          <RetryBanner
            message={errorMessage}
            onRetry={handleRetrySave}
            onDismiss={() => setErrorMessage(null)}
            isRetrying={isRetryingSave}
          />
        )}

        {/* Memory Save Success Banner */}
        {memorySuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {memorySuccessMsg}
            </span>
            <button
              onClick={() => setMemorySuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-medium text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Extracted Memory Items Review Box */}
        {extractedMemories.length > 0 && (
          <div className="p-5 rounded-3xl bg-purple-50/60 border border-purple-200/80 shadow-md space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#3A352F]">Extracted AI Context Memories</h4>
                  <p className="text-[11px] text-[#7A7369]">Review enduring facts before committing them to your private AI memory vault</p>
                </div>
              </div>
              <button
                onClick={() => setExtractedMemories([])}
                className="text-xs text-[#7A7369] hover:text-[#3A352F] cursor-pointer"
              >
                Dismiss All
              </button>
            </div>

            <div className="space-y-2">
              {extractedMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3 bg-white rounded-xl border border-purple-100 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="text-xs text-[#3A352F]">
                    <span className="inline-block px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded-md bg-purple-100 text-purple-700 mr-2">
                      {mem.category}
                    </span>
                    {mem.keyFact}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSaveMemoryItem(mem)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Save Memory
                    </button>
                    <button
                      onClick={() => setExtractedMemories((prev) => prev.filter((m) => m.id !== mem.id))}
                      className="p-1 text-[#A69E94] hover:text-rose-600 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* AI Synthesis Summary Card if available */}
        {entry.summary && (
          <div className="p-5 rounded-3xl glass-card-3d border border-[#8A9A8A]/50 shadow-lg space-y-2.5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3A352F] font-sans">
              <span className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#8A9A8A]" />
                </div>
                <span>Gemini Synthesis &amp; Key Insights</span>
              </span>
              <button
                onClick={() => handleCopyText('summary', entry.summary || '')}
                className="text-[#7A7369] hover:text-[#3A352F] p-1.5 rounded-lg glass-pill transition-all cursor-pointer"
                title="Copy summary"
              >
                {copiedTurnId === 'summary' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-[#8A9A8A]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="text-xs sm:text-sm text-[#3A352F] font-serif leading-relaxed prose prose-stone max-w-none pt-1">
              <Markdown>{entry.summary}</Markdown>
            </div>
          </div>
        )}

        {/* Empty State / Initial Guide */}
        {entry.turns.length === 0 && (
          <div className="py-8 px-4 text-center max-w-lg mx-auto space-y-4 font-sans">
            <div className="w-14 h-14 rounded-3xl glass-panel text-[#8A9A8A] mx-auto flex items-center justify-center shadow-lg border border-white/80 animate-float-slow">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-medium text-[#3A352F]">
                Begin Your Reflection
              </h3>
              <p className="text-xs text-[#7A7369] mt-1.5 leading-relaxed">
                Write freely about what is on your mind. You can ask for empathetic reflection, brainstorm new ideas, or seek actionable coaching.
              </p>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="pt-2 grid grid-cols-1 gap-2.5 text-left">
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(item.prompt, item.mode)}
                  className="p-3.5 rounded-2xl glass-card-3d text-xs flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-[#3A352F] block font-serif text-sm">{item.label}</span>
                    <span className="text-[11px] text-[#7A7369]">{item.prompt}</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[#F2EEE8] text-[#7A7369] group-hover:bg-[#3A352F] group-hover:text-[#8A9A8A] flex items-center justify-center shrink-0 ml-3 transition-colors shadow-2xs">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Turns with 3D Depth */}
        {entry.turns.map((turn) => {
          const isUser = turn.role === 'user';
          return (
            <div
              key={turn.id}
              className={`flex gap-3 sm:gap-4 ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {!isUser && (
                <div className="w-9 h-9 rounded-2xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center shrink-0 shadow-md border border-white/20 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-3xl p-4 sm:p-5 text-xs sm:text-sm font-serif transform-gpu transition-all ${
                  isUser
                    ? 'bg-[#3A352F] text-[#FBF9F6] shadow-lg border border-white/10'
                    : 'glass-card-3d text-[#3A352F] shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2.5 pb-1.5 border-b border-current/10 text-[10px] opacity-75 font-sans">
                  <span className="font-semibold tracking-wide">
                    {isUser ? 'You' : 'Gemini AI'}
                  </span>
                  <div className="flex items-center gap-2">
                    {turn.modelUsed && !isUser && (
                      <span className="font-mono text-[9px] glass-pill px-2 py-0.5 rounded text-[#7A7369]">
                        {turn.modelUsed}
                      </span>
                    )}
                    <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      onClick={() => handleCopyText(turn.id, turn.content)}
                      className="hover:opacity-100 opacity-60 p-0.5 transition-opacity cursor-pointer"
                      title="Copy content"
                    >
                      {copiedTurnId === turn.id ? (
                        <CheckCheck className="w-3 h-3 text-[#8A9A8A]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className={`leading-relaxed ${isUser ? 'whitespace-pre-wrap' : 'prose prose-stone prose-xs sm:prose-sm max-w-none text-[#3A352F]'}`}>
                  {isUser ? (
                    turn.content
                  ) : (
                    <Markdown>{turn.content}</Markdown>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-9 h-9 rounded-2xl glass-panel text-[#3A352F] flex items-center justify-center shrink-0 shadow-md border border-white/80 mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* 3D Typing indicator with Pulse Aura when generating */}
        {isGenerating && (
          <div className="flex gap-3 sm:gap-4 justify-start animate-in fade-in duration-200">
            <div className="w-9 h-9 rounded-2xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center shrink-0 shadow-md border border-white/20 mt-1 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-card-3d rounded-2xl p-4 flex items-center gap-3.5 text-xs font-sans text-[#7A7369] shadow-lg border border-[#8A9A8A]/30">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8A9A8A] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#8A9A8A] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#8A9A8A] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="font-medium text-[#3A352F]">Gemini is actively reflecting on your input...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating 3D Reflective Insight Layer ("Insight Nudges") */}
      {activeNudge && (
        <div className="px-4 pb-2 shrink-0 font-sans max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="glass-card-3d p-3.5 rounded-2xl border border-amber-400/40 shadow-lg flex items-start justify-between gap-3 bg-gradient-to-r from-amber-50/70 via-white/80 to-emerald-50/60">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-300/40">
                <BrainCircuit className="w-4 h-4 text-amber-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-semibold text-xs text-[#3A352F]">
                    {activeNudge.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-100/80 text-amber-800 font-medium">
                    Past Pattern Insight
                  </span>
                </div>
                <p className="text-[11px] text-[#7A7369] leading-relaxed">
                  {activeNudge.text}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => handleExploreNudge(activeNudge.prompt)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3A352F] hover:bg-[#2C2823] text-[#FBF9F6] rounded-lg text-[11px] font-medium shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#8A9A8A]" />
                    <span>Explore Prompt</span>
                  </button>
                  <button
                    onClick={() => setIsNudgeDismissed(true)}
                    className="px-2.5 py-1 text-[11px] text-[#7A7369] hover:text-[#3A352F] transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsNudgeDismissed(true)}
              className="text-[#A69E94] hover:text-[#3A352F] p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              title="Dismiss suggestion"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input Composer Footer with 3D Glassmorphic Container */}
      <div className="p-4 border-t border-[#E0DBCF]/80 glass-panel-subtle shrink-0 font-sans shadow-lg">
        <div className="max-w-4xl mx-auto space-y-2.5">
          {/* Prompt chips if user has already started */}
          {entry.turns.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <span className="text-[#7A7369] font-medium shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#8A9A8A]" /> Quick actions:
              </span>
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(item.prompt, item.mode)}
                  disabled={isGenerating}
                  className="px-3 py-1 rounded-full glass-pill hover:bg-white text-[#3A352F] shrink-0 font-medium transition-all disabled:opacity-50 cursor-pointer shadow-2xs transform-gpu hover:-translate-y-0.5"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Speech Recognition Error Banner */}
          {speechError && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <MicOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{speechError}</span>
              </div>
              <button
                onClick={() => setSpeechError(null)}
                className="p-1 text-rose-600 hover:text-rose-900 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                title="Dismiss message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Voice Listening Banner */}
          {isListening && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 text-xs shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <span className="font-medium text-[#3A352F] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                  Listening... Speak freely to dictate your journal reflection
                </span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="px-2.5 py-1 rounded-lg bg-[#3A352F] text-white hover:bg-[#2C2823] text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
              >
                Done Dictating
              </button>
            </div>
          )}

          <div className="relative rounded-2xl glass-card-3d p-1 focus-within:ring-2 focus-within:ring-[#8A9A8A]/50 transition-all shadow-md">
            <textarea
              id="journal-prompt-textarea"
              ref={textareaRef}
              rows={3}
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? "Listening to your voice... Speak your thoughts clearly..."
                  : `Write your journal entry or question for Gemini in ${entry.aiMode} mode... (Cmd/Ctrl + Enter to send)`
              }
              disabled={isGenerating}
              className="w-full p-3.5 pr-28 bg-transparent text-xs sm:text-sm font-serif text-[#3A352F] placeholder-[#A69E94] focus:outline-none resize-none"
            />

            <div className="absolute right-3 bottom-3 flex items-center gap-1.5 sm:gap-2">
              {/* Voice-to-Text Dictation Button */}
              <button
                id="voice-dictation-button"
                type="button"
                onClick={handleToggleVoiceDictation}
                disabled={isGenerating || !isSpeechSupported}
                className={`p-2.5 rounded-xl transition-all cursor-pointer btn-3d ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400 ring-offset-1 animate-pulse shadow-md'
                    : isSpeechSupported
                    ? 'glass-panel hover:bg-white text-[#3A352F] hover:text-black shadow-xs'
                    : 'opacity-40 glass-panel text-[#A69E94] cursor-not-allowed'
                }`}
                title={
                  !isSpeechSupported
                    ? 'Web Speech API is not supported in this browser'
                    : isListening
                    ? 'Stop voice dictation (Listening...)'
                    : 'Voice-to-Text: Dictate reflection directly into entry'
                }
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-[#5C6E5C]" />
                )}
              </button>

              {/* Send Button */}
              <button
                id="send-reflection-button"
                onClick={() => handleSendPrompt()}
                disabled={!currentPrompt.trim() || isGenerating}
                className="p-2.5 rounded-xl bg-[#3A352F] hover:bg-[#2C2823] text-[#FBF9F6] disabled:opacity-30 btn-3d cursor-pointer"
                title="Send entry to Gemini (Cmd/Ctrl+Enter)"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-[#8A9A8A]" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#7A7369] px-1">
            <span>Press <kbd className="px-1.5 py-0.5 glass-panel rounded font-mono text-[10px] text-[#3A352F] shadow-2xs">Cmd/Ctrl + Enter</kbd> to submit</span>
            <span className="flex items-center gap-1 text-[#8A9A8A] font-medium">
              <Cpu className="w-3.5 h-3.5" />
              Fallback Ladder Active (3.6 Flash)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
