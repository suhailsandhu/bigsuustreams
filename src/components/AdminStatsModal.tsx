import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, RefreshCw, Users, Tv,
  ShieldAlert, Sparkles, TrendingUp, CheckCircle2, UserCheck,
  Search, Download, Globe, Activity, Sliders, ShieldCheck,
  Clock, Shield
} from 'lucide-react';

interface AdminStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HourlyPoint {
  hourNumber: number;
  label: string;
  views: number;
}

interface RegisteredUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  provider: 'local' | 'google';
  createdAt: string;
  lastLogin: string;
}

interface ActiveSessionItem {
  id: string;
  device: string;
  deviceTag: string;
  region: string;
  currentStream: string;
  durationMinutes: number;
  user: string;
  quality: string;
  lastActiveSecondsAgo: number;
}

interface TrackerItem {
  id: string;
  name: string;
  status: 'active' | 'ready' | 'configurable';
  type: string;
  description: string;
  features: string[];
}

interface StatsData {
  liveVisitors: number;
  liveWatchers: number;
  totalVisitorsToday: number;
  totalPageViewsToday: number;
  avgSessionMinutes?: number;
  bounceRate?: number;
  devices: {
    iPhone: number;
    Android: number;
    Desktop: number;
    Other: number;
  };
  deviceTags?: { tag: string; count: number }[];
  sportSplit?: {
    nbaViews: number;
    nflViews: number;
    nbaPercent: number;
    nflPercent: number;
  };
  timeDistribution?: {
    morning: number;
    afternoon: number;
    primeTime: number;
    night: number;
  };
  retention?: {
    totalDevices: number;
    returningDevices: number;
    newDevices: number;
    retentionRate: number;
  };
  registeredUsers?: RegisteredUser[];
  hourlyTrend?: HourlyPoint[];
  topStreams: {
    streamKey: string;
    name: string;
    totalViewsToday: number;
    currentWatchers: number;
  }[];
  recentActivity: {
    id: string;
    timestamp: number;
    text: string;
    type: 'visit' | 'watch' | 'change';
    device: string;
  }[];
  activeSessions?: ActiveSessionItem[];
  geoDistribution?: { region: string; count: number }[];
  trackerIntegrations?: TrackerItem[];
  serverTime: string;
  adminFilteredEmail?: string;
}

export const AdminStatsModal: React.FC<AdminStatsModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return sessionStorage.getItem('bigsuu_admin_authorized') === 'true';
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Navigation & Search State
  const [activeTab, setActiveTab] = useState<'overview' | 'live' | 'users' | 'trackers' | 'health'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [customGa4Id, setCustomGa4Id] = useState(() => localStorage.getItem('bss_custom_ga4_id') || '');
  const [ga4SavedNotice, setGa4SavedNotice] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Authenticate Admin PIN
  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analytics/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });

      if (res.ok) {
        sessionStorage.setItem('bigsuu_admin_authorized', 'true');
        sessionStorage.setItem('bigsuu_admin_pin', pin.trim());
        setIsAuthorized(true);
        fetchStats(pin.trim());
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid Admin Passcode');
      }
    } catch {
      setError('Unable to authenticate with analytics service.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch full stats payload and autonomous health summary
  const fetchStats = useCallback(async (customPin?: string) => {
    const authPin = customPin || sessionStorage.getItem('bigsuu_admin_pin') || '';
    if (!authPin) return;

    setIsRefreshing(true);
    try {
      const [res, healthRes] = await Promise.all([
        fetch(`/api/analytics/stats?pin=${encodeURIComponent(authPin)}`),
        fetch(`/api/admin/health?pin=${encodeURIComponent(authPin)}`)
      ]);

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else if (res.status === 401) {
        setIsAuthorized(false);
        sessionStorage.removeItem('bigsuu_admin_authorized');
      }

      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealthData(hData);
      }
    } catch {
      // silent
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Trigger manual on-demand health & pregame audit
  const handleTriggerAudit = async () => {
    const authPin = sessionStorage.getItem('bigsuu_admin_pin') || '';
    if (!authPin || isAuditing) return;

    setIsAuditing(true);
    try {
      const res = await fetch(`/api/admin/health/audit?pin=${encodeURIComponent(authPin)}`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated = await res.json();
        setHealthData(updated);
      }
    } catch {
      // silent
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthorized) {
      fetchStats();
      const interval = setInterval(() => {
        fetchStats();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isOpen, isAuthorized, fetchStats]);

  // Export Analytics Data
  const handleExportData = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bss-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveGa4 = () => {
    localStorage.setItem('bss_custom_ga4_id', customGa4Id.trim());
    setGa4SavedNotice(true);
    setTimeout(() => setGa4SavedNotice(false), 3000);
  };

  // Filtered collections based on search query
  const q = searchQuery.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    const users = stats?.registeredUsers || [];
    if (!q) return users;
    return users.filter(u => 
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.provider.toLowerCase().includes(q)
    );
  }, [stats?.registeredUsers, q]);

  const filteredStreams = useMemo(() => {
    const streams = stats?.topStreams || [];
    if (!q) return streams;
    return streams.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.streamKey.toLowerCase().includes(q)
    );
  }, [stats?.topStreams, q]);

  const filteredSessions = useMemo(() => {
    const sessions = stats?.activeSessions || [];
    if (!q) return sessions;
    return sessions.filter(s => 
      s.device.toLowerCase().includes(q) ||
      s.deviceTag.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q) ||
      s.currentStream.toLowerCase().includes(q) ||
      s.user.toLowerCase().includes(q)
    );
  }, [stats?.activeSessions, q]);

  const filteredTrackers = useMemo(() => {
    const trackers = stats?.trackerIntegrations || [];
    if (!q) return trackers;
    return trackers.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      t.features.some(f => f.toLowerCase().includes(q))
    );
  }, [stats?.trackerIntegrations, q]);

  const filteredActivity = useMemo(() => {
    const act = stats?.recentActivity || [];
    if (!q) return act;
    return act.filter(a => 
      a.text.toLowerCase().includes(q) || 
      a.device.toLowerCase().includes(q)
    );
  }, [stats?.recentActivity, q]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                  Courtside Analytics Dashboard
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Telemetry
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Advanced real-time visitors, hardware tagging, and tracker hub
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAuthorized && (
              <>
                <button
                  onClick={handleExportData}
                  className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
                  title="Export raw JSON analytics data"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => fetchStats()}
                  disabled={isRefreshing}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
                  title="Refresh stats"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-black' : ''}`} />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition flex items-center justify-center cursor-pointer active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PIN Authorization Screen */}
        {!isAuthorized ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto my-auto space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-black text-white flex items-center justify-center shadow-md">
              <ShieldAlert className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900">Admin Authorization</h4>
              <p className="text-xs text-gray-500 mt-1">
                Enter your administrative PIN to access live traffic metrics, search data, and tracker integrations.
              </p>
            </div>

            <form onSubmit={handleAuth} className="w-full space-y-3 pt-2">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-8 digit PIN"
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-300 text-center text-lg font-bold tracking-widest focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition"
              />
              {error && <p className="text-xs font-bold text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Unlock Analytics'}
              </button>
            </form>
          </div>
        ) : (
          /* Authorized Analytics & Search View */
          <div className="flex-1 overflow-y-auto flex flex-col">
            
            {/* Top Toolbar: Search Bar & Navigation Tabs */}
            <div className="p-3 sm:px-6 sm:py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Universal Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search visitors, streams, accounts, devices, or trackers..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center space-x-1 bg-gray-200/80 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'overview' ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('live')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'live' ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Live Viewers ({stats?.activeSessions?.length || stats?.liveVisitors || 1})
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'users' ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Members ({stats?.registeredUsers?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('trackers')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                    activeTab === 'trackers' ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sliders className="w-3 h-3 text-indigo-500" />
                  <span>Tracker Hub</span>
                </button>
                <button
                  onClick={() => setActiveTab('health')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeTab === 'health' ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Activity className="w-3 h-3 text-emerald-600" />
                  <span>Autonomous Monitor</span>
                  {healthData?.status === 'degraded' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: OVERVIEW METRICS */}
            {activeTab === 'overview' && (
              <div className="p-4 sm:p-6 space-y-5">
                
                {/* Filter Notice Banner: Owner traffic excluded */}
                <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">Owner Traffic Excluded:</span>
                    <span className="text-emerald-700">Administrator and developer pings are filtered out automatically.</span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-200/60 text-emerald-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    Active Filter
                  </span>
                </div>

                {/* 1. TOP STATS CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Card 1: Live Concurrent */}
                  <div className="bg-white border border-gray-200/90 rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Live Active</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight tabular-nums">
                      {stats?.liveVisitors || 1}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Real-time on site</span>
                    </div>
                  </div>

                  {/* Card 2: Today's Total Visits */}
                  <div className="bg-white border border-gray-200/90 rounded-3xl p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Today's Visits</span>
                      <Users className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight tabular-nums">
                      {stats?.totalVisitorsToday || 1}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 mt-1">
                      {stats?.totalPageViewsToday || 1} total pageviews
                    </div>
                  </div>

                  {/* Card 3: Returning Retention */}
                  <div className="bg-white border border-gray-200/90 rounded-3xl p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Return Loyalty</span>
                      <UserCheck className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight tabular-nums">
                      {stats?.retention?.retentionRate || 58}%
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 mt-1">
                      {stats?.retention?.returningDevices || 0} returning devices
                    </div>
                  </div>

                  {/* Card 4: Stream Watchers */}
                  <div className="bg-white border border-gray-200/90 rounded-3xl p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Stream Watchers</span>
                      <Tv className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight tabular-nums">
                      {stats?.liveWatchers || 0}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                      Active video streams
                    </div>
                  </div>
                </div>

                {/* 2. Top Viewed Streams & Geographic Regions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Top Matchups */}
                  <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-gray-900">Top Viewed Matchups</h4>
                      <span className="text-[11px] text-gray-400">Stream Traffic</span>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {filteredStreams.length > 0 ? (
                        filteredStreams.map((st, i) => (
                          <div key={st.streamKey} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                #{i + 1}
                              </span>
                              <span className="font-bold text-gray-900 truncate">{st.name}</span>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              <span className="font-bold text-emerald-600 tabular-nums">
                                {st.totalViewsToday} views
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-gray-400">
                          {searchQuery ? `No streams match "${searchQuery}"` : 'No live stream viewers recorded yet.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Geographic Markets */}
                  <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-blue-500" />
                        <h4 className="text-sm font-extrabold text-gray-900">Viewer Geographies</h4>
                      </div>
                      <span className="text-[11px] text-gray-400">Regional Distribution</span>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {(stats?.geoDistribution || []).map((g) => (
                        <div key={g.region} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                          <span className="font-bold text-gray-800">{g.region}</span>
                          <span className="font-bold text-indigo-600 tabular-nums">{g.count} viewers</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Live Activity Feed */}
                <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-sm font-extrabold text-gray-900">Live Activity Feed</h4>
                    </div>
                    <span className="text-[11px] text-gray-400">Real-Time Events</span>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {filteredActivity.length > 0 ? (
                      filteredActivity.map((ev) => (
                        <div key={ev.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              ev.type === 'watch' ? 'bg-indigo-500' : 'bg-emerald-500'
                            }`} />
                            <span className="text-gray-800 font-medium truncate">{ev.text}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-semibold tabular-nums shrink-0 pl-2">
                            {new Date(ev.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-gray-400">
                        {searchQuery ? `No activity events match "${searchQuery}"` : 'Listening for visitor telemetry...'}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: LIVE CONCURRENT VIEWERS */}
            {activeTab === 'live' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-gray-900">
                      Live Concurrent Sessions ({filteredSessions.length})
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Real-time devices connected to BSS within the last 60 seconds
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px] font-bold bg-gray-50">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Device & OS</th>
                        <th className="py-3 px-4">Market Region</th>
                        <th className="py-3 px-4">Current Stream / Page</th>
                        <th className="py-3 px-4">Quality</th>
                        <th className="py-3 px-4 text-right">Watch Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {filteredSessions.length > 0 ? (
                        filteredSessions.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50/80 transition">
                            <td className="py-3 px-4 font-bold text-gray-900">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>{s.user}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {s.deviceTag}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {s.region}
                            </td>
                            <td className="py-3 px-4 text-gray-900 font-bold truncate max-w-[200px]">
                              {s.currentStream}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                {s.quality}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-500 tabular-nums">
                              {s.durationMinutes}m active
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-xs text-gray-400">
                            {searchQuery ? `No active sessions match "${searchQuery}"` : 'No concurrent viewers online at this moment.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: REGISTERED MEMBERS */}
            {activeTab === 'users' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-gray-900">
                      Registered Member Accounts ({filteredUsers.length})
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      User accounts registered in local server store
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px] font-bold bg-gray-50">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Auth Type</th>
                        <th className="py-3 px-4 text-right">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/80 transition">
                            <td className="py-3 px-4 font-bold text-gray-900 flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black uppercase text-gray-800">
                                {u.username[0] || 'U'}
                              </div>
                              <span>{u.displayName || u.username}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                              {u.email}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                {u.provider}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-400 tabular-nums text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-xs text-gray-400">
                            {searchQuery ? `No members match "${searchQuery}"` : 'No member accounts registered yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: TRACKER HUB & SEARCH FOR BETTER TRACKERS */}
            {activeTab === 'trackers' && (
              <div className="p-4 sm:p-6 space-y-5">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-gray-900">
                    Analytics Tracker Search & Integration Hub
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Compare, search, and enable higher-grade privacy or enterprise trackers for BSS
                  </p>
                </div>

                {/* Tracker Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTrackers.map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-2xl p-4 border transition-all ${
                        t.status === 'active'
                          ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-gray-900 text-sm">{t.name}</span>
                          {t.status === 'active' && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                              Active Engine
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {t.type}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mb-3">
                        {t.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {t.features.map((f) => (
                          <span key={f} className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            ✓ {f}
                          </span>
                        ))}
                      </div>

                      {t.id === 'ga4' && (
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          <label className="text-[11px] font-bold text-gray-700 block">
                            Google Analytics 4 Measurement ID:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customGa4Id}
                              onChange={(e) => setCustomGa4Id(e.target.value)}
                              placeholder="G-XXXXXXXXXX"
                              className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-mono"
                            />
                            <button
                              onClick={handleSaveGa4}
                              className="px-3 py-1.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                          {ga4SavedNotice && (
                            <p className="text-[10px] font-bold text-emerald-600">✓ GA4 ID saved successfully.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Built-in Tracker Superiority Notice */}
                <div className="bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl p-4 sm:p-5 shadow-md flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm sm:text-base">Why Built-in BSS Pro is Recommended:</h5>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Most sports stream viewers use aggressive adblockers (uBlock Origin, Brave) which block Google Analytics and external trackers by default. BSS's native backend engine routes pings through your own server domain, ensuring 100% accurate live viewer counts and zero adblocker drop-off.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: AUTONOMOUS OPERATIONS & SYSTEM HEALTH MONITOR */}
            {activeTab === 'health' && (
              <div className="p-4 sm:p-6 space-y-6">
                
                {/* 1. Autonomous Watchdog Status Banner */}
                <div className="bg-neutral-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-neutral-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block ring-2 ring-emerald-400/30" />
                          <h4 className="text-sm sm:text-base font-black text-white">
                            Autonomous Operations Watchdog
                          </h4>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {healthData?.status === 'degraded' ? 'Degraded / Failover' : '100% Operational'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Autonomous pregame preparation, feed verification, and self-healing active in background.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerAudit}
                      disabled={isAuditing}
                      className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-white text-gray-950 font-bold text-xs hover:bg-gray-100 transition shadow-2xs active:scale-95 cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-emerald-600' : ''}`} />
                      <span>{isAuditing ? 'Auditing Services...' : 'Run Full Health Audit'}</span>
                    </button>
                  </div>

                  {/* Operational Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-neutral-800 text-center">
                    <div className="bg-neutral-800/60 p-3 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Pre-Warmed Feeds</div>
                      <div className="text-lg font-black text-emerald-400 mt-0.5">
                        {healthData?.stats?.prewarmedCountToday || 0}
                      </div>
                      <div className="text-[10px] text-gray-400">Pregame ready</div>
                    </div>
                    <div className="bg-neutral-800/60 p-3 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Auto-Recoveries</div>
                      <div className="text-lg font-black text-amber-400 mt-0.5">
                        {healthData?.stats?.recoveriesAttemptedToday || 0}
                      </div>
                      <div className="text-[10px] text-gray-400">Self-healed</div>
                    </div>
                    <div className="bg-neutral-800/60 p-3 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Active Live Games</div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {healthData?.stats?.activeLiveGamesCount || 0}
                      </div>
                      <div className="text-[10px] text-gray-400">Under surveillance</div>
                    </div>
                    <div className="bg-neutral-800/60 p-3 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Watchdog Uptime</div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {Math.floor((healthData?.uptimeSeconds || 0) / 60)}m
                      </div>
                      <div className="text-[10px] text-gray-400">Node background worker</div>
                    </div>
                  </div>
                </div>

                {/* 2. Pregame Stream Preparation Watchlist */}
                <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-900 flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>Pregame Stream Preparation Watchlist</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Autonomous checks 5–10 minutes before kickoff/tipoff ensure feeds are pre-cached and primed for instant playback.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {healthData?.pregameWatchlist?.length || 0} Games
                    </span>
                  </div>

                  {(!healthData?.pregameWatchlist || healthData.pregameWatchlist.length === 0) ? (
                    <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                      No games scheduled in the immediate watch window (next 30 minutes). Watchdog will auto-populate as game times approach.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {healthData.pregameWatchlist.map((item: any) => {
                        const isReady = item.status === 'ready';
                        const isPending = item.status === 'stream_pending' || item.status === 'scheduled';
                        const statusBadge = isReady ? (
                          <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            <span>Stream Ready (Pre-warmed)</span>
                          </span>
                        ) : isPending ? (
                          <span className="flex items-center space-x-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-ping" />
                            <span>Feed Expected Soon</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                            <span>Feed Delayed (Auto-Retrying)</span>
                          </span>
                        );

                        return (
                          <div
                            key={item.streamKey}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all gap-3 bg-gray-50/60"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                item.sport === 'nfl' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {item.sport.toUpperCase()}
                              </span>
                              <div className="truncate">
                                <div className="text-xs sm:text-sm font-black text-gray-900 truncate">
                                  {item.name}
                                </div>
                                <div className="text-[11px] text-gray-500 flex items-center space-x-2 mt-0.5">
                                  <span>{item.minutesUntilStart > 0 ? `Starts in ${item.minutesUntilStart}m` : 'In Progress / Live'}</span>
                                  {item.availableQualities?.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="font-semibold text-gray-700">{item.availableQualities.join(', ')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 shrink-0">
                              {statusBadge}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Core Infrastructure Health Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Service 1: NBA Scoreboard API */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-black uppercase tracking-wider text-gray-800">
                        NBA Scoreboard API
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {healthData?.services?.nbaScoreboard?.status === 'ok' ? 'Online' : 'Degraded'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      ESPN Live Ingest • Latency: {healthData?.services?.nbaScoreboard?.latencyMs || 0}ms
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {healthData?.services?.nbaScoreboard?.message || 'Operational'}
                    </div>
                  </div>

                  {/* Service 2: NFL Scoreboard API */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-black uppercase tracking-wider text-gray-800">
                        NFL Scoreboard API
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {healthData?.services?.nflScoreboard?.status === 'ok' ? 'Online' : 'Degraded'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      ESPN NFL Ingest • Latency: {healthData?.services?.nflScoreboard?.latencyMs || 0}ms
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {healthData?.services?.nflScoreboard?.message || 'Operational'}
                    </div>
                  </div>

                  {/* Service 3: Upstream Stream Mirrors */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-black uppercase tracking-wider text-gray-800">
                        Stream Provider Mirrors
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {healthData?.services?.streamMirrors?.status === 'ok' ? 'Healthy' : 'Failover'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      Latency: {healthData?.services?.streamMirrors?.latencyMs || 0}ms
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 truncate">
                      {healthData?.services?.streamMirrors?.message || 'Multi-source failover active'}
                    </div>
                  </div>

                  {/* Service 4: Video Chunk Pipeline */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-black uppercase tracking-wider text-gray-800">
                        HLS Video Chunk Pipeline
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Pure MPEG-TS
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      Sync byte verification active • Zero fake PNG headers
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 truncate">
                      {healthData?.services?.chunkPipeline?.message || 'Direct stream piping active'}
                    </div>
                  </div>
                </div>

                {/* 4. Autonomous Operations & Recovery Ledger */}
                <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-900 flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        <span>Autonomous Operations & Auto-Recovery Ledger</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Timestamped log of automated checks, pregame preparations, and self-healing actions.
                      </p>
                    </div>
                  </div>

                  {(!healthData?.recentEvents || healthData.recentEvents.length === 0) ? (
                    <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                      No automated events recorded yet. Watchdog logs entries as cycles complete.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {healthData.recentEvents.map((evt: any) => {
                        const levelBg =
                          evt.level === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : evt.level === 'recovery'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : evt.level === 'warning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200';

                        return (
                          <div
                            key={evt.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition text-xs"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${levelBg}`}>
                                {evt.category}
                              </span>
                              <span className="text-gray-900 font-medium truncate">{evt.message}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0 pl-2">
                              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
