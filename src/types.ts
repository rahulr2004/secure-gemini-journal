export type AIMode = 'reflection' | 'summary' | 'brainstorm' | 'advice';

export type EntryCategory = 'Reflection' | 'Brainstorm' | 'Personal' | 'Work' | 'Gratitude' | 'Goals' | 'Creative';

export interface JournalTurn {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  category: EntryCategory;
  tags: string[];
  aiMode: AIMode;
  turns: JournalTurn[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export interface PersonalGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'Career' | 'Health' | 'Mindfulness' | 'Learning' | 'Creative' | 'Personal';
  status: 'active' | 'in_progress' | 'completed' | 'archived';
  progress: number; // 0 - 100
  actionSteps: { id: string; title: string; completed: boolean }[];
  reflectionPrompts?: string[];
  createdAt: string;
  updatedAt: string;
  targetDate?: string;
}

export interface AIMemoryItem {
  id: string;
  userId: string;
  keyFact: string;
  category: 'preference' | 'insight' | 'growth' | 'value';
  sourceEntryId?: string;
  sourceEntryTitle?: string;
  confidenceScore: number;
  createdAt: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  frequency: 'daily' | 'weekly' | 'off';
  deliveryEmail?: string;
  notifyOnInsight: boolean;
  webhookUrl?: string;
}

export interface InteractionRecord {
  id: string;
  userId: string;
  entryId?: string;
  prompt: string;
  response: string;
  mode: AIMode;
  modelUsed?: string;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  bio?: string;
  preferredTone?: AIMode;
  role?: 'user' | 'admin';
  notifications?: NotificationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export type SortOrder = 'newest' | 'oldest' | 'alphabetical' | 'turns';

export interface FilterOptions {
  searchQuery: string;
  category: 'All' | EntryCategory;
  aiMode: 'All' | AIMode;
  startDate: string | null;
  endDate: string | null;
  datePreset: 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom';
  sortOrder: SortOrder;
  selectedTag?: string | null;
}

export type ExportFormat = 'json' | 'txt' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  includeSummary: boolean;
  includeMetadata: boolean;
  scope: 'all' | 'filtered' | 'selected';
}

export interface ThreatZoneSummary {
  zone: string;
  scope: string;
  threats: string[];
  countermeasures: string[];
  status: 'Protected' | 'Enforced' | 'Active';
}

export interface SynthesisProposal {
  id: string;
  userId: string;
  title: string;
  summary: string;
  keyThemes: string[];
  suggestedAction: string;
  suggestedPrompt: string;
  status: 'pending' | 'accepted' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
}

// ==========================================
// ADMIN DASHBOARD & SECURITY TYPES
// ==========================================

export interface AdminSystemOverview {
  totalUsers: number;
  activeUsers: number;
  totalEntries: number;
  totalConversations: number;
  totalGeminiRequests: number;
  totalAcceptedProposals: number;
  systemHealthScore: number;
  systemUptimePercentage: number;
  averageResponseLatencyMs: number;
  errorRatePercentage: number;
  aiFallbackHealth: string;
  primaryModel: string;
  lastSynthesisRun: string;
}

export interface AdminAnalyticsDataPoint {
  date: string;
  users: number;
  activeUsers: number;
  entries: number;
  aiRequests: number;
  reflections: number;
  summaries: number;
  brainstorms: number;
  advice: number;
}

export interface AdminUserSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  lastActive: string;
  totalEntries: number;
  totalConversations: number;
  totalGoals: number;
  totalMemories: number;
  accountStatus: 'active' | 'suspended' | 'verified';
}

export interface AdminSecurityStatus {
  authService: 'healthy' | 'degraded' | 'offline';
  firestoreRulesStatus: 'enforced' | 'warning' | 'insecure';
  isolationPolicy: 'strict_owner_bound';
  secretManagerStatus: 'ready_for_cloud_run' | 'configured_local' | 'missing';
  rbacEnforcement: 'server_verified';
  rateLimiting: 'active_10mb_limit';
  threatZones: ThreatZoneSummary[];
  recentSecurityEvents: {
    id: string;
    type: 'AUTH_VERIFY' | 'ROLE_CHECK' | 'RATE_LIMIT' | 'ACCESS_DENIED' | 'ADMIN_LOGIN';
    severity: 'low' | 'medium' | 'high';
    details: string;
    timestamp: string;
    status: 'resolved' | 'monitoring' | 'blocked';
  }[];
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: 'LOGIN' | 'VIEW_ANALYTICS' | 'VIEW_SECURITY' | 'CHANGE_USER_ROLE' | 'TEST_HEALTH' | 'EXPORT_AUDIT';
  targetResource: string;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  details: string;
  timestamp: string;
  ipPreview?: string;
}

export interface AdminCloudHealth {
  application: 'READY' | 'WARNING' | 'ERROR';
  firebaseAuth: 'CONNECTED' | 'ERROR';
  firestore: 'CONNECTED' | 'ERROR';
  geminiApi: 'CONNECTED' | 'ERROR';
  secretManager: 'NOT_YET_DEPLOYED' | 'CONFIGURED' | 'ERROR';
  cloudRun: 'NOT_YET_DEPLOYED' | 'DEPLOYED' | 'ERROR';
  cloudRunRegion: string;
  containerPort: number;
  deploymentTarget: string;
}

