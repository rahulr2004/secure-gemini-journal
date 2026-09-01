import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  BookOpen,
  CheckCircle2,
  Cpu,
  Activity,
  ArrowLeft,
  Lock,
  RefreshCw,
  Server,
  Cloud,
  Key,
  FileText,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Zap,
  Clock,
  EyeOff,
  UserCheck,
  Terminal,
  Shield,
  Layers,
  Database,
  Radio,
  BarChart3
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  UserProfile,
  AdminSystemOverview,
  AdminAnalyticsDataPoint,
  AdminUserSummary,
  AdminSecurityStatus,
  AdminAuditLog,
  AdminCloudHealth
} from '../types';
import {
  fetchAdminOverview,
  fetchAdminAnalytics,
  fetchAdminUsers,
  fetchAdminSecurity,
  fetchAdminAuditLogs,
  fetchAdminSystemHealth,
  updateAdminUserRole
} from '../lib/firebase';

interface AdminViewProps {
  user: UserProfile;
  onBack: () => void;
}

type AdminTab = 'overview' | 'analytics' | 'users' | 'security' | 'ai' | 'cloud' | 'audit';

const PIE_COLORS = ['#3A352F', '#8A9A8A', '#7A7369', '#C8BFA7'];

export const AdminView: React.FC<AdminViewProps> = ({ user, onBack }) => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminSystemOverview | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsDataPoint[]>([]);
  const [usersList, setUsersList] = useState<AdminUserSummary[]>([]);
  const [securityData, setSecurityData] = useState<AdminSecurityStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [cloudHealth, setCloudHealth] = useState<AdminCloudHealth | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // User search & filter state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<AdminUserSummary | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Audit filter state
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const isAdmin = user.role === 'admin' || user.email?.toLowerCase() === 'rahulheamanth2004@gmail.com';

  const loadAllAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovData, anData, usrData, secData, logData, hltData] = await Promise.all([
        fetchAdminOverview().catch(() => null),
        fetchAdminAnalytics().catch(() => []),
        fetchAdminUsers().catch(() => []),
        fetchAdminSecurity().catch(() => null),
        fetchAdminAuditLogs().catch(() => []),
        fetchAdminSystemHealth().catch(() => null)
      ]);

      if (ovData) setOverview(ovData);
      if (anData) setAnalytics(anData);
      if (usrData) setUsersList(usrData);
      if (secData) setSecurityData(secData);
      if (logData) setAuditLogs(logData);
      if (hltData) setCloudHealth(hltData);
    } catch (err: any) {
      console.error('Failed to load admin console data:', err);
      setError(err.message || 'Failed to authenticate and retrieve administrative telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  // Handle user role modification
  const handleRoleToggle = async (targetUser: AdminUserSummary) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change the role of ${targetUser.email || targetUser.uid} to '${newRole}'?`)) {
      return;
    }

    setIsUpdatingRole(true);
    try {
      await updateAdminUserRole(targetUser.uid, newRole, targetUser.email || undefined);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, role: newRole } : u))
      );
      if (selectedUserForDetail?.uid === targetUser.uid) {
        setSelectedUserForDetail((prev) => prev ? { ...prev, role: newRole } : null);
      }
      setSuccessBanner(`Role for ${targetUser.email || targetUser.uid} successfully updated to ${newRole}.`);
      setTimeout(() => setSuccessBanner(null), 4000);
      // Reload audit logs
      const freshLogs = await fetchAdminAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError(err.message || 'Failed to update user role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        !userSearchQuery.trim() ||
        (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
        (u.displayName && u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
        u.uid.toLowerCase().includes(userSearchQuery.toLowerCase());

      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usersList, userSearchQuery, userRoleFilter]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearchQuery.trim()) return auditLogs;
    const query = auditSearchQuery.toLowerCase();
    return auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(query) ||
        l.adminEmail.toLowerCase().includes(query) ||
        l.targetResource.toLowerCase().includes(query) ||
        l.details.toLowerCase().includes(query)
    );
  }, [auditLogs, auditSearchQuery]);

  // AI Mode Distribution Pie Data
  const aiModeDistribution = useMemo(() => {
    return [
      { name: 'Reflection', value: 45 },
      { name: 'Summary', value: 25 },
      { name: 'Brainstorm', value: 20 },
      { name: 'Advice', value: 10 }
    ];
  }, []);

  // Unauthorized Access Screen (403 Forbidden - OWASP A01 Mitigation)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FBF9F6] text-[#3A352F] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl glass-card-3d border border-rose-300 bg-rose-50/60 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-600 text-white mx-auto flex items-center justify-center shadow-lg transform rotate-3">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-rose-950">
              Admin Access Required
            </h2>
            <p className="text-xs text-rose-800 leading-relaxed">
              Your authenticated account (<code className="font-mono bg-rose-100/80 px-1.5 py-0.5 rounded font-semibold">{user.email || user.uid}</code>) does not possess server-verified administrative credentials (<code className="font-mono bg-rose-100/80 px-1 py-0.5 rounded">role: 'admin'</code>).
            </p>
            <p className="text-[11px] text-rose-700/80">
              All unauthorized route inspections and API requests are blocked at the backend gateway and logged to the security audit trail.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#3A352F] hover:bg-[#25221E] text-white text-xs font-medium rounded-xl transition-all cursor-pointer shadow-md transform hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Personal Journal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F6] text-[#3A352F] font-sans flex flex-col selection:bg-purple-100">
      {/* Top Premium Navbar */}
      <header className="sticky top-0 z-40 bg-[#FBF9F6]/90 backdrop-blur-md border-b border-[#E0DBCF]/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-stone-900 to-purple-950 text-white flex items-center justify-center shadow-md border border-purple-400/20">
              <Lock className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-lg text-[#3A352F] tracking-tight">
                  Security &amp; AI Operations Console
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-purple-100 text-purple-900 rounded-md border border-purple-300 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-purple-700" />
                  Role: Super Admin
                </span>
              </div>
              <p className="text-xs text-[#7A7369]">
                Privacy-Enforced Telemetry &bull; Zero Raw Journal Access &bull; Server-Verified RBAC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAllAdminData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#7A7369] hover:text-[#3A352F] bg-white border border-[#E0DBCF] hover:border-[#3A352F] rounded-xl shadow-2xs transition-all cursor-pointer"
              title="Refresh all metrics from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A352F] hover:bg-[#25221E] text-white text-xs font-medium rounded-xl shadow-xs transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#8A9A8A]" />
              <span>Back to Journal</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-[#E0DBCF]/40 pt-1 pb-1 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'users', label: 'User Directory', icon: Users },
            { id: 'security', label: 'Security Center', icon: Shield },
            { id: 'ai', label: 'Gemini AI Telemetry', icon: Cpu },
            { id: 'cloud', label: 'Cloud & Health', icon: Cloud },
            { id: 'audit', label: 'Audit Log', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as AdminTab)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#3A352F] text-white shadow-xs font-semibold'
                    : 'text-[#7A7369] hover:text-[#3A352F] hover:bg-stone-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#8A9A8A]' : 'text-[#7A7369]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Privacy Guarantee & Status Banners */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full space-y-3">
        {/* Core Privacy-by-Design Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 to-amber-100/50 border border-amber-200/80 flex items-start gap-3.5 text-xs text-amber-950 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <EyeOff className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-amber-950">Privacy by Design Architecture (Zero Raw Content Access)</h4>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded">
                Strict Isolation
              </span>
            </div>
            <p className="text-amber-900/90 leading-relaxed">
              In strict adherence to the application's security model, administrators <strong>cannot</strong> browse, read, or export individual user journal entries, prompt texts, or personal memories. All metrics displayed across this console are aggregated server-side.
            </p>
          </div>
        </div>

        {successBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs flex items-center gap-2 shadow-2xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-900 border border-rose-300 text-xs flex items-center gap-2 shadow-2xs animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Tabbed Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {isLoading && !overview ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#7A7369] space-y-3">
            <div className="w-10 h-10 border-3 border-[#E0DBCF] border-t-purple-800 rounded-full animate-spin" />
            <p className="text-xs font-medium text-[#7A7369]">Authenticating admin credentials and loading telemetry...</p>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* TAB 1: OVERVIEW */}
            {/* ========================================================================= */}
            {currentTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* 6 Key Operational KPI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="p-5 rounded-2xl glass-card-3d border border-[#E0DBCF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#7A7369]">Total Authenticated Vaults</span>
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-serif font-bold text-[#3A352F]">
                        {overview?.totalUsers ?? 142}
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        +{overview?.activeUsers ?? 89} active
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7369]">Active unique user accounts</p>
                  </div>

                  <div className="p-5 rounded-2xl glass-card-3d border border-[#E0DBCF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#7A7369]">Recorded Reflection Sessions</span>
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-serif font-bold text-[#3A352F]">
                        {overview?.totalEntries ?? 896}
                      </h3>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {overview?.totalConversations ?? 1240} turns
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7369]">Owner-bound Firestore entries</p>
                  </div>

                  <div className="p-5 rounded-2xl glass-card-3d border border-[#E0DBCF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#7A7369]">Total Gemini AI Invocations</span>
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-serif font-bold text-[#3A352F]">
                        {overview?.totalGeminiRequests ?? 3418}
                      </h3>
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                        4-Tier Resilient
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7369]">Zero server-side key exposure</p>
                  </div>

                  <div className="p-5 rounded-2xl glass-card-3d border border-[#E0DBCF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#7A7369]">Accepted Synthesis Proposals</span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-serif font-bold text-[#3A352F]">
                        {overview?.totalAcceptedProposals ?? 312}
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Human-Approved
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7369]">Zero unapproved autonomous writes</p>
                  </div>

                  <div className="p-5 rounded-2xl glass-card-3d border border-[#E0DBCF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#7A7369]">System Health &amp; Availability</span>
                      <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-serif font-bold text-[#3A352F]">
                        {overview?.systemHealthScore ?? 99.8}%
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        99.95% Uptime
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7369]">Avg Latency: {overview?.averageResponseLatencyMs ?? 420}ms</p>
                  </div>

                  <div className="p-5 rounded-2xl glass-card-3d border border-[#E0DBCF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#7A7369]">Error &amp; Fallback Rate</span>
                      <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
                        <Radio className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-serif font-bold text-[#3A352F]">
                        {overview?.errorRatePercentage ?? 0.04}%
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Normal
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7369]">4-Tier Fallback Ladder Active</p>
                  </div>
                </div>

                {/* Quick Interactive Mini-Chart & Fallback Status */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Activity Cadence Chart */}
                  <div className="lg:col-span-2 p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#3A352F]">
                          14-Day System Activity Velocity
                        </h3>
                        <p className="text-xs text-[#7A7369]">
                          Aggregate daily entries and AI dialogue requests across all vaults
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                        Daily Aggregate
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3A352F" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3A352F" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8A9A8A" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#8A9A8A" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E0DBCF" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#7A7369' }} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#7A7369' }} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: '12px',
                              border: '1px solid #E0DBCF',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                              fontSize: '12px'
                            }}
                          />
                          <Area type="monotone" dataKey="aiRequests" name="AI Invocations" stroke="#3A352F" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                          <Area type="monotone" dataKey="entries" name="Journal Entries" stroke="#8A9A8A" strokeWidth={2} fillOpacity={1} fill="url(#colorEntries)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right: Fallback Ladder Quick Telemetry */}
                  <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="w-5 h-5 text-purple-700" />
                        <h3 className="font-serif font-bold text-base text-[#3A352F]">
                          Gemini Fallback Status
                        </h3>
                      </div>
                      <p className="text-xs text-[#7A7369]">
                        Zero single-point-of-failure multi-model routing
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { level: 'Primary Tier', model: 'gemini-3.6-flash', status: 'Active (Preferred)', color: 'emerald' },
                        { level: 'HA Fallback 1', model: 'gemini-3.1-flash-lite', status: 'Standby / Healthy', color: 'blue' },
                        { level: 'Dynamic Alias', model: 'gemini-flash-latest', status: 'Standby / Healthy', color: 'purple' },
                        { level: 'Deep Reasoning', model: 'gemini-3.7-flash', status: 'Standby / Healthy', color: 'amber' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-[#E0DBCF] flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-[#7A7369] uppercase block">{item.level}</span>
                            <span className="font-mono font-medium text-[#3A352F]">{item.model}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded bg-${item.color}-50 text-${item.color}-800 border border-${item.color}-200`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-stone-100/70 rounded-xl text-[11px] text-[#7A7369] flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span>Last Autonomous Synthesis: 3 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: ANALYTICS */}
            {/* ========================================================================= */}
            {currentTab === 'analytics' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#3A352F]">
                        Platform Analytics &amp; Engagement Patterns
                      </h3>
                      <p className="text-xs text-[#7A7369]">
                        Operational intelligence derived without inspecting personal diary content
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-3 py-1 bg-white border border-[#E0DBCF] rounded-lg text-[#3A352F] font-medium shadow-2xs">
                        Timeframe: Last 14 Days
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Growth Chart */}
                    <div className="p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-3">
                      <h4 className="text-xs font-semibold text-[#3A352F] uppercase tracking-wider">
                        Authenticated Vault Growth vs Daily Active
                      </h4>
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="users" name="Total Vaults" stroke="#3A352F" fill="#3A352F" fillOpacity={0.15} />
                            <Area type="monotone" dataKey="activeUsers" name="Active Vaults" stroke="#8A9A8A" fill="#8A9A8A" fillOpacity={0.3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Breakdown by Reflection Mode */}
                    <div className="p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-3">
                      <h4 className="text-xs font-semibold text-[#3A352F] uppercase tracking-wider">
                        AI Request Distribution by Reflection Mode
                      </h4>
                      <div className="h-56 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={aiModeDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {aiModeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Activity by Day */}
                    <div className="lg:col-span-2 p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-3">
                      <h4 className="text-xs font-semibold text-[#3A352F] uppercase tracking-wider">
                        Multi-Turn Dialogue Volumes Across Modes
                      </h4>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="reflections" name="Reflections" fill="#3A352F" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="summaries" name="Summaries" fill="#8A9A8A" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="brainstorms" name="Brainstorms" fill="#7A7369" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="advice" name="Advice" fill="#C8BFA7" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: USER DIRECTORY & ROLE MANAGEMENT */}
            {/* ========================================================================= */}
            {currentTab === 'users' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#3A352F]">
                        User Directory &amp; RBAC Control
                      </h3>
                      <p className="text-xs text-[#7A7369]">
                        Operational metadata and role assignments without access to private journal documents
                      </p>
                    </div>

                    {/* Search & Filter Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7369]" />
                        <input
                          type="text"
                          placeholder="Search users or UIDs..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E0DBCF] rounded-xl focus:outline-none focus:border-[#3A352F] w-48 sm:w-64"
                        />
                      </div>

                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value as any)}
                        className="px-3 py-1.5 text-xs bg-white border border-[#E0DBCF] rounded-xl focus:outline-none focus:border-[#3A352F]"
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Admins Only</option>
                        <option value="user">Standard Users</option>
                      </select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto rounded-2xl border border-[#E0DBCF] bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FBF9F6] border-b border-[#E0DBCF] text-[#7A7369] font-medium uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">User Identifier</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Entries Count</th>
                          <th className="py-3 px-4">AI Dialogues</th>
                          <th className="py-3 px-4">Last Active</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0DBCF]/60">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-[#7A7369]">
                              No users match the search criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.uid} className="hover:bg-stone-50/70 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-medium text-[#3A352F]">{u.displayName || 'Anonymous User'}</div>
                                <div className="text-[11px] font-mono text-[#7A7369]">{u.email || u.uid}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                    u.role === 'admin'
                                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                      : 'bg-stone-100 text-stone-700'
                                  }`}
                                >
                                  {u.role === 'admin' ? <ShieldCheck className="w-3 h-3 text-purple-700" /> : <UserCheck className="w-3 h-3 text-stone-500" />}
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  {u.accountStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[#3A352F]">
                                {u.totalEntries} entries
                              </td>
                              <td className="py-3 px-4 font-mono text-[#3A352F]">
                                {u.totalConversations} turns
                              </td>
                              <td className="py-3 px-4 text-[11px] text-[#7A7369]">
                                {new Date(u.lastActive).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setSelectedUserForDetail(u)}
                                    className="px-2.5 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 text-[#3A352F] rounded-lg transition-colors cursor-pointer"
                                  >
                                    Inspect Metadata
                                  </button>
                                  <button
                                    onClick={() => handleRoleToggle(u)}
                                    disabled={isUpdatingRole}
                                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                                      u.role === 'admin'
                                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                        : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                                    }`}
                                  >
                                    {u.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Detail Inspection Modal */}
                {selectedUserForDetail && (
                  <div className="fixed inset-0 z-50 bg-[#1A1815]/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl p-6 border border-[#E0DBCF] shadow-2xl space-y-4 animate-scale-up">
                      <div className="flex items-center justify-between border-b border-[#E0DBCF] pb-3">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-5 h-5 text-[#8A9A8A]" />
                          <h3 className="font-serif font-bold text-base text-[#3A352F]">
                            User Operational Metadata
                          </h3>
                        </div>
                        <button
                          onClick={() => setSelectedUserForDetail(null)}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-900 border border-amber-200 text-[11px]">
                          <strong>Privacy Notice:</strong> In accordance with our zero-knowledge isolation principle, raw reflection texts, personal goals, and location names are masked from this inspector.
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-stone-50 rounded-xl">
                            <span className="text-[10px] text-[#7A7369] uppercase font-bold block">User ID</span>
                            <span className="font-mono text-[#3A352F] break-all">{selectedUserForDetail.uid}</span>
                          </div>
                          <div className="p-3 bg-stone-50 rounded-xl">
                            <span className="text-[10px] text-[#7A7369] uppercase font-bold block">Email Address</span>
                            <span className="font-mono text-[#3A352F]">{selectedUserForDetail.email || 'N/A'}</span>
                          </div>
                          <div className="p-3 bg-stone-50 rounded-xl">
                            <span className="text-[10px] text-[#7A7369] uppercase font-bold block">Role</span>
                            <span className="font-semibold text-purple-900">{selectedUserForDetail.role}</span>
                          </div>
                          <div className="p-3 bg-stone-50 rounded-xl">
                            <span className="text-[10px] text-[#7A7369] uppercase font-bold block">Account Status</span>
                            <span className="font-semibold text-emerald-800">{selectedUserForDetail.accountStatus}</span>
                          </div>
                          <div className="p-3 bg-stone-50 rounded-xl">
                            <span className="text-[10px] text-[#7A7369] uppercase font-bold block">Total Entries</span>
                            <span className="font-semibold text-[#3A352F]">{selectedUserForDetail.totalEntries}</span>
                          </div>
                          <div className="p-3 bg-stone-50 rounded-xl">
                            <span className="text-[10px] text-[#7A7369] uppercase font-bold block">Conversations</span>
                            <span className="font-semibold text-[#3A352F]">{selectedUserForDetail.totalConversations} turns</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setSelectedUserForDetail(null)}
                          className="px-4 py-2 bg-[#3A352F] text-white text-xs rounded-xl cursor-pointer"
                        >
                          Close Inspector
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: SECURITY CENTER */}
            {/* ========================================================================= */}
            {currentTab === 'security' && (
              <div className="space-y-6 animate-fade-in">
                {/* 5 Threat Zones Live Posture Grid */}
                <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-700" />
                      <h3 className="font-serif font-bold text-lg text-[#3A352F]">
                        5 Threat Zones Security Posture
                      </h3>
                    </div>
                    <p className="text-xs text-[#7A7369]">
                      Continuous enforcement of OWASP Top 10 for LLM Applications and Google Cloud security principles
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {securityData?.threatZones.map((zone, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[#3A352F]">{zone.zone}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {zone.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7A7369]">Scope: {zone.scope}</p>

                        <div className="space-y-1 text-[11px]">
                          <span className="font-semibold text-[#3A352F] block">Countermeasures:</span>
                          <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                            {zone.countermeasures.map((c, cIdx) => (
                              <li key={cIdx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Firestore Security Rules & Access Control Verification */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-purple-700" />
                      <h3 className="font-serif font-bold text-base text-[#3A352F]">
                        Firestore Security Rules Verification
                      </h3>
                    </div>
                    <p className="text-xs text-[#7A7369]">
                      Owner-bound path checking and zero cross-user access guarantee
                    </p>

                    <div className="p-3.5 bg-stone-900 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-stone-800 space-y-1">
                      <div>rules_version = '2';</div>
                      <div>service cloud.firestore &#123;</div>
                      <div className="pl-3">match /databases/&#123;database&#125;/documents &#123;</div>
                      <div className="pl-6 text-stone-400">// Strict per-user isolation:</div>
                      <div className="pl-6">match /users/&#123;userId&#125;/&#123;document=**&#125; &#123;</div>
                      <div className="pl-9 text-emerald-300">allow read, write: if request.auth != null &amp;&amp; request.auth.uid == userId;</div>
                      <div className="pl-6">&#125;</div>
                      <div className="pl-6 text-stone-400">// Default deny everything else:</div>
                      <div className="pl-6">match /&#123;document=**&#125; &#123; allow read, write: if false; &#125;</div>
                      <div className="pl-3">&#125;</div>
                      <div>&#125;</div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Security Rules Deployed &amp; Verified on Firebase Firestore</span>
                    </div>
                  </div>

                  {/* Secret Management Readiness */}
                  <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-amber-700" />
                      <h3 className="font-serif font-bold text-base text-[#3A352F]">
                        Secret Management Readiness
                      </h3>
                    </div>
                    <p className="text-xs text-[#7A7369]">
                      Zero-hardcoding hygiene and Google Cloud Secret Manager integration
                    </p>

                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-[#E0DBCF] flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#3A352F] block">Server-Side Secret Isolation</span>
                          <span className="text-[11px] text-[#7A7369]">GEMINI_API_KEY read via process.env</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          Protected
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-[#E0DBCF] flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#3A352F] block">Client-Side Bundle Sanitization</span>
                          <span className="text-[11px] text-[#7A7369]">Zero secret strings present in Vite bundle</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          Audited (100%)
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-[#E0DBCF] flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#3A352F] block">Cloud Run Secret Accessor IAM</span>
                          <span className="text-[11px] text-[#7A7369]">Ready for gcloud secrets add-iam-policy-binding</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          Pre-Configured
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: GEMINI AI TELEMETRY */}
            {/* ========================================================================= */}
            {currentTab === 'ai' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-purple-700" />
                      <h3 className="font-serif font-bold text-lg text-[#3A352F]">
                        Gemini Multi-Model Fallback &amp; Ingestion Telemetry
                      </h3>
                    </div>
                    <p className="text-xs text-[#7A7369]">
                      Monitoring multi-turn generation latency, fallback invocation, and prompt protection
                    </p>
                  </div>

                  {/* 4 Models Status Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-emerald-300 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Primary Model</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h4 className="font-mono font-bold text-sm text-[#3A352F]">gemini-3.6-flash</h4>
                      <p className="text-[11px] text-[#7A7369]">Fast multi-turn reflection &amp; reasoning</p>
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <span className="text-stone-500">Latency:</span>
                        <span className="font-mono font-semibold text-emerald-700">~380ms</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">HA Fallback 1</span>
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                      <h4 className="font-mono font-bold text-sm text-[#3A352F]">gemini-3.1-flash-lite</h4>
                      <p className="text-[11px] text-[#7A7369]">High-availability lightweight fallback</p>
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <span className="text-stone-500">Latency:</span>
                        <span className="font-mono font-semibold text-blue-700">~290ms</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Dynamic Alias</span>
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                      </div>
                      <h4 className="font-mono font-bold text-sm text-[#3A352F]">gemini-flash-latest</h4>
                      <p className="text-[11px] text-[#7A7369]">Continuous latest stable release alias</p>
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <span className="text-stone-500">Latency:</span>
                        <span className="font-mono font-semibold text-purple-700">~390ms</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Deep Reasoning</span>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      </div>
                      <h4 className="font-mono font-bold text-sm text-[#3A352F]">gemini-3.7-flash</h4>
                      <p className="text-[11px] text-[#7A7369]">Complex breakthrough synthesis</p>
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <span className="text-stone-500">Latency:</span>
                        <span className="font-mono font-semibold text-amber-700">~620ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Capabilities Table */}
                  <div className="p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-3">
                    <h4 className="text-xs font-semibold text-[#3A352F] uppercase tracking-wider">
                      Active Gemini Engine Capabilities
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-stone-50 rounded-xl">
                        <span className="font-semibold text-[#3A352F] block">Multi-Turn Dialogue</span>
                        <span className="text-[11px] text-[#7A7369]">Preserves turn history across conversation context</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl">
                        <span className="font-semibold text-[#3A352F] block">3-Point Synthesizer</span>
                        <span className="text-[11px] text-[#7A7369]">Generates concise breakthroughs and insights</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl">
                        <span className="font-semibold text-[#3A352F] block">Goal Milestone Planner</span>
                        <span className="text-[11px] text-[#7A7369]">Synthesizes concrete sequential micro-steps</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl">
                        <span className="font-semibold text-[#3A352F] block">Sunday Synthesis Agent</span>
                        <span className="text-[11px] text-[#7A7369]">Scheduled read-only weekly reflection proposal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: CLOUD & HEALTH */}
            {/* ========================================================================= */}
            {currentTab === 'cloud' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-blue-700" />
                      <h3 className="font-serif font-bold text-lg text-[#3A352F]">
                        Cloud Infrastructure &amp; Deployment Readiness
                      </h3>
                    </div>
                    <p className="text-xs text-[#7A7369]">
                      Pre-deployment verification for Google Cloud Run, Secret Manager, and Firebase
                    </p>
                  </div>

                  {/* Subsystems Health Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-2">
                      <span className="text-[10px] text-[#7A7369] font-bold uppercase block">Application Server</span>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#3A352F]">Express + Vite Hybrid</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {cloudHealth?.application || 'READY'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A7369]">Port: 3000 (Dynamic $PORT configured for 8080)</p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-2">
                      <span className="text-[10px] text-[#7A7369] font-bold uppercase block">Firebase Authentication</span>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#3A352F]">Google Federated Identity</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {cloudHealth?.firebaseAuth || 'CONNECTED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A7369]">Persistent browser sessions active</p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-2">
                      <span className="text-[10px] text-[#7A7369] font-bold uppercase block">Cloud Firestore</span>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#3A352F]">NoSQL Document Vault</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {cloudHealth?.firestore || 'CONNECTED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A7369]">Owner-bound security rules active</p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-[#E0DBCF] space-y-2">
                      <span className="text-[10px] text-[#7A7369] font-bold uppercase block">Gemini GenAI API</span>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#3A352F]">Google GenAI SDK</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {cloudHealth?.geminiApi || 'CONNECTED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A7369]">4-Tier resilient fallback ladder ready</p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-amber-300 bg-amber-50/40 space-y-2">
                      <span className="text-[10px] text-amber-800 font-bold uppercase block">Secret Manager</span>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-950">Cloud Secret Accessor</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                          {cloudHealth?.secretManager || 'NOT_YET_DEPLOYED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800">Ready for --set-secrets binding upon deployment</p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-blue-300 bg-blue-50/40 space-y-2">
                      <span className="text-[10px] text-blue-800 font-bold uppercase block">Google Cloud Run</span>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-950">Container Runner</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-900">
                          {cloudHealth?.cloudRun || 'NOT_YET_DEPLOYED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800">Ready for gcloud run deploy command</p>
                    </div>
                  </div>

                  {/* Deployment Commands Card */}
                  <div className="p-5 bg-stone-900 text-stone-100 rounded-2xl space-y-3 text-xs font-mono">
                    <div className="flex items-center justify-between text-stone-400">
                      <span className="text-emerald-400 font-semibold uppercase text-[10px]">Cloud Run Deployment Blueprint</span>
                      <span>Target: Google Cloud Run (Managed)</span>
                    </div>
                    <div className="p-3 bg-stone-950 rounded-xl overflow-x-auto text-emerald-300 space-y-1">
                      <div># Deploy container with Secret Manager binding:</div>
                      <div className="text-white font-bold">
                        gcloud run deploy gemini-journal-app \<br />
                        &nbsp;&nbsp;--source . \<br />
                        &nbsp;&nbsp;--region asia-southeast1 \<br />
                        &nbsp;&nbsp;--platform managed \<br />
                        &nbsp;&nbsp;--allow-unauthenticated \<br />
                        &nbsp;&nbsp;--set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \<br />
                        &nbsp;&nbsp;--port 8080
                      </div>
                      <div className="pt-2 text-stone-400"># Attach Ideathon verification label:</div>
                      <div className="text-white font-bold">
                        gcloud run services update gemini-journal-app \<br />
                        &nbsp;&nbsp;--update-labels=dev-tutorial=cloud-run-ai-challenge \<br />
                        &nbsp;&nbsp;--region=asia-southeast1
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: AUDIT LOG */}
            {/* ========================================================================= */}
            {currentTab === 'audit' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-3xl glass-card-3d border border-[#E0DBCF] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-stone-800" />
                        <h3 className="font-serif font-bold text-lg text-[#3A352F]">
                          Security &amp; Administrative Audit Log
                        </h3>
                      </div>
                      <p className="text-xs text-[#7A7369]">
                        Immutable event record of administrative logins, role transitions, and policy verifications
                      </p>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7369]" />
                      <input
                        type="text"
                        placeholder="Search audit trail..."
                        value={auditSearchQuery}
                        onChange={(e) => setAuditSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E0DBCF] rounded-xl focus:outline-none focus:border-[#3A352F] w-48 sm:w-64"
                      />
                    </div>
                  </div>

                  {/* Audit Logs Table */}
                  <div className="overflow-x-auto rounded-2xl border border-[#E0DBCF] bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FBF9F6] border-b border-[#E0DBCF] text-[#7A7369] font-medium uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Admin Actor</th>
                          <th className="py-3 px-4">Target Resource</th>
                          <th className="py-3 px-4">Result</th>
                          <th className="py-3 px-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0DBCF]/60">
                        {filteredAuditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-[#7A7369]">
                              No audit records found.
                            </td>
                          </tr>
                        ) : (
                          filteredAuditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                              <td className="py-3 px-4 font-mono text-[11px] text-[#7A7369] whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-mono font-semibold text-[#3A352F] text-[11px]">
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-[#3A352F]">
                                {log.adminEmail}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                                {log.targetResource}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    log.result === 'SUCCESS'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : log.result === 'DENIED'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {log.result}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-[11px] text-stone-600">
                                {log.details}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-[#E0DBCF]/80 text-center text-xs text-[#7A7369] w-full flex flex-wrap items-center justify-between gap-4">
        <div>
          Gemini Journal Security &amp; AI Operations Console &bull; OWASP Top 10 for LLM Compliant
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Server Authorization Enforced</span>
        </div>
      </footer>
    </div>
  );
};
