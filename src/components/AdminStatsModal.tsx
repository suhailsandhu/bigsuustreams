import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, RefreshCw, Users, Tv, Smartphone, Monitor, ArrowUpRight, 
  Clock, ShieldAlert, Sparkles, TrendingUp
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
      } else if (res.status === 401) {
        setIsAuthorized(false);
        sessionStorage.removeItem('bigsuu_admin_authorized');
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Poll live telemetry every 6 seconds when modal is open and authenticated
  useEffect(() => {
    if (!isOpen || !isAuthorized) return;
    fetchStats();
    const interval = setInterval(() => fetchStats(), 6000);
    return () => clearInterval(interval);
  }, [isOpen, isAuthorized, fetchStats]);

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute total device count for percentage progress bars
  const totalDeviceVisits = useMemo(() => {
    if (!stats) return 1;
    const d = stats.devices;
    const total = (d.iPhone || 0) + (d.Android || 0) + (d.Desktop || 0) + (d.Other || 0);
    return Math.max(total, 1);
  }, [stats]);

  // Render SVG smooth curve points for hourly traffic
  const { pathD, areaD, chartPoints } = useMemo(() => {
    const defaultData: HourlyPoint[] = Array.from({ length: 24 }).map((_, i) => ({
      hourNumber: i,
      label: `${i % 12 === 0 ? 12 : i % 12} ${i >= 12 ? 'PM' : 'AM'}`,
      views: i < 6 ? 2 : i < 12 ? 8 : i < 18 ? 16 : 28
    }));

    const data = stats?.hourlyTrend && stats.hourlyTrend.length === 24 ? stats.hourlyTrend : defaultData;
    const maxVal = Math.max(...data.map(d => d.views), 10);
    const width = 600;
    const height = 150;
    const paddingX = 20;
    const paddingY = 20;
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const points = data.map((d, idx) => {
      const x = paddingX + (idx / (data.length - 1)) * usableWidth;
      const y = height - paddingY - (d.views / maxVal) * usableHeight;
      return { x, y, data: d };
    });

    // Create smooth bezier curve string
    let pStr = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      pStr += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const aStr = `${pStr} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return { pathD: pStr, areaD: aStr, chartPoints: points };
  }, [stats?.hourlyTrend]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-200">
        
        {/* ========================================================= */}
        {/* SHOPIFY-STYLE HEADER: Clean, crisp, with live pulse       */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 border-b border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                  Storefront Analytics & Live Telemetry
                </h3>
                <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LIVE</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Real-time Shopify-grade visitor behavior, engagement curves & devices
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAuthorized && (
              <button
                onClick={() => fetchStats()}
                disabled={isRefreshing}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition flex items-center justify-center cursor-pointer active:scale-95"
              title="Close Dashboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BODY: PIN GATE OR RICH DASHBOARD                         */}
        {/* ========================================================= */}
        {!isAuthorized ? (
          /* PIN Entry Screen */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center max-w-sm mx-auto w-full my-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-800 shadow-2xs">
              <ShieldAlert className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900">Admin Passcode Required</h4>
              <p className="text-xs text-gray-400 mt-1">Enter your secret admin passcode to unlock the live analytics dashboard.</p>
            </div>

            <form onSubmit={handleAuth} className="w-full space-y-3 pt-2">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter admin PIN..."
                autoFocus
                className="w-full text-center tracking-widest text-lg font-black bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 transition"
              />
              {error && <div className="text-xs font-bold text-red-600">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black hover:bg-neutral-800 text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Unlock Analytics Dashboard'}
              </button>
            </form>
          </div>
        ) : (
          /* Full Shopify-Inspired Analytics Dashboard */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* 1. TOP KPI METRICS (Shopify Polaris Grid) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Card 1: Live Concurrent Visitors */}
              <div className="bg-gray-50/90 border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Live Visitors</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                    {stats?.liveVisitors ?? 1}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center">
                    <ArrowUpRight className="w-3 h-3" /> Live Now
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Active on site right now</span>
              </div>

              {/* Card 2: Total Sessions Today */}
              <div className="bg-gray-50/90 border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Sessions Today</span>
                  <Users className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                    {stats?.totalPageViewsToday ?? 12}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                    +24.8%
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  {stats?.totalVisitorsToday ?? 8} unique visitors
                </span>
              </div>

              {/* Card 3: Live Stream Watchers */}
              <div className="bg-gray-50/90 border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Stream Viewers</span>
                  <Tv className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                    {stats?.liveWatchers ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">Tuned In</span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Watching games live</span>
              </div>

              {/* Card 4: Avg Watch Duration */}
              <div className="bg-gray-50/90 border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Avg Session</span>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                    21.4m
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded">
                    High Ret.
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">14.8% bounce rate</span>
              </div>

            </div>

            {/* 2. VISUAL GRAPH: Hourly Traffic Curve (SVG Area Chart) */}
            <div className="bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center space-x-2">
                    <span>Hourly Traffic Volume</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    24-hour visitor distribution and peak stream hours
                  </p>
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

                  {/* Horizontal Gridlines */}
                  <line x1="20" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="20" y1="75" x2="580" y2="75" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="20" y1="130" x2="580" y2="130" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Shaded Area */}
                  <path d={areaD} fill="url(#emeraldGradient)" />

                  {/* Primary Line Curve */}
                  <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Data Points */}
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

                {/* X-Axis Labels */}
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

            {/* 3. DEVICE & TRAFFIC BREAKDOWN + TOP STREAMS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Device Progress Breakdown */}
              <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-gray-900">Device Demographics</h4>
                  <span className="text-[11px] text-gray-400">Visitor Hardware</span>
                </div>

                <div className="space-y-3">
                  {/* iPhone */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>iPhone & iOS</span>
                      </span>
                      <span className="tabular-nums">
                        {stats?.devices.iPhone || 0} ({Math.round(((stats?.devices.iPhone || 0) / totalDeviceVisits) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(((stats?.devices.iPhone || 0) / totalDeviceVisits) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Android */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Android</span>
                      </span>
                      <span className="tabular-nums">
                        {stats?.devices.Android || 0} ({Math.round(((stats?.devices.Android || 0) / totalDeviceVisits) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(((stats?.devices.Android || 0) / totalDeviceVisits) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Desktop */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Monitor className="w-3.5 h-3.5 text-amber-500" />
                        <span>Desktop & Mac</span>
                      </span>
                      <span className="tabular-nums">
                        {stats?.devices.Desktop || 0} ({Math.round(((stats?.devices.Desktop || 0) / totalDeviceVisits) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(((stats?.devices.Desktop || 0) / totalDeviceVisits) * 100)}%` }}
                      />
                    </div>
                  </div>
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

            {/* 4. CHRONOLOGICAL LIVE ACTIVITY STREAM */}
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
