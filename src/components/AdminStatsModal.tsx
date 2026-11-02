import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  Eye,
  Play,
  Smartphone,
  Monitor,
  Lock,
  RefreshCw,
  Radio,
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';

interface StatsData {
  success: boolean;
  timestamp: number;
  serverTime: string;
  liveVisitors: number;
  liveWatchers: number;
  totalVisitorsToday: number;
  totalPageViewsToday: number;
  devices: {
    iPhone: number;
    Android: number;
    Desktop: number;
    Other: number;
  };
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
    type: string;
    device: string;
  }[];
  uptimeSeconds: number;
}

interface AdminStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminStatsModal: React.FC<AdminStatsModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState(() => localStorage.getItem('bigsuu_admin_pin') || '');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Authenticate and load stats
  const fetchStats = useCallback(async (pinToUse: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/analytics/stats?pin=${encodeURIComponent(pinToUse)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setIsUnlocked(true);
        localStorage.setItem('bigsuu_admin_pin', pinToUse);
      } else {
        setIsUnlocked(false);
        setErrorMsg('Invalid passcode. Please enter the correct admin PIN.');
      }
    } catch {
      setErrorMsg('Unable to connect to server analytics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check stored PIN on modal open
  useEffect(() => {
    if (isOpen && pin) {
      fetchStats(pin);
    }
  }, [isOpen, fetchStats, pin]);

  // Real-time auto-refresh every 5 seconds when unlocked and open
  useEffect(() => {
    if (!isOpen || !isUnlocked || !pin) return;
    const interval = setInterval(() => {
      fetchStats(pin);
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, isUnlocked, pin, fetchStats]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim()) {
      fetchStats(pin.trim());
    }
  };

  const formatTimeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m online`;
    return `${mins}m online`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-xs">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                BigSuuStreams Activity
                {isUnlocked && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
                    LIVE
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 font-medium">Real-time visitor and stream telemetry</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isUnlocked && (
              <button
                onClick={() => fetchStats(pin)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
                title="Refresh Stats"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {!isUnlocked ? (
            /* Passcode Unlock Form */
            <div className="max-w-sm mx-auto py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-700">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Admin Passcode</h3>
                <p className="text-xs text-gray-500 mt-1">Enter your passcode to access real-time visitor stats.</p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-3 pt-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter passcode (default: suu2026)"
                  className="w-full text-center tracking-widest text-base font-bold bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-black focus:bg-white transition-all"
                  autoFocus
                />
                {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}
                <button
                  type="submit"
                  disabled={isLoading || !pin.trim()}
                  className="w-full flex items-center justify-center space-x-2 bg-black hover:bg-neutral-800 text-white font-bold text-sm py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'Checking...' : 'Unlock Analytics'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : stats ? (
            /* Live Dashboard Stats */
            <div className="space-y-6">
              
              {/* Row 1: 4 Top Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Live On Site Now */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Live Now</span>
                    <Radio className="w-4 h-4 animate-pulse text-emerald-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-3xl font-black text-emerald-900 leading-none">
                      {stats.liveVisitors}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-700 mt-1">Active right now</div>
                  </div>
                </div>

                {/* Watching Live Stream */}
                <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-orange-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Watching</span>
                    <Play className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-3xl font-black text-orange-900 leading-none">
                      {stats.liveWatchers}
                    </div>
                    <div className="text-[11px] font-semibold text-orange-700 mt-1">In video player</div>
                  </div>
                </div>

                {/* Total Visitors Today */}
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-blue-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Today</span>
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-3xl font-black text-blue-900 leading-none">
                      {stats.totalVisitorsToday}
                    </div>
                    <div className="text-[11px] font-semibold text-blue-700 mt-1">Unique visitors</div>
                  </div>
                </div>

                {/* Total Page Views */}
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-purple-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Views</span>
                    <Eye className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-3xl font-black text-purple-900 leading-none">
                      {stats.totalPageViewsToday}
                    </div>
                    <div className="text-[11px] font-semibold text-purple-700 mt-1">Page interactions</div>
                  </div>
                </div>
              </div>

              {/* Row 2: Devices Breakdown */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4">
                <div className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Visitor Devices Today</span>
                  <span className="text-gray-400 font-medium text-[11px]">iPhone, Android, Desktop</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white border border-gray-200/70 rounded-xl p-3 text-center">
                    <Smartphone className="w-5 h-5 text-gray-700 mx-auto mb-1" />
                    <div className="text-lg font-black text-gray-900">{stats.devices.iPhone || 0}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">iPhone / iOS</div>
                  </div>
                  <div className="bg-white border border-gray-200/70 rounded-xl p-3 text-center">
                    <Smartphone className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-lg font-black text-gray-900">{stats.devices.Android || 0}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Android</div>
                  </div>
                  <div className="bg-white border border-gray-200/70 rounded-xl p-3 text-center">
                    <Monitor className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-black text-gray-900">{stats.devices.Desktop || 0}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">PC / Mac</div>
                  </div>
                </div>
              </div>

              {/* Row 3: Most Watched Games */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4">
                <div className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
                  Streams Activity Today
                </div>
                {stats.topStreams.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topStreams.map((st, i) => (
                      <div
                        key={st.streamKey}
                        className="bg-white border border-gray-200/70 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-black text-gray-400 w-4">#{i + 1}</span>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{st.name}</div>
                            <div className="text-[11px] text-gray-500 font-medium">
                              {st.totalViewsToday} views today
                            </div>
                          </div>
                        </div>
                        {st.currentWatchers > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5 animate-pulse" />
                            {st.currentWatchers} watching now
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">0 active</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-gray-500">
                    No streams clicked yet today. Once friends start watching games, they will rank here!
                  </div>
                )}
              </div>

              {/* Row 4: Recent Real-Time Activity Feed */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4">
                <div className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Live Activity Log</span>
                  <span className="text-[11px] font-bold text-emerald-700">Auto-updating</span>
                </div>
                {stats.recentActivity.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.recentActivity.map((act) => (
                      <div
                        key={act.id}
                        className="bg-white border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          <span className="font-semibold text-gray-800">{act.text}</span>
                        </div>
                        <span className="text-gray-400 text-[10px] font-medium">
                          {formatTimeAgo(act.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-gray-500">
                    Listening for recent visitor actions...
                  </div>
                )}
              </div>

              {/* Server Telemetry Footer */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-2 border-t border-gray-100 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Protected with Passcode (suu2026)
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Server: {formatUptime(stats.uptimeSeconds)}
                </span>
              </div>

            </div>
          ) : (
            <div className="text-center py-12 text-sm text-gray-500">Loading stats...</div>
          )}
        </div>

      </div>
    </div>
  );
};
