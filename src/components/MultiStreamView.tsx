import React, { useState } from 'react';
import type { ScoreboardGame } from '../types/scoreboard.ts';
import type { Stream } from '../types/stream.ts';
import { CourtsidePlayer } from './CourtsidePlayer.tsx';
import { LayoutGrid, Columns2, Volume2, VolumeX, Maximize2, X } from 'lucide-react';

interface MultiStreamViewProps {
  allGames: ScoreboardGame[];
  initialGame?: ScoreboardGame | null;
  onClose: () => void;
  onSelectSingleGame: (game: ScoreboardGame) => void;
}

export const MultiStreamView: React.FC<MultiStreamViewProps> = ({
  allGames,
  initialGame,
  onClose,
  onSelectSingleGame
}) => {
  const [layout, setLayout] = useState<'dual' | 'quad'>('dual');
  
  // Games with available streams or live status
  const streamableGames = allGames.filter(g => g.stream?.available || g.status.isLive || g.youtubeVideoId);
  const activePool = streamableGames.length > 0 ? streamableGames : allGames;

  // Selected game IDs for each slot (slot 0, slot 1, slot 2, slot 3)
  const [slotGameIds, setSlotGameIds] = useState<(string | null)[]>([
    initialGame?.id || activePool[0]?.id || null,
    activePool[1]?.id || activePool[0]?.id || null,
    activePool[2]?.id || activePool[0]?.id || null,
    activePool[3]?.id || activePool[1]?.id || null
  ]);

  // Which slot currently has audio active (0, 1, 2, or 3)
  const [activeAudioSlot, setActiveAudioSlot] = useState<number>(0);

  const slotCount = layout === 'dual' ? 2 : 4;

  const handleSelectGameForSlot = (slotIdx: number, gameId: string) => {
    setSlotGameIds(prev => {
      const next = [...prev];
      next[slotIdx] = gameId;
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col text-white select-none animate-in fade-in duration-200">
      {/* Multi-Stream Command Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 bg-neutral-900/90 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase">
              Courtside Multi-View
            </h2>
          </div>

          {/* Layout Switcher */}
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setLayout('dual')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                layout === 'dual' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dual (2)</span>
            </button>
            <button
              onClick={() => setLayout('quad')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                layout === 'quad' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quad (4)</span>
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 text-xs font-bold text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Multi-View</span>
          </button>
        </div>
      </div>

      {/* Video Slots Grid */}
      <div className={`flex-1 p-2 sm:p-3 gap-2 sm:gap-3 grid ${
        layout === 'dual' 
          ? 'grid-cols-1 md:grid-cols-2' 
          : 'grid-cols-1 sm:grid-cols-2 grid-rows-2'
      } overflow-y-auto`}>
        {Array.from({ length: slotCount }).map((_, slotIdx) => {
          const gameId = slotGameIds[slotIdx];
          const game = allGames.find(g => g.id === gameId) || activePool[slotIdx] || activePool[0];

          if (!game) {
            return (
              <div key={slotIdx} className="bg-neutral-900 rounded-2xl flex items-center justify-center border border-white/10">
                <span className="text-xs text-gray-500">No game available</span>
              </div>
            );
          }

          // Synthesize stream object for CourtsidePlayer
          const stream: Stream = {
            id: game.stream?.streamKey || game.id,
            name: `${game.awayTeam.displayName} at ${game.homeTeam.displayName}`,
            category: 'basketball',
            league: 'NBA',
            stream_key: game.stream?.streamKey || `${game.awayTeam.displayName.toLowerCase()}-vs-${game.homeTeam.displayName.toLowerCase()}`.replace(/\s+/g, '-'),
            match_timestamp: Math.floor(Date.now() / 1000),
            viewers: game.stream?.viewers || 0,
            is_external: false,
            thumbnail_url: '',
            sources: [
              { quality: '1080p', url: `/api/basketball/hls/${game.stream?.streamKey || game.id}/1080p.m3u8` },
              { quality: '720p', url: `/api/basketball/hls/${game.stream?.streamKey || game.id}/720p.m3u8` }
            ],
            live_sources: [],
            team1: { name: game.awayTeam.displayName, logo: game.awayTeam.logo },
            team2: { name: game.homeTeam.displayName, logo: game.homeTeam.logo },
            is_live: game.status.isLive,
            status: game.status.isLive ? 'live' : 'upcoming',
            youtubeVideoId: game.youtubeVideoId
          };

          const isAudioActive = activeAudioSlot === slotIdx;

          return (
            <div
              key={slotIdx}
              className={`relative bg-black rounded-2xl overflow-hidden border flex flex-col justify-between transition-all ${
                isAudioActive ? 'border-red-600 shadow-lg shadow-red-950/40 ring-1 ring-red-600/50' : 'border-neutral-800'
              }`}
            >
              {/* Slot Header Bar */}
              <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-auto bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                {/* Game Selector Dropdown */}
                <select
                  value={game.id}
                  onChange={(e) => handleSelectGameForSlot(slotIdx, e.target.value)}
                  className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer max-w-[200px] truncate"
                >
                  {allGames.map((g) => (
                    <option key={g.id} value={g.id} className="bg-neutral-900 text-white font-medium">
                      {g.status.isLive ? '🔴 ' : ''}{g.awayTeam.abbreviation || g.awayTeam.name} at {g.homeTeam.abbreviation || g.homeTeam.name} {g.status.isLive ? `(${g.awayTeam.score}-${g.homeTeam.score})` : ''}
                    </option>
                  ))}
                </select>

                <div className="flex items-center space-x-1.5">
                  {/* One-Click Audio Toggle */}
                  <button
                    onClick={() => setActiveAudioSlot(slotIdx)}
                    title={isAudioActive ? 'Audio Active' : 'Switch Audio Here'}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isAudioActive
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {isAudioActive ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                    <span>{isAudioActive ? 'AUDIO ON' : 'MUTE'}</span>
                  </button>

                  {/* Maximize to full single game */}
                  <button
                    onClick={() => onSelectSingleGame(game)}
                    title="Open Full Game & Box Score"
                    className="p-1 text-gray-400 hover:text-white bg-white/10 rounded-md transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Player Container */}
              <div className="w-full h-full flex items-center justify-center bg-black">
                <CourtsidePlayer
                  stream={stream}
                  selectedQuality="720p"
                  onQualityChange={() => {}}
                />
              </div>

              {/* Bottom Matchup Bar */}
              <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-[11px] font-bold">
                <div className="flex items-center space-x-2">
                  {game.awayTeam.logo && <img src={game.awayTeam.logo} className="w-4 h-4 object-contain" alt="" />}
                  <span>{game.awayTeam.abbreviation || game.awayTeam.name}</span>
                  <span className="text-gray-400">{game.awayTeam.score}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{game.homeTeam.score}</span>
                  <span>{game.homeTeam.abbreviation || game.homeTeam.name}</span>
                  {game.homeTeam.logo && <img src={game.homeTeam.logo} className="w-4 h-4 object-contain" alt="" />}
                </div>

                <div className="text-[10px] uppercase tracking-wider text-gray-400">
                  {game.status.shortDetail || game.status.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
