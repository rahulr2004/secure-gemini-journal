import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, Database, Cpu, Globe, Key, X } from 'lucide-react';
import { ThreatZoneSummary } from '../types';

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const THREAT_ZONES_DATA: ThreatZoneSummary[] = [
  {
    zone: '1. Input Surfaces',
    scope: 'User prompts, multi-turn reflections, journal entry uploads & tags',
    threats: [
      'Prompt injection & jailbreaking attempts',
      'Indirect injection via malicious untrusted text',
      'Oversized or malformed JSON payloads'
    ],
    countermeasures: [
      'Express body-parser size restriction (10MB)',
      'Server-side payload schema and type validation',
      'System instructions treat user text strictly as reflective data, never executable instructions'
    ],
    status: 'Protected'
  },
  {
    zone: '2. Planning & Reasoning',
    scope: 'Gemini 3.6 Flash model routing & mode configuration',
    threats: [
      'Hallucinated or unsafe therapeutic/medical claims',
      'Model service outages or API rate limit exhaustions (429/503)'
    ],
    countermeasures: [
      'Structured persona constraints and disclaimers',
      'Automated Resilient Model Fallback Ladder (3.6-flash -> 3.1-flash-lite -> flash-latest -> 3.7-flash)',
      'Deterministic temperature & prompt conditioning'
    ],
    status: 'Enforced'
  },
  {
    zone: '3. Tool & Server Execution',
    scope: 'Express backend endpoints (/api/gemini/reflect, /api/gemini/summarize)',
    threats: [
      'Unauthenticated API abuse and SSRF',
      'Exposing secret Gemini API keys to client browsers'
    ],
    countermeasures: [
      'All Gemini SDK calls encapsulated purely on backend server',
      'Zero frontend exposure of GEMINI_API_KEY',
      'Input sanitization preventing code execution sinks'
    ],
    status: 'Protected'
  },
  {
    zone: '4. Memory & State',
    scope: 'Cloud Firestore database collections (/users/{userId}/...)',
    threats: [
      'Cross-user data leakage and horizontal privilege escalation',
      'Unauthorized document tampering or bulk data extraction',
      'Broken object level authorization (BOLA)'
    ],
    countermeasures: [
      'Owner-bound Firestore security rules: allow read, write: if request.auth != null && request.auth.uid == userId',
      'Complete default-deny rules on unlisted root documents',
      'Strict user-isolated paths (/users/{userId}/profile/, /users/{userId}/entries/ and /users/{userId}/interactions/)',
      'Recursive stripping of undefined values to avoid corrupt writes'
    ],
    status: 'Enforced'
  },
  {
    zone: '5. Inter-System Communication',
    scope: 'Firebase Auth token exchanges and Google GenAI API networking',
    threats: [
      'Credential interception and token replay attacks',
      'Hardcoded secrets in version control'
    ],
    countermeasures: [
      'Federated Google OAuth 2.0 via Firebase Auth; zero raw passwords stored',
      'Secret management via Google Cloud Secret Manager / runtime environment variables',
      'HTTPS TLS encrypted transport on Cloud Run runtime proxy'
    ],
    status: 'Protected'
  }
];

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  React.useEffect(() => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A352F]/60 backdrop-blur-md animate-in fade-in duration-200 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="glass-card-3d rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-white/80 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E0DBCF]/80 flex items-center justify-between glass-panel-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3A352F] text-[#8A9A8A] flex items-center justify-center shadow-md border border-white/20">
              <ShieldCheck className="w-5 h-5 text-[#8A9A8A]" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-semibold text-[#3A352F]">Agentic Threat Model &amp; Security Architecture</h2>
              <p className="text-xs text-[#7A7369] mt-0.5">Evaluation across the 5 Threat Zones &amp; OWASP Top 10 Protections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7A7369] hover:text-[#3A352F] glass-pill hover:bg-white transition-all cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Stat Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl glass-card-3d flex items-center gap-3.5 shadow-sm transform-gpu hover:-translate-y-0.5 transition-transform">
              <div className="w-9 h-9 rounded-xl bg-[#8A9A8A]/15 text-[#4E614E] flex items-center justify-center shrink-0 border border-[#8A9A8A]/30">
                <Lock className="w-4 h-4 text-[#5C6E5C]" />
              </div>
              <div>
                <div className="text-[11px] text-[#7A7369] font-medium">User Isolation</div>
                <div className="text-xs font-semibold text-[#3A352F] font-serif">Owner-Bound Rules</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl glass-card-3d flex items-center gap-3.5 shadow-sm transform-gpu hover:-translate-y-0.5 transition-transform">
              <div className="w-9 h-9 rounded-xl bg-[#8A9A8A]/15 text-[#4E614E] flex items-center justify-center shrink-0 border border-[#8A9A8A]/30">
                <Key className="w-4 h-4 text-[#5C6E5C]" />
              </div>
              <div>
                <div className="text-[11px] text-[#7A7369] font-medium">Secret Management</div>
                <div className="text-xs font-semibold text-[#3A352F] font-serif">Backend Server-Only</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl glass-card-3d flex items-center gap-3.5 shadow-sm transform-gpu hover:-translate-y-0.5 transition-transform">
              <div className="w-9 h-9 rounded-xl bg-[#8A9A8A]/15 text-[#4E614E] flex items-center justify-center shrink-0 border border-[#8A9A8A]/30">
                <Cpu className="w-4 h-4 text-[#5C6E5C]" />
              </div>
              <div>
                <div className="text-[11px] text-[#7A7369] font-medium">AI Reliability</div>
                <div className="text-xs font-semibold text-[#3A352F] font-serif">4-Tier Fallback Ladder</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm border border-[#E0DBCF]">
            <table className="w-full text-left text-xs text-[#3A352F]">
              <thead className="glass-panel-subtle text-[#3A352F] font-semibold border-b border-[#E0DBCF]">
                <tr>
                  <th className="py-3.5 px-4 w-40 font-serif">Threat Zone</th>
                  <th className="py-3.5 px-4 w-48">Scope</th>
                  <th className="py-3.5 px-4">Identified Risks &amp; Threats</th>
                  <th className="py-3.5 px-4">Countermeasures &amp; Controls</th>
                  <th className="py-3.5 px-4 w-24 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DBCF]/80">
                {THREAT_ZONES_DATA.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/50 transition-colors">
                    <td className="py-3.5 px-4 font-serif font-semibold text-[#3A352F] align-top text-sm">
                      {item.zone}
                    </td>
                    <td className="py-3.5 px-4 text-[#7A7369] align-top">
                      {item.scope}
                    </td>
                    <td className="py-3.5 px-4 text-[#7A7369] align-top">
                      <ul className="list-disc list-inside space-y-1">
                        {item.threats.map((t, i) => (
                          <li key={i}><span className="text-[#3A352F]">{t}</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3.5 px-4 text-[#7A7369] align-top">
                      <ul className="list-disc list-inside space-y-1">
                        {item.countermeasures.map((c, i) => (
                          <li key={i}><span className="text-[#3A352F]">{c}</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3.5 px-4 align-top text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#8A9A8A]/15 text-[#4E614E] border border-[#8A9A8A]/30 shadow-2xs">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Firestore Rules Excerpt */}
          <div className="bg-[#3A352F] text-[#FBF9F6] p-5 rounded-2xl text-xs font-mono shadow-inner border border-white/10">
            <div className="text-[#A69E94] mb-2.5 font-sans font-medium flex items-center gap-2">
              <Database className="w-4 h-4 text-[#8A9A8A]" />
              Active Firestore Security Rules (firestore.rules)
            </div>
            <pre className="text-[#8A9A8A] leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E0DBCF]/80 glass-panel-subtle flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#3A352F] hover:bg-[#2C2823] text-[#FBF9F6] rounded-xl text-xs font-medium btn-3d cursor-pointer"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};

