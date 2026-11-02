import React from 'react';

export type FilterCategory = 'all' | 'live' | 'nba' | 'ncaa' | 'upcoming';

interface LeagueFilterProps {
  activeFilter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
  counts: {
    all: number;
    live: number;
    nba: number;
    ncaa: number;
    upcoming: number;
  };
}

export const LeagueFilter: React.FC<LeagueFilterProps> = ({
  activeFilter,
  onFilterChange,
  counts
}) => {
  const filters: { id: FilterCategory; label: string; count: number; isLiveBadge?: boolean }[] = [
    { id: 'all', label: 'All Games', count: counts.all },
    { id: 'live', label: 'Live Now', count: counts.live, isLiveBadge: true },
    { id: 'nba', label: 'NBA', count: counts.nba },
    { id: 'ncaa', label: 'NCAA Basketball', count: counts.ncaa },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
  ];

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none mb-5">
      {filters.map((f) => {
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              isActive
                ? 'bg-black text-white shadow-xs'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            {f.isLiveBadge && counts.live > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse-live" />
            )}
            <span>{f.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive
                  ? 'bg-neutral-800 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
