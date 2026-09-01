import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalEntry, InteractionRecord, UserProfile, FilterOptions, SynthesisProposal } from '../types';

// Initialize Firebase App instance safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Configure persistent auth state across browser reloads
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    setPersistence(auth, browserSessionPersistence).catch(() => {
      setPersistence(auth, inMemoryPersistence).catch((err) => {
        console.warn('Could not set custom auth persistence:', err);
      });
    });
  });
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Cloud Firestore with dedicated database ID if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test for Firestore validation per skill guideline
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Error handling helper conforming to Firebase skill specifications
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper function to strip undefined values recursively to ensure Firestore compatibility
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// Auth Helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Initialize or sync user profile in Firestore
    if (result.user) {
      await syncUserProfileAfterAuth(result.user);
    }
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Popup error:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// ==========================================
// USER PROFILE MANAGEMENT (FIRESTORE + AUTH)
// ==========================================

/**
 * Sync initial user profile to dedicated /users/{userId}/profile/info document
 */
export async function syncUserProfileAfterAuth(user: User): Promise<void> {
  if (!user || !user.uid) return;
  const profilePath = `users/${user.uid}/profile/info`;
  const isPrimaryAdmin = user.email?.toLowerCase() === 'rahulheamanth2004@gmail.com';

  try {
    const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
    const existingSnap = await getDoc(profileRef);

    if (!existingSnap.exists()) {
      const initialProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Reflective Journaler',
        photoURL: user.photoURL || null,
        bio: 'Reflecting mindfully with Gemini AI.',
        preferredTone: 'reflection',
        role: isPrimaryAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(profileRef, cleanForFirestore(initialProfile));
    } else {
      const data = existingSnap.data() as UserProfile;
      // If user is primary admin and role is missing, set role
      if (isPrimaryAdmin && data.role !== 'admin') {
        await setDoc(profileRef, { role: 'admin', updatedAt: new Date().toISOString() }, { merge: true });
      }
    }
  } catch (error) {
    console.warn('Error synchronizing user profile after auth:', error);
  }
}

/**
 * Fetch dedicated user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  const path = `users/${userId}/profile/info`;
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const profile = snap.data() as UserProfile;
      if (profile.email?.toLowerCase() === 'rahulheamanth2004@gmail.com') {
        profile.role = 'admin';
      }
      return profile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Update user profile in Firestore and update Firebase Auth profile
 */
export async function saveUserProfile(
  userId: string,
  profileData: Partial<UserProfile>
): Promise<UserProfile> {
  if (!userId) {
    throw new Error('Missing userId for saving user profile.');
  }

  const path = `users/${userId}/profile/info`;
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    const existing = await getUserProfile(userId);

    // Prevent non-admins from self-promoting to admin
    let roleToSave = existing?.role || 'user';
    if (profileData.role) {
      if (existing?.role === 'admin' || auth.currentUser?.email?.toLowerCase() === 'rahulheamanth2004@gmail.com') {
        roleToSave = profileData.role;
      }
    }

    const updatedProfile: UserProfile = {
      uid: userId,
      email: profileData.email ?? existing?.email ?? auth.currentUser?.email ?? null,
      displayName: profileData.displayName?.trim() || existing?.displayName || auth.currentUser?.displayName || 'User',
      photoURL: profileData.photoURL ?? existing?.photoURL ?? auth.currentUser?.photoURL ?? null,
      bio: profileData.bio !== undefined ? profileData.bio : (existing?.bio || ''),
      preferredTone: profileData.preferredTone || existing?.preferredTone || 'reflection',
      role: roleToSave,
      notifications: profileData.notifications ?? existing?.notifications,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };


    // 1. Save to dedicated Firestore collection
    await setDoc(profileRef, cleanForFirestore(updatedProfile), { merge: true });

    // 2. Also synchronize Firebase Auth state if current user is active
    if (auth.currentUser && auth.currentUser.uid === userId) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: updatedProfile.displayName,
          photoURL: updatedProfile.photoURL || undefined
        });
      } catch (authUpdateErr) {
        console.warn('Could not update Firebase Auth client profile:', authUpdateErr);
      }
    }

    return updatedProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribe in real-time to user profile document
 */
export function subscribeToUserProfile(
  userId: string,
  onData: (profile: UserProfile | null) => void,
  onError: (err: Error) => void
): () => void {
  if (!userId) {
    onData(null);
    return () => {};
  }

  const path = `users/${userId}/profile/info`;
  const profileRef = doc(db, 'users', userId, 'profile', 'info');

  return onSnapshot(
    profileRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as UserProfile);
      } else {
        // Fallback default
        onData({
          uid: userId,
          email: auth.currentUser?.email || null,
          displayName: auth.currentUser?.displayName || null,
          photoURL: auth.currentUser?.photoURL || null,
          bio: 'Reflecting mindfully with Gemini AI.',
          preferredTone: 'reflection',
        });
      }
    },
    (error) => {
      console.error('User profile subscription error:', error);
      onError(error);
    }
  );
}

// ==========================================
// JOURNAL ENTRIES OPERATIONS & SUBSCRIPTIONS
// ==========================================

export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId || !entry.id) {
    throw new Error('Missing userId or entryId for saving journal entry.');
  }

  const path = `users/${userId}/entries/${entry.id}`;
  try {
    const entryRef = doc(db, 'users', userId, 'entries', entry.id);
    const payload = cleanForFirestore({
      ...entry,
      userId,
      updatedAt: new Date().toISOString(),
      _syncedAt: new Date().toISOString(),
    });

    await setDoc(entryRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error('Missing userId or entryId for deleting journal entry.');
  }

  const path = `users/${userId}/entries/${entryId}`;
  try {
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    await deleteDoc(entryRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Log individual interaction turn to /users/{userId}/interactions/{interactionId} for auditing & isolation
export async function recordInteractionLog(userId: string, interaction: InteractionRecord): Promise<void> {
  if (!userId || !interaction.id) return;

  const path = `users/${userId}/interactions/${interaction.id}`;
  try {
    const interactionRef = doc(db, 'users', userId, 'interactions', interaction.id);
    const payload = cleanForFirestore({
      ...interaction,
      userId,
      recordedAt: new Date().toISOString(),
    });
    await setDoc(interactionRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to log interaction to Firestore audit collection:', err);
  }
}

// Real-time listener for user entries strictly under /users/{userId}/entries
export function subscribeToUserEntries(
  userId: string,
  onData: (entries: JournalEntry[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const path = `users/${userId}/entries`;
  const entriesCollection = collection(db, 'users', userId, 'entries');
  const q = query(entriesCollection);

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as JournalEntry;
        entries.push({
          ...data,
          id: docSnapshot.id
        });
      });
      // Sort newest first
      entries.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      onData(entries);
    },
    (error) => {
      console.error('Firestore snapshot listener error:', error);
      onError(error);
    }
  );
}

// ==========================================
// PERSONAL GOALS CRUD HELPERS
// ==========================================

export async function savePersonalGoal(userId: string, goal: import('../types').PersonalGoal): Promise<void> {
  if (!userId || !goal.id) throw new Error('Missing userId or goalId');
  const path = `users/${userId}/goals/${goal.id}`;
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goal.id);
    const payload = cleanForFirestore({
      ...goal,
      userId,
      updatedAt: new Date().toISOString()
    });
    await setDoc(goalRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePersonalGoal(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) throw new Error('Missing userId or goalId');
  const path = `users/${userId}/goals/${goalId}`;
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await deleteDoc(goalRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserGoals(
  userId: string,
  onData: (goals: import('../types').PersonalGoal[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  const goalsCollection = collection(db, 'users', userId, 'goals');
  const q = query(goalsCollection);

  return onSnapshot(
    q,
    (snapshot) => {
      const goals: import('../types').PersonalGoal[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as import('../types').PersonalGoal;
        goals.push({ ...data, id: docSnapshot.id });
      });
      goals.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(goals);
    },
    (error) => {
      console.error('Goals snapshot listener error:', error);
      onError(error);
    }
  );
}

// ==========================================
// AI MEMORY MANAGEMENT HELPERS
// ==========================================

export async function saveAIMemoryItem(userId: string, memory: import('../types').AIMemoryItem): Promise<void> {
  if (!userId || !memory.id) throw new Error('Missing userId or memory.id');
  const path = `users/${userId}/memories/${memory.id}`;
  try {
    const memRef = doc(db, 'users', userId, 'memories', memory.id);
    const payload = cleanForFirestore({
      ...memory,
      userId,
      createdAt: memory.createdAt || new Date().toISOString()
    });
    await setDoc(memRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAIMemoryItem(userId: string, memoryId: string): Promise<void> {
  if (!userId || !memoryId) throw new Error('Missing userId or memoryId');
  const path = `users/${userId}/memories/${memoryId}`;
  try {
    const memRef = doc(db, 'users', userId, 'memories', memoryId);
    await deleteDoc(memRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserMemories(
  userId: string,
  onData: (memories: import('../types').AIMemoryItem[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  const memCollection = collection(db, 'users', userId, 'memories');
  const q = query(memCollection);

  return onSnapshot(
    q,
    (snapshot) => {
      const memories: import('../types').AIMemoryItem[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as import('../types').AIMemoryItem;
        memories.push({ ...data, id: docSnapshot.id });
      });
      memories.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(memories);
    },
    (error) => {
      console.error('Memories snapshot listener error:', error);
      onError(error);
    }
  );
}


// ==========================================
// EXPORT & FORMATTING UTILITIES
// ==========================================

/**
 * Format journal entries into rich, structured Plain Text / Markdown export format
 */
export function formatEntriesAsText(
  entries: JournalEntry[],
  userProfile?: UserProfile | null
): string {
  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const divider = '='.repeat(70);
  const subDivider = '-'.repeat(70);

  let output = `${divider}\n`;
  output += `GEMINI AI JOURNAL & REFLECTION VAULT - EXPORT\n`;
  output += `${divider}\n\n`;
  output += `Export Date: ${exportDate}\n`;
  output += `User: ${userProfile?.displayName || 'Authenticated User'} (${userProfile?.email || 'Google Account'})\n`;
  output += `Total Entries Exported: ${entries.length}\n`;
  if (userProfile?.bio) {
    output += `Reflection Goal/Bio: ${userProfile.bio}\n`;
  }
  output += `\n${divider}\n\n`;

  if (entries.length === 0) {
    output += `(No journal entries found in this export)\n`;
    return output;
  }

  entries.forEach((entry, index) => {
    output += `[ENTRY #${index + 1}] ${entry.title.toUpperCase()}\n`;
    output += `Category: ${entry.category} | AI Mode: ${entry.aiMode}\n`;
    output += `Created: ${new Date(entry.createdAt).toLocaleString()}\n`;
    output += `Last Modified: ${new Date(entry.updatedAt).toLocaleString()}\n`;
    if (entry.tags && entry.tags.length > 0) {
      output += `Tags: ${entry.tags.map(t => '#' + t).join(', ')}\n`;
    }
    output += `${subDivider}\n\n`;

    if (entry.summary) {
      output += `=== GEMINI AI SYNTHESIS & INSIGHTS ===\n`;
      output += `${entry.summary.trim()}\n\n`;
      output += `${subDivider}\n\n`;
    }

    output += `=== REFLECTION CONVERSATION LOG ===\n\n`;
    if (!entry.turns || entry.turns.length === 0) {
      output += `(No dialogue turns recorded in this entry)\n\n`;
    } else {
      entry.turns.forEach((turn, tIdx) => {
        const speaker = turn.role === 'model' ? 'GEMINI AI' : (userProfile?.displayName || 'YOU');
        const timestamp = turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString() : '';
        const modelTag = turn.modelUsed ? ` [Model: ${turn.modelUsed}]` : '';

        output += `[Turn ${tIdx + 1}] ${speaker}${modelTag} (${timestamp}):\n`;
        output += `${turn.content.trim()}\n\n`;
      });
    }

    output += `\n${divider}\n\n`;
  });

  return output;
}

/**
 * Format journal entries and user profile as clean JSON export
 */
export function formatEntriesAsJSON(
  entries: JournalEntry[],
  userProfile?: UserProfile | null
): string {
  const exportPayload = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: {
      uid: userProfile?.uid || auth.currentUser?.uid || 'anonymous',
      displayName: userProfile?.displayName || auth.currentUser?.displayName,
      email: userProfile?.email || auth.currentUser?.email,
      bio: userProfile?.bio,
      photoURL: userProfile?.photoURL,
    },
    totalCount: entries.length,
    entries: entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      tags: entry.tags || [],
      aiMode: entry.aiMode,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      location: entry.location || null,
      summary: entry.summary || null,
      turns: entry.turns || [],
    }))
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Trigger real browser file download for text, markdown, or JSON
 */
export function downloadFile(filename: string, content: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Save Sunday Synthesis proposal (status 'pending') to /users/{userId}/proposals/{proposalId}
 */
export async function saveSynthesisProposal(
  userId: string,
  proposal: SynthesisProposal
): Promise<void> {
  if (!userId || !proposal.id) return;
  const proposalRef = doc(db, 'users', userId, 'proposals', proposal.id);
  const sanitized = cleanForFirestore({
    ...proposal,
    userId,
    updatedAt: new Date().toISOString()
  });
  await setDoc(proposalRef, sanitized, { merge: true });
}

/**
 * Real-time subscription to user's pending Sunday Synthesis proposals
 */
export function subscribeToPendingProposals(
  userId: string,
  callback: (proposals: SynthesisProposal[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const proposalsRef = collection(db, 'users', userId, 'proposals');
  const q = query(proposalsRef, where('status', '==', 'pending'));

  return onSnapshot(
    q,
    (snapshot) => {
      const proposals: SynthesisProposal[] = [];
      snapshot.forEach((docSnap) => {
        proposals.push(docSnap.data() as SynthesisProposal);
      });
      callback(proposals);
    },
    (err) => {
      console.error('Error subscribing to proposals:', err);
      callback([]);
    }
  );
}

/**
 * Update a synthesis proposal's status to 'accepted' or 'dismissed'
 */
export async function updateProposalStatus(
  userId: string,
  proposalId: string,
  status: 'accepted' | 'dismissed'
): Promise<void> {
  if (!userId || !proposalId) return;
  const proposalRef = doc(db, 'users', userId, 'proposals', proposalId);
  await setDoc(
    proposalRef,
    {
      status,
      reviewedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

// ==========================================
// SECURE ADMIN API HELPERS (BACKEND VERIFIED)
// ==========================================

export async function fetchAdminOverview(): Promise<any> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken().catch(() => '') : '';

  const res = await fetch('/api/admin/stats', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-admin-email': user?.email || '',
      'x-admin-uid': user?.uid || '',
      'x-admin-role': 'admin'
    }
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch admin overview stats.');
  }
  return data.stats;
}

export async function fetchAdminAnalytics(): Promise<any[]> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken().catch(() => '') : '';

  const res = await fetch('/api/admin/analytics', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-admin-email': user?.email || '',
      'x-admin-uid': user?.uid || '',
      'x-admin-role': 'admin'
    }
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch admin analytics.');
  }
  return data.analytics || [];
}

export async function fetchAdminUsers(): Promise<any[]> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken().catch(() => '') : '';

  const res = await fetch('/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-admin-email': user?.email || '',
      'x-admin-uid': user?.uid || '',
      'x-admin-role': 'admin'
    }
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch user directory.');
  }
  return data.users || [];
}

export async function fetchAdminSecurity(): Promise<any> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken().catch(() => '') : '';

  const res = await fetch('/api/admin/security', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-admin-email': user?.email || '',
      'x-admin-uid': user?.uid || '',
      'x-admin-role': 'admin'
    }
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch security status.');
  }
  return data.security;
}

export async function fetchAdminAuditLogs(): Promise<any[]> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken().catch(() => '') : '';

  const res = await fetch('/api/admin/audit-logs', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-admin-email': user?.email || '',
      'x-admin-uid': user?.uid || '',
      'x-admin-role': 'admin'
    }
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch audit logs.');
  }
  return data.logs || [];
}

export async function fetchAdminSystemHealth(): Promise<any> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken().catch(() => '') : '';

  const res = await fetch('/api/admin/system-health', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-admin-email': user?.email || '',
      'x-admin-uid': user?.uid || '',
      'x-admin-role': 'admin'
    }
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch system health.');
  }
  return data.health;
}

export async function updateAdminUserRole(targetUid: string, newRole: 'user' | 'admin', targetEmail?: string): Promise<void> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken().catch(() => '') : '';

  const res = await fetch('/api/admin/users/role', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-admin-email': user?.email || '',
      'x-admin-uid': user?.uid || '',
      'x-admin-role': 'admin'
    },
    body: JSON.stringify({ targetUid, newRole, targetEmail })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update user role.');
  }
}

