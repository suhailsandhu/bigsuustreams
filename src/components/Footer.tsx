import React from 'react';
import { Activity } from 'lucide-react';

interface FooterProps {
  onOpenStats?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenStats }) => {
  return (
    <footer className="border-t border-gray-200 bg-white mt-16 text-xs text-gray-500 py-6 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <p>© {new Date().getFullYear()} NBA Streams. Non-commercial basketball streaming platform.</p>
        
        {onOpenStats && (
          <button
            onClick={onOpenStats}
            className="inline-flex items-center space-x-1.5 text-gray-400 hover:text-gray-900 transition-colors px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200/80 cursor-pointer"
            title="View Live Site Visitors & Telemetry"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Site Activity</span>
          </button>
        )}
      </div>
    </footer>
  );
};
