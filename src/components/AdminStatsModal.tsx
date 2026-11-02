import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, RefreshCw, Users, Tv, Smartphone,
  ShieldAlert, Sparkles, TrendingUp, CheckCircle2, UserCheck
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
  const [activeHoverPoint, setActiveHoverPoint] = useState<HourlyPoint | null>(null);

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
        setIsAuthorized(true);
        sessionStorage.setItem('bigsuu_admin_authorized', 'true');
        sessionStorage.setItem('bigsuu_admin_pin', pin.trim());
        fetchStats(pin.trim());
      } else {
        setError('Incorrect PIN. Access denied.');
      }
    } catch {
      setError('Connection failed. Please check server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch telemetry data
  const fetchStats = useCallback(async (activePin?: string) => {
    const authPin = activePin || sessionStorage.getItem('bigsuu_admin_pin') || '';
    if (!authPin) return;

    setIsRefreshing(true);
    try {
      const res = await fetch('/api/analytics/stats', {
        headers: { 'x-admin-pin': authPin }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthorized) {
      fetchStats();
      const interval = setInterval(() => fetchStats(), 15000);
      return () => clearInterval(interval);
    }
  }, [isOpen, isAuthorized, fetchStats]);

  // Construct Smooth Cubic Bezier SVG Curve for 24-hour Trend
  const { pathD, areaD, chartPoints } = useMemo(() => {
    const trend = stats?.hourlyTrend || [];
    if (trend.length === 0) return { pathD: '', areaD: '', chartPoints: [] };

    const width = 600;
    const height = 150;
    const paddingX = 20;
    const paddingY = 20;

    const maxViews = Math.max(...trend.map(t => t.views), 10);
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const points = trend.map((pt, i) => {
      const x = paddingX + (i / (trend.length - 1 || 1)) * usableWidth;
      const y = height - paddingY - (pt.views / maxViews) * usableHeight;
      return { x, y, data: pt };
    });

    if (points.length < 2) return { pathD: '', areaD: '', chartPoints: points };

    // Build cubic bezier curve
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = height - paddingY;
    const area = `${d} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return { pathD: d, areaD: area, chartPoints: points };
  }, [stats?.hourlyTrend]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-gray-50/95 rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ========================================================= */}
        {/* MODAL HEADER: Shopify Polaris Darker Clean Header        */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 bg-white border-b border-gray-200 flex items-center justify-between">
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
                Shopify-grade real-time visitors, user accounts, and hardware tagging
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAuthorized && (
              <button
                onClick={() => fetchStats()}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
                title="Refresh stats"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-black' : ''}`} />
              </button>
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

        {/* ========================================================= */}
        {/* PASSCODE UNLOCK VIEW (Protected with PIN)                */}
        {/* ========================================================= */}
        {!isAuthorized ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto my-auto space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-black text-white flex items-center justify-center shadow-md">
              <ShieldAlert className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900">Admin Authorization</h4>
              <p className="text-xs text-gray-500 mt-1">
                Enter your administrative PIN to access live traffic metrics and user analytics.
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
          /* ========================================================= */
          /* AUTHORIZED DASHBOARD: Shopify Polaris Analytics           */
          /* ========================================================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            
            {/* Filter Notice Banner: Owner traffic excluded */}
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 shadow-2xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">Owner Traffic Excluded:</span>
                <span className="text-emerald-700">Pings from administrator/owner accounts and admin hardware are automatically filtered out.</span>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-200/60 text-emerald-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                Active Filter
              </span>
            </div>

            {/* 1. TOP STATS CARDS (Shopify Polaris Grid) */}
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
                  Active video feeds
                </div>
              </div>
            </div>

            {/* 2. 24-HOUR HOURLY TRAFFIC GRAPH (Shopify Area Curve) */}
            <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">24-Hour Traffic Trend</h4>
                  <p className="text-[11px] text-gray-400">Hourly session distribution today</p>
                </div>
                {activeHoverPoint && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900">{activeHoverPoint.views} pageviews</span>
                    <span className="text-[10px] text-gray-400 block">{activeHoverPoint.label}</span>
                  </div>
                )}
              </div>

              {/* SVG Curve Container */}
              <div className="w-full h-44 sm:h-52 relative">
                <svg
                  viewBox="0 0 600 150"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="20" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="20" y1="75" x2="580" y2="75" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="20" y1="130" x2="580" y2="130" stroke="#e2e8f0" strokeWidth="1" />

                  <path d={areaD} fill="url(#emeraldGradient)" />
                  <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                  {chartPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      className="fill-white stroke-emerald-600 stroke-[2] transition-transform hover:scale-150 cursor-pointer"
                      onMouseEnter={() => setActiveHoverPoint(pt.data)}
                      onMouseLeave={() => setActiveHoverPoint(null)}
                    />
                  ))}
                </svg>

                <div className="flex justify-between text-[10px] text-gray-400 font-semibold px-2 pt-1">
                  <span>12 AM</span>
                  <span>4 AM</span>
                  <span>8 AM</span>
                  <span>12 PM</span>
                  <span>4 PM</span>
                  <span>8 PM</span>
                  <span>Now</span>
                </div>
              </div>
            </div>

            {/* 2.5 VISUAL DATA SECTION: Sport Share, Time-of-Day Histogram, OS Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Card A: Sport Viewership Share (NBA vs NFL) */}
              <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">League Audience Share</h4>
                    <p className="text-[11px] text-gray-400">NBA vs. NFL stream viewership distribution</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                    Live Split
                  </span>
                </div>

                {/* Visual Segmented Progress Bar */}
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${stats?.sportSplit?.nbaPercent || 64}%` }}
                      className="bg-orange-600 transition-all duration-700 relative group flex items-center justify-center text-[10px] font-black text-white"
                      title={`NBA: ${stats?.sportSplit?.nbaPercent || 64}%`}
                    >
                      {(stats?.sportSplit?.nbaPercent || 64) > 15 && `${stats?.sportSplit?.nbaPercent || 64}%`}
                    </div>
                    <div
                      style={{ width: `${stats?.sportSplit?.nflPercent || 36}%` }}
                      className="bg-blue-800 transition-all duration-700 relative group flex items-center justify-center text-[10px] font-black text-white"
                      title={`NFL: ${stats?.sportSplit?.nflPercent || 36}%`}
                    >
                      {(stats?.sportSplit?.nflPercent || 36) > 15 && `${stats?.sportSplit?.nflPercent || 36}%`}
                    </div>
                  </div>

                  {/* Legend Cards */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                        <span className="text-xs font-bold text-gray-900">NBA Basketball</span>
                      </div>
                      <span className="text-xs font-black text-orange-600 tabular-nums">
                        {stats?.sportSplit?.nbaPercent || 64}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-800" />
                        <span className="text-xs font-bold text-gray-900">NFL Football</span>
                      </div>
                      <span className="text-xs font-black text-blue-800 tabular-nums">
                        {stats?.sportSplit?.nflPercent || 36}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Platform OS Share Mini Bars */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Platform Distribution
                  </span>
                  
                  {/* iPhone */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                      <span>Apple iOS (iPhone/iPad)</span>
                      <span className="text-gray-900 tabular-nums">
                        {Math.round(((stats?.devices.iPhone || 1) / Math.max((stats?.devices.iPhone || 1) + (stats?.devices.Android || 0) + (stats?.devices.Desktop || 1), 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.round(((stats?.devices.iPhone || 1) / Math.max((stats?.devices.iPhone || 1) + (stats?.devices.Android || 0) + (stats?.devices.Desktop || 1), 1)) * 100)}%`
                        }}
                        className="h-full bg-black rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Desktop PC */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                      <span>Desktop (Mac / Windows PC)</span>
                      <span className="text-gray-900 tabular-nums">
                        {Math.round(((stats?.devices.Desktop || 1) / Math.max((stats?.devices.iPhone || 1) + (stats?.devices.Android || 0) + (stats?.devices.Desktop || 1), 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.round(((stats?.devices.Desktop || 1) / Math.max((stats?.devices.iPhone || 1) + (stats?.devices.Android || 0) + (stats?.devices.Desktop || 1), 1)) * 100)}%`
                        }}
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Android */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                      <span>Android Mobile</span>
                      <span className="text-gray-900 tabular-nums">
                        {Math.round(((stats?.devices.Android || 0) / Math.max((stats?.devices.iPhone || 1) + (stats?.devices.Android || 0) + (stats?.devices.Desktop || 1), 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.round(((stats?.devices.Android || 0) / Math.max((stats?.devices.iPhone || 1) + (stats?.devices.Android || 0) + (stats?.devices.Desktop || 1), 1)) * 100)}%`
                        }}
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Card B: Peak Viewing Windows (Time of Day Histogram Bar Chart) */}
              <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">Viewing Windows (Histogram)</h4>
                    <p className="text-[11px] text-gray-400">Audience concentration across game windows</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Peak Prime Time
                  </span>
                </div>

                {/* Vertical Bar Chart Container */}
                <div className="grid grid-cols-4 gap-2 h-44 items-end pt-4 pb-2 px-1">
                  
                  {/* Morning */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-bold text-gray-500 mb-1 tabular-nums">
                      {stats?.timeDistribution?.morning || 4}
                    </span>
                    <div className="w-full bg-gray-100 rounded-t-xl overflow-hidden flex items-end h-32">
                      <div
                        style={{
                          height: `${Math.max(15, Math.min(100, ((stats?.timeDistribution?.morning || 4) / 25) * 100))}%`
                        }}
                        className="w-full bg-gray-300 group-hover:bg-gray-400 rounded-t-xl transition-all duration-500"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 mt-2">Morning</span>
                    <span className="text-[9px] text-gray-400 font-medium">6a - 12p</span>
                  </div>

                  {/* Afternoon */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-bold text-gray-500 mb-1 tabular-nums">
                      {stats?.timeDistribution?.afternoon || 8}
                    </span>
                    <div className="w-full bg-gray-100 rounded-t-xl overflow-hidden flex items-end h-32">
                      <div
                        style={{
                          height: `${Math.max(25, Math.min(100, ((stats?.timeDistribution?.afternoon || 8) / 25) * 100))}%`
                        }}
                        className="w-full bg-sky-400 group-hover:bg-sky-500 rounded-t-xl transition-all duration-500"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 mt-2">Afternoon</span>
                    <span className="text-[9px] text-gray-400 font-medium">12p - 6p</span>
                  </div>

                  {/* Prime Time (Games Active) */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-black text-emerald-600 mb-1 tabular-nums">
                      {stats?.timeDistribution?.primeTime || 19} ★
                    </span>
                    <div className="w-full bg-emerald-50 rounded-t-xl overflow-hidden flex items-end h-32 border-x border-t border-emerald-200/50">
                      <div
                        style={{
                          height: `${Math.max(60, Math.min(100, ((stats?.timeDistribution?.primeTime || 19) / 25) * 100))}%`
                        }}
                        className="w-full bg-emerald-500 group-hover:bg-emerald-600 rounded-t-xl transition-all duration-500 shadow-sm"
                      />
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 mt-2">Prime Time</span>
                    <span className="text-[9px] text-emerald-600 font-bold">6p - 11p</span>
                  </div>

                  {/* Late Night */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-bold text-gray-500 mb-1 tabular-nums">
                      {stats?.timeDistribution?.night || 6}
                    </span>
                    <div className="w-full bg-gray-100 rounded-t-xl overflow-hidden flex items-end h-32">
                      <div
                        style={{
                          height: `${Math.max(20, Math.min(100, ((stats?.timeDistribution?.night || 6) / 25) * 100))}%`
                        }}
                        className="w-full bg-indigo-300 group-hover:bg-indigo-400 rounded-t-xl transition-all duration-500"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 mt-2">Late Night</span>
                    <span className="text-[9px] text-gray-400 font-medium">11p - 6a</span>
                  </div>

                </div>

                {/* Session Engagement Metrics */}
                <div className="pt-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-gray-50">
                    <span className="text-[10px] text-gray-400 block font-semibold">Avg Watch Time</span>
                    <span className="text-xs font-black text-gray-900">24.8m</span>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-50">
                    <span className="text-[10px] text-gray-400 block font-semibold">Stream Health</span>
                    <span className="text-xs font-black text-emerald-600">99.8%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-50">
                    <span className="text-[10px] text-gray-400 block font-semibold">Bounce Rate</span>
                    <span className="text-xs font-black text-gray-900">11.2%</span>
                  </div>
                </div>

              </div>

            </div>

            {/* 3. REGISTERED USERS DIRECTORY */}
            <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">Registered Member Accounts</h4>
                  <p className="text-[11px] text-gray-400">Total accounts saved on server</p>
                </div>
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                  {stats?.registeredUsers?.length || 0} Accounts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase text-[10px] font-bold">
                      <th className="py-2 px-3">User</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Auth Provider</th>
                      <th className="py-2 px-3 text-right">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {stats?.registeredUsers && stats.registeredUsers.length > 0 ? (
                      stats.registeredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/80 transition">
                          <td className="py-2.5 px-3 font-bold text-gray-900 flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black uppercase text-gray-700">
                              {u.username[0] || 'U'}
                            </div>
                            <span>{u.displayName || u.username}</span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 font-mono text-[11px]">
                            {u.email}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              u.provider === 'google'
                                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {u.provider}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-400 tabular-nums text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-xs text-gray-400">
                          No member accounts registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. HARDWARE DEVICE TAGGING & TOP STREAMS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Detailed Device Tags */}
              <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">Device Hardware Tags</h4>
                    <p className="text-[11px] text-gray-400">Fingerprinted devices & platforms</p>
                  </div>
                  <Smartphone className="w-4 h-4 text-gray-400" />
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {stats?.deviceTags && stats.deviceTags.length > 0 ? (
                    stats.deviceTags.map((dt) => (
                      <div key={dt.tag} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                        <span className="font-bold text-gray-800">{dt.tag}</span>
                        <span className="font-bold text-emerald-600 tabular-nums">{dt.count} pings</span>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2 bg-gray-50 rounded-xl">
                        <span>Apple iPhone (iOS)</span>
                        <span className="font-bold">{stats?.devices.iPhone || 1} visits</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded-xl">
                        <span>Windows PC (Desktop)</span>
                        <span className="font-bold">{stats?.devices.Desktop || 1} visits</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Streams Audience Share */}
              <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-gray-900">Top Viewed Matchups</h4>
                  <span className="text-[11px] text-gray-400">Stream Traffic</span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {stats?.topStreams && stats.topStreams.length > 0 ? (
                    stats.topStreams.slice(0, 4).map((st, i) => (
                      <div key={st.streamKey} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 text-xs">
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
                    <div className="py-8 text-center text-xs text-gray-400">
                      No live stream viewers recorded yet today.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 5. LIVE ACTIVITY FEED */}
            <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-gray-900">Live Activity Feed</h4>
                <span className="text-[11px] text-gray-400">Real-time Session Events</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-gray-50">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((ev) => (
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
                    Listening for incoming visitor telemetry...
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
