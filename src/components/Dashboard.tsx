import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  User as UserIcon,
  Sparkles,
  Plus,
  Compass,
  FileDown,
  Settings,
  Edit3,
  TrendingUp,
  Target,
  Brain,
  Bell
} from 'lucide-react';

import { UserProfile, JournalEntry } from '../types';
import {
  logOut,
  subscribeToUserEntries,
  subscribeToUserProfile,
  deleteJournalEntry,
  saveJournalEntry
} from '../lib/firebase';
import { JournalSidebar } from './JournalSidebar';
import { JournalEditor } from './JournalEditor';
import { RetryBanner } from './RetryBanner';
import { ProfileModal } from './ProfileModal';
import { ExportModal } from './ExportModal';
import { TrendAnalyticsChart } from './TrendAnalyticsChart';
import { GoalsModal } from './GoalsModal';
import { MemoryModal } from './MemoryModal';
import { NotificationModal } from './NotificationModal';
import { SundaySynthesisBanner } from './SundaySynthesisBanner';
import { AdminView } from './AdminView';

interface DashboardProps {
  user: UserProfile;
  onOpenThreatModel: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, onOpenThreatModel }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);
  const [exportTargetEntry, setExportTargetEntry] = useState<JournalEntry | null>(null);
  const [showTrends, setShowTrends] = useState(true);


  // Subscribe to real-time User Profile in Firestore
  useEffect(() => {
    if (!initialUser.uid) return;

    const unsubscribe = subscribeToUserProfile(
      initialUser.uid,
      (profile) => {
        if (profile) {
          setCurrentUser(profile);
        }
      },
      (err) => {
        console.warn('Profile subscription note:', err);
      }
    );

    return () => unsubscribe();
  }, [initialUser.uid]);

  // Subscribe to real-time entries for this authenticated user
  useEffect(() => {
    if (!currentUser.uid) return;

    setIsLoadingEntries(true);
    const unsubscribe = subscribeToUserEntries(
      currentUser.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
        setIsLoadingEntries(false);

        // If no entry is currently selected or the selected entry was deleted, select the first entry
        setSelectedEntryId((prev) => {
          if (prev && fetchedEntries.some((e) => e.id === prev)) {
            return prev;
          }
          return fetchedEntries.length > 0 ? fetchedEntries[0].id : null;
        });
      },
      (err) => {
        console.error('Real-time entries subscription error:', err);
        setErrorBanner('Failed to synchronize journal entries from Cloud Firestore.');
        setIsLoadingEntries(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser.uid]);

  // Create a brand new reflection session
  const handleCreateNewEntry = useCallback(async () => {
    const newEntryId = `entry-${Date.now()}`;
    const newEntry: JournalEntry = {
      id: newEntryId,
      userId: currentUser.uid,
      title: 'New Reflection',
      category: 'Reflection',
      tags: [],
      aiMode: currentUser.preferredTone || 'reflection',
      turns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveJournalEntry(currentUser.uid, newEntry);
      setSelectedEntryId(newEntryId);
    } catch (err: any) {
      console.error('Failed to create new entry in Firestore:', err);
      setErrorBanner('Failed to initialize new reflection entry.');
    }
  }, [currentUser.uid, currentUser.preferredTone]);

  // Handle entry deletion
  const handleDeleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this reflection entry from Firestore?')) {
      return;
    }

    try {
      await deleteJournalEntry(currentUser.uid, entryId);
      if (selectedEntryId === entryId) {
        const remaining = entries.filter((item) => item.id !== entryId);
        setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      setErrorBanner('Failed to delete entry from Firestore.');
    }
  };

  // Open Export Modal for specific entry or entire vault
  const handleOpenExport = (targetEntryOrList?: JournalEntry | JournalEntry[]) => {
    if (targetEntryOrList && !Array.isArray(targetEntryOrList)) {
      setExportTargetEntry(targetEntryOrList);
    } else {
      setExportTargetEntry(activeEntry || null);
    }
    setIsExportModalOpen(true);
  };

  // Currently selected active entry
  const activeEntry = entries.find((e) => e.id === selectedEntryId);

  // If Admin View is toggled
  if (isAdminViewOpen) {
    return <AdminView user={currentUser} onBack={() => setIsAdminViewOpen(false)} />;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#FBF9F6] text-[#3A352F] overflow-hidden selection:bg-[#8A9A8A]/20">
      {/* Top Glassmorphic Navbar */}
      <header className="h-16 border-b border-[#E0DBCF]/80 glass-panel px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl text-[#7A7369] hover:text-[#3A352F] hover:bg-white glass-pill lg:hidden cursor-pointer shadow-2xs"
            title="Toggle entries list"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#3A352F] text-[#FBF9F6] flex items-center justify-center shadow-md border border-white/20">
              <BookOpen className="w-4 h-4 text-[#8A9A8A]" />
            </div>
            <div>
              <span className="font-serif font-semibold text-[#3A352F] text-base hidden sm:inline">
                Gemini AI Journal &amp; Reflection Vault
              </span>
              <span className="font-serif font-semibold text-[#3A352F] text-sm sm:hidden">
                Gemini Journal
              </span>
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 sm:gap-3 font-sans">
          {/* RBAC Admin View Button (Visible to admins) */}
          {(currentUser.role === 'admin' || currentUser.email?.toLowerCase() === 'rahulheamanth2004@gmail.com') && (
            <button
              id="admin-view-header-button"
              onClick={() => setIsAdminViewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-950 bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 border border-purple-300 rounded-xl shadow-2xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
              title="Open Security & AI Operations Console"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>Admin Console</span>
            </button>
          )}

          {/* Goals Engine Button */}
          <button
            id="dashboard-goals-header-button"
            onClick={() => setIsGoalsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3A352F] glass-panel hover:bg-white rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
            title="Manage Personal Goals & AI Action Steps"
          >
            <Target className="w-3.5 h-3.5 text-[#8A9A8A]" />
            <span className="hidden lg:inline">Goals</span>
          </button>

          {/* AI Memory Button */}
          <button
            id="dashboard-memory-header-button"
            onClick={() => setIsMemoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3A352F] glass-panel hover:bg-white rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
            title="View & Manage Private AI Context Memories"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden lg:inline">Memory</span>
          </button>

          {/* Smart Notifications Button */}
          <button
            id="dashboard-notifications-header-button"
            onClick={() => setIsNotificationModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3A352F] glass-panel hover:bg-white rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
            title="Configure Safe Email & Webhook Digest Notifications"
          >
            <Bell className="w-3.5 h-3.5 text-[#8A9A8A]" />
            <span className="hidden xl:inline">Notifications</span>
          </button>

          {/* 30-Day Mood & Reflection Trends Toggle */}
          <button
            id="dashboard-trends-header-button"
            onClick={() => setShowTrends((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer transform-gpu hover:-translate-y-0.5 ${
              showTrends
                ? 'bg-[#3A352F] text-[#FBF9F6] shadow-md border border-white/10'
                : 'glass-panel text-[#3A352F] hover:bg-white hover:shadow-xs'
            }`}
            title="Toggle 30-Day Reflection Frequency & Mood Trends Chart"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#8A9A8A]" />
            <span className="hidden md:inline">30-Day Trends</span>
            <span className="md:hidden">Trends</span>
          </button>

          {/* Quick Export Vault Button */}
          <button
            id="dashboard-export-header-button"
            onClick={() => handleOpenExport()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3A352F] glass-panel hover:bg-white rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
            title="Export all journal entries to Text or JSON"
          >
            <FileDown className="w-3.5 h-3.5 text-[#8A9A8A]" />
            <span className="hidden md:inline">Export Vault</span>
            <span className="md:hidden">Export</span>
          </button>

          {/* Threat Model Modal Button */}
          <button
            id="threat-model-header-button"
            onClick={onOpenThreatModel}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7A7369] hover:text-[#3A352F] glass-panel hover:bg-white rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
          >
            <ShieldCheck className="w-4 h-4 text-[#8A9A8A]" />
            <span>Threat Model</span>
          </button>


          {/* User Profile Badge (Clickable for Profile Management) */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E0DBCF]/80">
            <button
              id="user-profile-badge-btn"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 p-1.5 rounded-2xl glass-pill hover:bg-white transition-all text-left cursor-pointer group shadow-2xs transform-gpu hover:-translate-y-0.5"
              title="Edit User Profile &amp; Settings"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-[#8A9A8A]/50 group-hover:border-[#8A9A8A] transition-colors shadow-2xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center text-xs font-medium shadow-2xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}

              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-[#3A352F] leading-none group-hover:text-[#2C2823]">
                    {currentUser.displayName || 'Reflective Journaler'}
                  </p>
                  <Edit3 className="w-2.5 h-2.5 text-[#A69E94] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-[#7A7369] leading-tight truncate max-w-[120px] mt-0.5">
                  {currentUser.email || 'Google Account'}
                </p>
              </div>
            </button>

            <button
              id="logout-button"
              onClick={() => logOut()}
              className="p-2 text-[#A69E94] hover:text-rose-700 rounded-xl glass-pill hover:bg-white transition-all cursor-pointer shadow-2xs"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Error banner notification if any */}
      {errorBanner && (
        <div className="p-2 bg-[#FBF9F6] border-b border-[#E0DBCF]">
          <RetryBanner
            message={errorBanner}
            onDismiss={() => setErrorBanner(null)}
          />
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar History with Search, Date Range Filter & Sort */}
        <JournalSidebar
          entries={entries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={(entry) => setSelectedEntryId(entry.id)}
          onNewEntry={handleCreateNewEntry}
          onDeleteEntry={handleDeleteEntry}
          onOpenExport={handleOpenExport}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onFilteredEntriesChange={setFilteredEntries}
        />

        {/* Center Main Editor View */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#FBF9F6] overflow-y-auto">
          {/* Sunday Synthesis Proposal Banner (Autonomous Orchestration Layer) */}
          <div className="px-6 pt-4 max-w-5xl mx-auto w-full">
            <SundaySynthesisBanner
              user={currentUser}
              allEntries={entries}
              onExplorePrompt={(promptText) => {
                if (activeEntry && activeEntry.turns.length === 0) {
                  // Loaded directly into current draft
                } else {
                  handleCreateNewEntry();
                }
              }}
            />
          </div>

          {/* 30-Day Trend & Mood Analytics Line Chart */}
          {showTrends && (
            <TrendAnalyticsChart
              entries={entries}
              isOpen={showTrends}
              onToggleOpen={() => setShowTrends(false)}
            />
          )}

          {isLoadingEntries ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#7A7369] p-8">
              <div className="w-9 h-9 border-3 border-[#E0DBCF] border-t-[#8A9A8A] rounded-full animate-spin mb-3" />
              <p className="text-xs font-sans font-medium text-[#7A7369]">Connecting to Cloud Firestore...</p>
            </div>
          ) : activeEntry ? (
            <div className="flex-1 min-h-[550px] flex flex-col">
              <JournalEditor
                key={activeEntry.id}
                userId={currentUser.uid}
                entry={activeEntry}
                allEntries={entries}
                userProfile={currentUser}
                onEntryUpdated={(updated) => {
                  setEntries((prev) =>
                    prev.map((item) => (item.id === updated.id ? updated : item))
                  );
                }}
                onOpenExport={(entry) => handleOpenExport(entry || activeEntry)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl glass-panel flex items-center justify-center text-[#8A9A8A] mb-4 shadow-lg border border-white/80 animate-float-slow">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif font-normal text-[#3A352F]">
                Welcome to your Reflection Journal
              </h3>
              <p className="text-xs font-sans text-[#7A7369] mt-2 leading-relaxed max-w-sm">
                Your entries and conversations with Gemini are securely stored in your private Firestore collection with owner-bound rules.
              </p>
              <button
                onClick={handleCreateNewEntry}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#3A352F] hover:bg-[#2C2823] text-[#FBF9F6] rounded-2xl text-xs font-sans font-medium btn-3d cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#8A9A8A]" />
                Start Your First Reflection
              </button>
            </div>
          )}
        </main>
      </div>

      {/* User Profile Management Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        entries={entries}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
        onOpenExport={() => handleOpenExport()}
      />

      {/* Vault & History Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
          setExportTargetEntry(null);
        }}
        entries={entries}
        filteredEntries={filteredEntries}
        user={currentUser}
        selectedEntry={exportTargetEntry}
      />

      {/* Goals Engine Modal */}
      <GoalsModal
        userId={currentUser.uid}
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        onSelectPromptForReflection={(promptText) => {
          handleCreateNewEntry();
        }}
      />

      {/* AI Memory Modal */}
      <MemoryModal
        userId={currentUser.uid}
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
      />

      {/* Notification Settings Modal */}
      <NotificationModal
        user={currentUser}
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </div>
  );
};

