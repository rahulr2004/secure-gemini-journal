import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  Brain,
  Zap,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { SynthesisProposal, UserProfile, JournalEntry, PersonalGoal } from '../types';
import {
  subscribeToPendingProposals,
  updateProposalStatus,
  saveSynthesisProposal
} from '../lib/firebase';

interface SundaySynthesisBannerProps {
  user: UserProfile;
  allEntries: JournalEntry[];
  onExplorePrompt: (promptText: string) => void;
}

export const SundaySynthesisBanner: React.FC<SundaySynthesisBannerProps> = ({
  user,
  allEntries,
  onExplorePrompt
}) => {
  const [proposals, setProposals] = useState<SynthesisProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Subscribe to real-time pending proposals for this user
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeToPendingProposals(user.uid, (data) => {
      setProposals(data);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const activeProposal = proposals[0] || null;

  const handleAccept = async (proposal: SynthesisProposal) => {
    try {
      // 1. Update proposal status in Firestore
      await updateProposalStatus(user.uid, proposal.id, 'accepted');

      // 2. PART B: Trigger webhook if configured (safe, zero-leakage payload)
      if (user.notifications?.webhookUrl) {
        fetch('/api/notifications/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: user.notifications.webhookUrl,
            event: 'synthesis_proposal_accepted',
            title: proposal.title,
            summary: proposal.summary,
            timestamp: new Date().toISOString()
          })
        }).catch((err) => console.warn('Webhook trigger non-fatal error:', err));
      }

      // 3. Reuse existing human-approved exploration flow
      onExplorePrompt(proposal.suggestedPrompt);
      setStatusMessage('Synthesis accepted. Reflection prompt loaded into editor!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Error accepting proposal:', err);
    }
  };

  const handleDismiss = async (proposalId: string) => {
    try {
      await updateProposalStatus(user.uid, proposalId, 'dismissed');
    } catch (err: any) {
      console.error('Error dismissing proposal:', err);
    }
  };

  const handleRunScheduledJobTest = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      // Collect read-only summaries across past 7 days of entries
      const pastWeekEntries = allEntries.slice(0, 5).map(e => ({
        title: e.title,
        category: e.category,
        turnCount: e.turns.length,
        summary: e.summary || ''
      }));

      const res = await fetch('/jobs/weekly-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          recentEntries: pastWeekEntries,
          goalSummary: 'Active focus on mindfulness, daily focus, and personal balance',
          moodSummary: 'Calm, thoughtful, and steady',
          locationSummary: 'Quiet personal workspace'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.proposal) {
        throw new Error(data.error || 'Failed to generate weekly synthesis.');
      }

      // Save proposal with status 'pending' (human-in-the-loop)
      await saveSynthesisProposal(user.uid, data.proposal);
      setStatusMessage('Autonomous Sunday Synthesis completed. New proposal ready for review!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Error testing synthesis job:', err);
      setStatusMessage('Could not run synthesis job at this time.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!activeProposal) {
    return (
      <div className="mb-4">
        {statusMessage && (
          <div className="p-3 mb-2 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 font-sans animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="p-4 sm:p-5 rounded-3xl glass-card-3d border border-amber-400/40 bg-gradient-to-br from-amber-50/80 via-white/90 to-emerald-50/70 shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300/40 shadow-xs">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif font-semibold text-sm sm:text-base text-[#3A352F]">
                  {activeProposal.title}
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100/90 text-amber-900 font-semibold border border-amber-200">
                  Sunday Synthesis Agent (Proposal)
                </span>
              </div>
              <p className="text-xs text-[#7A7369] mt-1 leading-relaxed max-w-2xl font-serif">
                {activeProposal.summary}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleDismiss(activeProposal.id)}
            className="text-[#A69E94] hover:text-[#3A352F] p-1.5 rounded-xl hover:bg-black/5 transition-colors cursor-pointer shrink-0"
            title="Dismiss proposal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Key themes chips */}
        {activeProposal.keyThemes && activeProposal.keyThemes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 pl-12 sm:pl-13">
            <span className="text-[11px] text-[#7A7369] font-medium mr-1">Weekly Themes:</span>
            {activeProposal.keyThemes.map((theme, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/90 border border-[#E0DBCF] text-[#3A352F]"
              >
                #{theme}
              </span>
            ))}
          </div>
        )}

        {/* Suggested Action & Reflection Prompt */}
        <div className="pl-12 sm:pl-13 space-y-2 pt-1 border-t border-amber-200/50">
          <div className="text-xs text-[#3A352F] bg-white/60 p-2.5 rounded-xl border border-[#E0DBCF]/60">
            <span className="font-semibold text-emerald-800 block text-[11px] uppercase tracking-wider mb-0.5">
              Suggested Intention for the Week
            </span>
            <span className="text-[#5A534A]">{activeProposal.suggestedAction}</span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
            <span className="text-xs text-[#7A7369] italic">
              &ldquo;{activeProposal.suggestedPrompt}&rdquo;
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDismiss(activeProposal.id)}
                className="px-3 py-1.5 text-xs text-[#7A7369] hover:text-[#3A352F] rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleAccept(activeProposal)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#3A352F] hover:bg-[#25221E] text-white text-xs font-medium rounded-xl shadow-xs transition-all cursor-pointer transform-gpu hover:-translate-y-0.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#8A9A8A]" />
                <span>Accept &amp; Journal</span>
                <ArrowRight className="w-3 h-3 text-[#8A9A8A]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
