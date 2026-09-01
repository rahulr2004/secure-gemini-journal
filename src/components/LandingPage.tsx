import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Lock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Cpu,
  Database,
  Calendar,
  Layers,
  FileCheck,
  TrendingUp,
  Server,
  Zap
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface LandingPageProps {
  onOpenThreatModel: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenThreatModel }) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeDemoTab, setActiveDemoTab] = useState<'reflection' | 'synthesis' | 'security'>('reflection');

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing authentication.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        setAuthError('Network request to Google Auth service failed. Please check your internet connection, ensure third-party cookies or popups are not blocked, or open the app in a new tab.');
      } else {
        setAuthError(err.message || 'Unable to complete sign-in. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FBF9F6] text-[#3A352F] flex flex-col justify-between selection:bg-[#8A9A8A]/20 overflow-x-hidden font-sans">
      {/* Ambient 3D Glowing Mesh Background Orbs */}
      <div className="absolute top-[-8%] left-[12%] w-[480px] h-[480px] ambient-glow-1 rounded-full pointer-events-none blur-3xl opacity-50 animate-pulse" />
      <div className="absolute top-[28%] right-[-6%] w-[520px] h-[520px] ambient-glow-2 rounded-full pointer-events-none blur-3xl opacity-60" />
      <div className="absolute bottom-[-10%] left-[25%] w-[580px] h-[580px] ambient-glow-3 rounded-full pointer-events-none blur-3xl opacity-45" />

      {/* Navigation Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#3A352F] text-[#FBF9F6] flex items-center justify-center shadow-lg border border-white/20 transform-gpu hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-[#8A9A8A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold tracking-tight text-[#3A352F] text-lg sm:text-xl">
                Gemini Journal
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#8A9A8A]/15 text-[#3A352F] font-semibold border border-[#8A9A8A]/30">
                Firestore Secured
              </span>
            </div>
            <p className="text-[11px] text-[#7A7369]">Multi-turn AI Reflection Vault &amp; Synthesis Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenThreatModel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#7A7369] hover:text-[#3A352F] glass-panel hover:bg-white rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer transform-gpu hover:-translate-y-0.5"
          >
            <ShieldCheck className="w-4 h-4 text-[#8A9A8A]" />
            <span className="hidden sm:inline">Threat Model &amp; Architecture</span>
            <span className="sm:hidden">Security</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-10 sm:py-16 flex flex-col items-center text-center">
        {/* Floating Top Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel text-xs font-medium text-[#3A352F] mb-6 shadow-md border border-white/90 animate-float-slow">
          <div className="w-2 h-2 rounded-full bg-[#8A9A8A] animate-ping" />
          <Sparkles className="w-4 h-4 text-[#8A9A8A]" />
          <span>Gemini 3.6 Flash &bull; Cloud Firestore Isolation &bull; Sunday Synthesis Agent</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-[#3A352F] leading-[1.18] max-w-3xl drop-shadow-xs">
          A quiet space to write, reflect, and discover patterns with AI.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-[#7A7369] max-w-2xl leading-relaxed font-serif">
          Capture multi-turn personal reflections, set purposeful goals, and unlock autonomous weekly syntheses. Every entry is protected by owner-bound Firestore security rules.
        </p>

        {/* Primary Call to Action */}
        <div className="mt-9 flex flex-col items-center gap-4 w-full max-w-md">
          <div className="w-full p-2 glass-panel rounded-2xl shadow-xl border border-white/80">
            <button
              id="google-signin-button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#3A352F] via-[#2C2823] to-[#3A352F] hover:from-[#25221E] hover:to-[#25221E] text-[#FBF9F6] font-medium rounded-xl btn-3d disabled:opacity-60 cursor-pointer text-sm shadow-md transition-all transform-gpu hover:-translate-y-0.5"
            >
              {isSigningIn ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 drop-shadow-xs" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span className="tracking-wide">{isSigningIn ? 'Authenticating with Google...' : 'Continue with Google'}</span>
              {!isSigningIn && <ArrowRight className="w-4 h-4 text-[#8A9A8A]" />}
            </button>
          </div>

          {authError && (
            <div className="w-full text-xs text-rose-800 bg-rose-50/95 border border-rose-200 p-3.5 rounded-xl text-left shadow-sm">
              {authError}
            </div>
          )}

          <p className="text-xs text-[#7A7369] flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#8A9A8A]" />
            Passwordless federated identity. No credentials or passwords stored.
          </p>
        </div>

        {/* Interactive Feature Demo Showcase */}
        <div className="mt-14 w-full max-w-4xl text-left">
          {/* Demo tab selectors */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setActiveDemoTab('reflection')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeDemoTab === 'reflection'
                  ? 'bg-[#3A352F] text-white shadow-sm'
                  : 'glass-panel text-[#7A7369] hover:text-[#3A352F]'
              }`}
            >
              Multi-Turn Reflection
            </button>
            <button
              onClick={() => setActiveDemoTab('synthesis')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeDemoTab === 'synthesis'
                  ? 'bg-[#3A352F] text-white shadow-sm'
                  : 'glass-panel text-[#7A7369] hover:text-[#3A352F]'
              }`}
            >
              Sunday Synthesis Agent
            </button>
            <button
              onClick={() => setActiveDemoTab('security')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeDemoTab === 'security'
                  ? 'bg-[#3A352F] text-white shadow-sm'
                  : 'glass-panel text-[#7A7369] hover:text-[#3A352F]'
              }`}
            >
              Zero-Trust Isolation
            </button>
          </div>

          {/* Tab content view */}
          <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] shadow-2xl space-y-4">
            {activeDemoTab === 'reflection' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E0DBCF]">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-sm text-[#3A352F]">Morning Clarity Session</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">Reflection Mode</span>
                  </div>
                  <span className="text-xs text-[#7A7369]">Firestore Status: Synced</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-[#E0DBCF] text-xs text-[#3A352F] leading-relaxed">
                  <span className="font-bold text-[#7A7369] block text-[10px] uppercase mb-1">Your Journal Entry</span>
                  &ldquo;I spent the morning prioritizing deep focus work over reactive messaging. It felt uncomfortable at first, but gave me clarity on my creative roadmap.&rdquo;
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 leading-relaxed flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-800 block text-[10px] uppercase mb-1">Gemini 3.6 Flash Synthesis</span>
                    &ldquo;You noted discomfort during boundary setting. What internal belief makes defending quiet focus feel unnatural, and how can you practice this again tomorrow?&rdquo;
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'synthesis' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E0DBCF]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span className="font-serif font-bold text-sm text-[#3A352F]">Sunday Synthesis Agent (Cloud Scheduled)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">Autonomous Proposal</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <p className="font-serif font-semibold text-sm text-[#3A352F]">Weekly Pattern: Deep Work Boundaries</p>
                  <p className="text-[#5A534A]">Across 6 reflection sessions this week, you consistently experienced reduced anxiety when batching communications before noon.</p>
                  <div className="pt-1 flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-emerald-800">Suggested Intention:</span>
                    <span className="text-[#3A352F]">Protect 9:00 - 11:30 AM for uninterrupted deep creative tasks.</span>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'security' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E0DBCF]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#8A9A8A]" />
                    <span className="font-serif font-bold text-sm text-[#3A352F]">Owner-Bound Firestore Rules Verification</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold">Strict Rule 2.0</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#25221E] text-[#E0DBCF] font-mono text-[11px] leading-relaxed overflow-x-auto">
                  <code>
                    match /users/&#123;userId&#125;/entries/&#123;entryId&#125; &#123;<br />
                    &nbsp;&nbsp;allow read, write: if request.auth != null &amp;&amp; request.auth.uid == userId;<br />
                    &#125;
                  </code>
                </div>
                <p className="text-xs text-[#7A7369]">Cross-user queries and unauthenticated reads evaluate to immediate 403 Permission Denied at database level.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3D Glassmorphic Feature Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left font-sans">
          <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF]">
            <div className="w-11 h-11 rounded-2xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center mb-4 shadow-md border border-white/20">
              <Database className="w-5 h-5 text-[#8A9A8A]" />
            </div>
            <h3 className="text-sm font-semibold text-[#3A352F] mb-1.5 font-serif text-base">
              User-Isolated Storage
            </h3>
            <p className="text-xs text-[#7A7369] leading-relaxed">
              Every document is strictly partitioned in Cloud Firestore under your UID with database-level owner-bound rules.
            </p>
          </div>

          <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF]">
            <div className="w-11 h-11 rounded-2xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center mb-4 shadow-md border border-white/20">
              <Sparkles className="w-5 h-5 text-[#8A9A8A]" />
            </div>
            <h3 className="text-sm font-semibold text-[#3A352F] mb-1.5 font-serif text-base">
              Multi-Turn AI Reflections
            </h3>
            <p className="text-xs text-[#7A7369] leading-relaxed">
              Deepen journal entries with conversational guidance, empathetic questions, and instant synthesis cards.
            </p>
          </div>

          <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF]">
            <div className="w-11 h-11 rounded-2xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center mb-4 shadow-md border border-white/20">
              <Cpu className="w-5 h-5 text-[#8A9A8A]" />
            </div>
            <h3 className="text-sm font-semibold text-[#3A352F] mb-1.5 font-serif text-base">
              Resilient Availability
            </h3>
            <p className="text-xs text-[#7A7369] leading-relaxed">
              Automated 4-tier model fallback ladder (Gemini 3.6 Flash, 3.1 Lite, Latest, 3.7) ensures uninterrupted sessions.
            </p>
          </div>
        </div>

        {/* Factual Technical Trust Verification Grid */}
        <div className="mt-12 w-full p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] text-left">
          <h4 className="font-serif font-bold text-sm text-[#3A352F] mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#8A9A8A]" />
            <span>Factual Technical Trust &amp; Architecture Standards</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-[#E0DBCF]">
              <span className="font-semibold text-[#3A352F] block mb-0.5">OWASP Mitigation</span>
              <span className="text-[11px] text-[#7A7369]">Strict schema sanitization &amp; indirect prompt defense</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#E0DBCF]">
              <span className="font-semibold text-[#3A352F] block mb-0.5">Secret Manager</span>
              <span className="text-[11px] text-[#7A7369]">Zero client API keys; secure server proxying</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#E0DBCF]">
              <span className="font-semibold text-[#3A352F] block mb-0.5">Cloud Run Ready</span>
              <span className="text-[11px] text-[#7A7369]">Single-port unified container ingress on 3000</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#E0DBCF]">
              <span className="font-semibold text-[#3A352F] block mb-0.5">Human in the Loop</span>
              <span className="text-[11px] text-[#7A7369]">Proposals require manual review before save</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-[#E0DBCF]/80 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A7369] gap-3">
        <div className="flex items-center gap-2">
          <span>Gemini AI Journal &amp; Reflection Vault</span>
          <span>&bull;</span>
          <span>Cloud Run &amp; Firestore Verified</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onOpenThreatModel} className="hover:text-[#3A352F] transition-colors cursor-pointer">
            Threat Model &amp; Architecture Spec
          </button>
        </div>
      </footer>
    </div>
  );
};
