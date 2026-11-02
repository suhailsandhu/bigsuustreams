import React, { useEffect, useState } from 'react';
import { fetchStandings } from '../services/api.ts';
import type { ConferenceStandings } from '../types/scoreboard.ts';
import { Trophy, AlertCircle, RefreshCw } from 'lucide-react';

export const StandingsView: React.FC = () => {
  const [standings, setStandings] = useState<ConferenceStandings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStandings();
      setStandings(data);
    } catch (err: any) {
      setError('Unable to load NBA standings at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-12 space-y-6">
        <div className="h-64 bg-white rounded-lg border border-gray-200 animate-pulse" />
        <div className="h-64 bg-white rounded-lg border border-gray-200 animate-pulse" />
      </div>
    );
  }

  if (error || standings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center my-6">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-gray-900 mb-1">Standings Unavailable</h3>
        <p className="text-xs text-gray-500 mb-4">{error || 'No standings available.'}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2">
      {standings.map((conf) => (
        <div key={conf.name} className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              {conf.name}
            </h2>
            <span className="text-xs text-gray-500 font-semibold">2026-2027 Season</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-4">Team</th>
                  <th className="py-2.5 px-3 text-right">W</th>
                  <th className="py-2.5 px-3 text-right">L</th>
                  <th className="py-2.5 px-3 text-right">WIN%</th>
                  <th className="py-2.5 px-3 text-right">GB</th>
                  <th className="py-2.5 px-3 text-right hidden sm:table-cell">L10</th>
                  <th className="py-2.5 px-3 text-right hidden sm:table-cell">STRK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
                {conf.teams.map((t, idx) => (
                  <tr key={t.id || t.abbreviation} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 p-0.5 shrink-0">
                          {t.logo ? (
                            <img src={t.logo} alt={t.displayName} className="w-full h-full object-contain" />
                          ) : (
                            <Trophy className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <span className="font-bold text-gray-900">
                          {t.displayName}
                        </span>
                        <span className="text-gray-400 font-semibold text-[11px]">
                          {t.abbreviation}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-gray-900">{t.wins}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-600">{t.losses}</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-700">{t.winPercent}</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-500">{t.gamesBehind}</td>
                    <td className="py-3 px-3 text-right text-gray-500 hidden sm:table-cell">{t.lastTen || '-'}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-700 hidden sm:table-cell">{t.streak || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
