import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  Trash2,
  Sparkles,
  Filter,
  ArrowUpDown,
  FileDown,
  X,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Check
} from 'lucide-react';
import { JournalEntry, EntryCategory, AIMode, SortOrder } from '../types';

interface JournalSidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string, e: React.MouseEvent) => void;
  onOpenExport: (filteredList?: JournalEntry[]) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onFilteredEntriesChange?: (filtered: JournalEntry[]) => void;
}

const CATEGORIES: ('All' | EntryCategory)[] = [
  'All',
  'Reflection',
  'Brainstorm',
  'Personal',
  'Work',
  'Gratitude',
  'Goals',
  'Creative'
];

const AI_MODES: { id: 'All' | AIMode; label: string }[] = [
  { id: 'All', label: 'All Modes' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'summary', label: 'Summary' },
  { id: 'brainstorm', label: 'Brainstorm' },
  { id: 'advice', label: 'Advice' },
];

type DatePreset = 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom';

export const JournalSidebar: React.FC<JournalSidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  onOpenExport,
  isOpenMobile,
  onCloseMobile,
  onFilteredEntriesChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | EntryCategory>('All');
  const [selectedMode, setSelectedMode] = useState<'All' | AIMode>('All');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Apply filters and sorting
  const filteredEntries = useMemo(() => {
    const result = entries.filter((entry) => {
      // 1. Keyword search (case-insensitive across title, turns, tags, summary)
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesTitle = (entry.title || '').toLowerCase().includes(queryLower);
        const matchesTurns = (entry.turns || []).some((t) =>
          (t.content || '').toLowerCase().includes(queryLower)
        );
        const matchesTags = (entry.tags || []).some((tag) =>
          (tag || '').toLowerCase().includes(queryLower)
        );
        const matchesSummary = (entry.summary || '').toLowerCase().includes(queryLower);

        if (!matchesTitle && !matchesTurns && !matchesTags && !matchesSummary) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'All' && entry.category !== selectedCategory) {
        return false;
      }

      // 3. AI Mode filter
      if (selectedMode !== 'All' && entry.aiMode !== selectedMode) {
        return false;
      }

      // 4. Date Range filter
      const entryTimestamp = new Date(entry.createdAt || entry.updatedAt).getTime();
      const now = new Date();

      if (datePreset === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (entryTimestamp < startOfToday) return false;
      } else if (datePreset === '7days') {
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        if (entryTimestamp < sevenDaysAgo) return false;
      } else if (datePreset === '30days') {
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        if (entryTimestamp < thirtyDaysAgo) return false;
      } else if (datePreset === 'thisMonth') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        if (entryTimestamp < startOfMonth) return false;
      } else if (datePreset === 'custom') {
        if (startDate) {
          const startMs = new Date(startDate).setHours(0, 0, 0, 0);
          if (entryTimestamp < startMs) return false;
        }
        if (endDate) {
          const endMs = new Date(endDate).setHours(23, 59, 59, 999);
          if (entryTimestamp > endMs) return false;
        }
      }

      return true;
    });

    // Apply Sorting
    return result.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();

      switch (sortOrder) {
        case 'oldest':
          return timeA - timeB;
        case 'alphabetical':
          return (a.title || '').localeCompare(b.title || '');
        case 'turns':
          return (b.turns?.length || 0) - (a.turns?.length || 0);
        case 'newest':
        default:
          return timeB - timeA;
      }
    });
  }, [
    entries,
    searchQuery,
    selectedCategory,
    selectedMode,
    datePreset,
    startDate,
    endDate,
    sortOrder
  ]);

  React.useEffect(() => {
    onFilteredEntriesChange?.(filteredEntries);
  }, [filteredEntries, onFilteredEntriesChange]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'All') count++;
    if (selectedMode !== 'All') count++;
    if (datePreset !== 'all') count++;
    if (sortOrder !== 'newest') count++;
    return count;
  }, [searchQuery, selectedCategory, selectedMode, datePreset, sortOrder]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedMode('All');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSortOrder('newest');
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    } catch {
      return 'Recent';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#3A352F]/40 backdrop-blur-xs z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-80 sm:w-96 glass-panel-subtle border-r border-[#E0DBCF]/80 flex flex-col transition-transform duration-300 ease-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Action Header */}
        <div className="p-3.5 border-b border-[#E0DBCF]/80 bg-[#F2EEE8]/80 backdrop-blur-md space-y-2">
          <button
            id="new-entry-button"
            onClick={() => {
              onNewEntry();
              onCloseMobile();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#3A352F] hover:bg-[#2C2823] text-[#FBF9F6] rounded-xl text-xs font-sans font-medium btn-3d cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#8A9A8A]" />
            <span>New Reflection Session</span>
          </button>
        </div>

        {/* Search & Filter Header Bar */}
        <div className="p-3.5 border-b border-[#E0DBCF]/80 space-y-2.5 font-sans bg-[#F2EEE8]/60 backdrop-blur-md">
          {/* Keyword Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A69E94]" />
            <input
              id="sidebar-search-input"
              type="text"
              placeholder="Search reflections, tags, ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 glass-panel rounded-xl text-xs text-[#3A352F] placeholder-[#A69E94] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A] transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A69E94] hover:text-[#3A352F] text-xs cursor-pointer p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Toggle & Category Scroll */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] flex-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#3A352F] text-[#FBF9F6] shadow-xs'
                      : 'glass-pill text-[#7A7369] hover:text-[#3A352F] hover:bg-white/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              id="toggle-advanced-filters-btn"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-1.5 rounded-xl border transition-all shrink-0 cursor-pointer shadow-xs ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-[#3A352F] text-[#FBF9F6] border-[#3A352F]'
                  : 'glass-pill text-[#7A7369] hover:text-[#3A352F] hover:bg-white'
              }`}
              title="Toggle date range and advanced filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Collapsible Advanced Filters Drawer */}
          {showAdvancedFilters && (
            <div className="p-3.5 glass-card-3d rounded-2xl space-y-3 text-[11px] animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Date Filter Presets */}
              <div>
                <label className="block font-semibold text-[#3A352F] mb-1.5 font-serif flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#8A9A8A]" />
                    Date Filter
                  </span>
                  {datePreset !== 'all' && (
                    <span className="text-[10px] text-[#8A9A8A] font-sans font-medium">Active</span>
                  )}
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: '7days', label: 'Last 7d' },
                    { id: '30days', label: 'Last 30d' },
                    { id: 'thisMonth', label: 'This Month' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDatePreset(p.id as DatePreset)}
                      className={`px-2 py-1 rounded-md text-center transition-all cursor-pointer ${
                        datePreset === p.id
                          ? 'bg-[#3A352F] text-[#FBF9F6] font-medium shadow-xs'
                          : 'glass-pill text-[#7A7369] hover:bg-white/80'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Pickers */}
                {datePreset === 'custom' && (
                  <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-[#E0DBCF]/80">
                    <div>
                      <span className="block text-[10px] text-[#7A7369] mb-0.5">Start Date</span>
                      <input
                        type="date"
                        id="filter-start-date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2 py-1 glass-panel rounded text-[10px] text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#7A7369] mb-0.5">End Date</span>
                      <input
                        type="date"
                        id="filter-end-date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2 py-1 glass-panel rounded text-[10px] text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sort Order Selector */}
              <div>
                <label className="block font-semibold text-[#3A352F] mb-1 font-serif flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-[#8A9A8A]" />
                  Sort Order
                </label>
                <select
                  id="filter-sort-order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-2.5 py-1.5 glass-panel rounded-lg text-[11px] text-[#3A352F] focus:outline-none focus:ring-1 focus:ring-[#8A9A8A] cursor-pointer"
                >
                  <option value="newest">Newest Modified First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">Title (A - Z)</option>
                  <option value="turns">Most Dialogue Turns</option>
                </select>
              </div>

              {/* AI Mode Selector */}
              <div>
                <label className="block font-semibold text-[#3A352F] mb-1 font-serif flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#8A9A8A]" />
                  AI Mode
                </label>
                <div className="flex flex-wrap gap-1">
                  {AI_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMode(m.id)}
                      className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                        selectedMode === m.id
                          ? 'bg-[#3A352F] text-[#FBF9F6] font-medium shadow-xs'
                          : 'glass-pill text-[#7A7369] hover:bg-white/80'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Filters action */}
              {activeFiltersCount > 0 && (
                <div className="pt-2 border-t border-[#E0DBCF]/80 flex items-center justify-between">
                  <span className="text-[10px] text-[#7A7369]">
                    {activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'}
                  </span>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 text-[10px] text-rose-700 hover:text-rose-900 font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset filters</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Filter Summary Bar if drawer closed */}
          {!showAdvancedFilters && activeFiltersCount > 0 && (
            <div className="flex items-center justify-between text-[11px] px-1 text-[#7A7369]">
              <span>
                Showing <strong className="text-[#3A352F]">{filteredEntries.length}</strong> of {entries.length}
              </span>
              <button
                onClick={resetAllFilters}
                className="text-[10px] text-rose-700 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Clear {activeFiltersCount} filter(s)</span>
              </button>
            </div>
          )}
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 font-sans">
          {filteredEntries.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-11 h-11 mx-auto rounded-2xl bg-[#EAE4DC] flex items-center justify-center text-[#8A9A8A] mb-3 shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#3A352F]">No reflections match your criteria</p>
              <p className="text-[11px] text-[#7A7369] mt-1 leading-relaxed">
                {activeFiltersCount > 0
                  ? 'Try broadening your keyword search or adjusting the date filters.'
                  : 'Start your very first reflection session with Gemini!'}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="mt-3 px-3 py-1.5 glass-panel rounded-lg text-xs font-medium text-[#3A352F] hover:bg-white transition-colors cursor-pointer shadow-xs"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = selectedEntryId === entry.id;
              const turnCount = entry.turns ? entry.turns.length : 0;
              const lastSnippet =
                entry.turns && entry.turns.length > 0
                  ? entry.turns[entry.turns.length - 1].content
                  : 'No interaction recorded yet.';

              return (
                <div
                  key={entry.id}
                  id={`entry-item-${entry.id}`}
                  onClick={() => {
                    onSelectEntry(entry);
                    onCloseMobile();
                  }}
                  className={`group relative p-3.5 rounded-2xl border text-left cursor-pointer transition-all transform-gpu ${
                    isSelected
                      ? 'bg-white border-[#8A9A8A] shadow-md ring-2 ring-[#8A9A8A]/30 scale-[1.01]'
                      : 'glass-card-3d'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-xs font-serif font-semibold text-[#3A352F] truncate flex-1">
                      {entry.title || 'Untitled Reflection'}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full glass-pill text-[#7A7369] font-sans font-medium shrink-0">
                      {entry.category || 'Reflection'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#7A7369] line-clamp-2 leading-relaxed mb-2.5">
                    {lastSnippet}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#A69E94]">
                    <span className="flex items-center gap-1 text-[#7A7369]">
                      <Calendar className="w-3 h-3 text-[#A69E94]" />
                      {formatDate(entry.updatedAt || entry.createdAt)}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[#8A9A8A] font-medium">
                        <Sparkles className="w-2.5 h-2.5 text-[#8A9A8A]" />
                        {turnCount} {turnCount === 1 ? 'turn' : 'turns'}
                      </span>

                      <button
                        onClick={(e) => onDeleteEntry(entry.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-700 p-1 rounded-lg transition-all cursor-pointer hover:bg-rose-50"
                        title="Delete reflection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Entry Count & Quick Export */}
        <div className="p-3.5 border-t border-[#E0DBCF]/80 bg-[#EAE4DC]/60 backdrop-blur-md text-[11px] font-sans text-[#7A7369] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8A9A8A] animate-pulse"></span>
            <span>{filteredEntries.length} of {entries.length} saved</span>
          </div>

          <button
            id="sidebar-export-btn"
            onClick={() => onOpenExport(filteredEntries)}
            className="inline-flex items-center gap-1 px-3 py-1.5 glass-panel hover:bg-white text-[#3A352F] rounded-xl text-[11px] font-medium shadow-xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
            title="Export journal entries in JSON or Plain Text"
          >
            <FileDown className="w-3.5 h-3.5 text-[#8A9A8A]" />
            <span>Export</span>
          </button>
        </div>
      </aside>
    </>
  );
};
