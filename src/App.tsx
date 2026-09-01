import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { UserProfile } from './types';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ThreatModelModal } from './components/ThreatModelModal';
import { BookOpen } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isThreatModalOpen, setIsThreatModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center text-stone-700">
        <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-md mb-4 animate-pulse">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
          <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin" />
          <span>Verifying secure session...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentUser ? (
        <Dashboard
          user={currentUser}
          onOpenThreatModel={() => setIsThreatModalOpen(true)}
        />
      ) : (
        <LandingPage
          onOpenThreatModel={() => setIsThreatModalOpen(true)}
        />
      )}

      {/* Security Architecture & Threat Model Modal */}
      <ThreatModelModal
        isOpen={isThreatModalOpen}
        onClose={() => setIsThreatModalOpen(false)}
      />
    </>
  );
}
