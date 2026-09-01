import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileDown,
  FileText,
  Code,
  Copy,
  Check,
  CheckCheck,
  Calendar,
  Sparkles,
  BookOpen,
  Eye,
  Filter
} from 'lucide-react';
import { JournalEntry, UserProfile, ExportFormat } from '../types';
import { formatEntriesAsText, formatEntriesAsJSON, downloadFile } from '../lib/firebase';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  filteredEntries?: JournalEntry[];
  user: UserProfile;
  selectedEntry?: JournalEntry | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  filteredEntries,
  user,
  selectedEntry,
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt');
  const [scope, setScope] = useState<'all' | 'filtered' | 'selected'>(
    selectedEntry ? 'selected' : 'all'
  );
  const [isCopied, setIsCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine active entries to export based on scope
  const targetEntries = useMemo(() => {
    if (scope === 'selected' && selectedEntry) {
      return [selectedEntry];
    }
    if (scope === 'filtered' && filteredEntries && filteredEntries.length > 0) {
      return filteredEntries;
    }
    return entries;
  }, [scope, selectedEntry, filteredEntries, entries]);

  // Generate the formatted content
  const exportContent = useMemo(() => {
    if (exportFormat === 'json') {
      return formatEntriesAsJSON(targetEntries, user);
    }
    return formatEntriesAsText(targetEntries, user);
  }, [targetEntries, exportFormat, user]);

  const totalTurnsCount = targetEntries.reduce(
    (acc, e) => acc + (e.turns ? e.turns.length : 0),
    0
  );

  const handleDownload = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = exportFormat === 'json' ? 'json' : 'txt';
    const mimeType = exportFormat === 'json' ? 'application/json' : 'text/plain;charset=utf-8';
    const scopeTag = scope === 'selected' ? `entry-${selectedEntry?.id || 'single'}` : 'full-vault';
    const filename = `gemini-journal-export-${scopeTag}-${timestamp}.${extension}`;

    downloadFile(filename, exportContent, mimeType);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A352F]/60 backdrop-blur-md font-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="glass-card-3d rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#3A352F] animate-in zoom-in-95 duration-200 border border-white/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E0DBCF]/80 glass-panel-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#3A352F] text-[#FBF9F6] flex items-center justify-center shadow-md border border-white/20">
              <FileDown className="w-4 h-4 text-[#8A9A8A]" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-base text-[#3A352F] leading-none">
                Export Journal Vault
              </h3>
              <p className="text-[11px] text-[#7A7369] mt-1">
                Download formatted reflections, Gemini insights &amp; conversational turns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7A7369] hover:text-[#3A352F] glass-pill hover:bg-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Section */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#3A352F] mb-2 font-serif text-sm">
              1. Select Export Scope
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                id="export-scope-all"
                onClick={() => setScope('all')}
                className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer transform-gpu hover:-translate-y-0.5 ${
                  scope === 'all'
                    ? 'glass-card-3d border-[#8A9A8A] ring-2 ring-[#8A9A8A]/30 shadow-md'
                    : 'glass-panel hover:bg-white/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-[#3A352F]">All Entries</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3A352F] text-[#FBF9F6] font-bold">
                    {entries.length}
                  </span>
                </div>
                <p className="text-[10px] text-[#7A7369] leading-tight">
                  Export complete vault history
                </p>
              </button>

              {filteredEntries && filteredEntries.length !== entries.length && (
                <button
                  type="button"
                  id="export-scope-filtered"
                  onClick={() => setScope('filtered')}
                  className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer transform-gpu hover:-translate-y-0.5 ${
                    scope === 'filtered'
                      ? 'glass-card-3d border-[#8A9A8A] ring-2 ring-[#8A9A8A]/30 shadow-md'
                      : 'glass-panel hover:bg-white/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#3A352F]">Filtered Set</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3A352F] text-[#FBF9F6] font-bold">
                      {filteredEntries.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7A7369] leading-tight">
                    Current search/date results
                  </p>
                </button>
              )}

              {selectedEntry && (
                <button
                  type="button"
                  id="export-scope-selected"
                  onClick={() => setScope('selected')}
                  className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer transform-gpu hover:-translate-y-0.5 ${
                    scope === 'selected'
                      ? 'glass-card-3d border-[#8A9A8A] ring-2 ring-[#8A9A8A]/30 shadow-md'
                      : 'glass-panel hover:bg-white/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[#3A352F] truncate">Current Entry</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3A352F] text-[#FBF9F6] font-bold">
                      1
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7A7369] leading-tight truncate">
                    &quot;{selectedEntry.title}&quot;
                  </p>
                </button>
              )}
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#3A352F] mb-2 font-serif text-sm">
              2. Select File Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="export-format-txt"
                onClick={() => setExportFormat('txt')}
                className={`p-4 rounded-2xl text-left flex items-start gap-3.5 transition-all cursor-pointer transform-gpu hover:-translate-y-0.5 ${
                  exportFormat === 'txt'
                    ? 'glass-card-3d border-[#8A9A8A] ring-2 ring-[#8A9A8A]/30 shadow-md'
                    : 'glass-panel hover:bg-white/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <FileText className="w-4 h-4 text-[#8A9A8A]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-[#3A352F]">Plain Text / Markdown</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#8A9A8A]/20 text-[#3A352F] font-mono">.txt</span>
                  </div>
                  <p className="text-[10px] text-[#7A7369] mt-1 leading-normal">
                    Human-readable formatted document with timestamps, headings, and clean turn dividers.
                  </p>
                </div>
              </button>

              <button
                type="button"
                id="export-format-json"
                onClick={() => setExportFormat('json')}
                className={`p-4 rounded-2xl text-left flex items-start gap-3.5 transition-all cursor-pointer transform-gpu hover:-translate-y-0.5 ${
                  exportFormat === 'json'
                    ? 'glass-card-3d border-[#8A9A8A] ring-2 ring-[#8A9A8A]/30 shadow-md'
                    : 'glass-panel hover:bg-white/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Code className="w-4 h-4 text-[#8A9A8A]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-[#3A352F]">Structured JSON</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#8A9A8A]/20 text-[#3A352F] font-mono">.json</span>
                  </div>
                  <p className="text-[10px] text-[#7A7369] mt-1 leading-normal">
                    Complete machine-readable JSON hierarchy with categories, turns, metadata &amp; user profile.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Export Summary Box */}
          <div className="p-3.5 glass-panel rounded-2xl flex items-center justify-between text-[11px] shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[#3A352F] font-medium">
                <BookOpen className="w-3.5 h-3.5 text-[#8A9A8A]" />
                {targetEntries.length} {targetEntries.length === 1 ? 'entry' : 'entries'} selected
              </span>
              <span className="text-[#E0DBCF]">&bull;</span>
              <span className="flex items-center gap-1.5 text-[#7A7369]">
                <Sparkles className="w-3.5 h-3.5 text-[#8A9A8A]" />
                {totalTurnsCount} AI turns total
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-[#7A7369] hover:text-[#3A352F] flex items-center gap-1 cursor-pointer font-medium"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
            </button>
          </div>

          {/* Live Preview Pane */}
          {showPreview && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[#7A7369] font-serif">
                  Live Preview ({exportFormat.toUpperCase()})
                </label>
                <button
                  type="button"
                  id="copy-export-preview-btn"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-[10px] text-[#3A352F] px-2.5 py-1 rounded-xl glass-pill hover:bg-white transition-all cursor-pointer shadow-2xs"
                >
                  {isCopied ? (
                    <>
                      <CheckCheck className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#8A9A8A]" />
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-[#2C2823] text-[#F2EEE8] p-4 rounded-2xl font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto border border-white/10 scrollbar-thin shadow-inner">
                <pre className="whitespace-pre-wrap break-words">{exportContent}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E0DBCF]/80 glass-panel-subtle flex items-center justify-between">
          <div className="text-[10px] text-[#7A7369]">
            Ready to download as <span className="font-mono font-semibold text-[#3A352F]">.{exportFormat}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#7A7369] hover:text-[#3A352F] glass-pill hover:bg-white rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-download-export-btn"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3A352F] hover:bg-[#2C2823] text-[#FBF9F6] rounded-xl text-xs font-medium btn-3d cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#8A9A8A]" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
