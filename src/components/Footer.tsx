import React from 'react';

interface FooterProps {
  onOpenLegal?: (tab?: 'dmca' | 'disclaimer' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  return (
    <footer className="border-t border-gray-200 bg-white mt-16 text-xs text-gray-500 py-6 select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <p>© {new Date().getFullYear()} BigSuuStreams. Independent non-commercial sports portal.</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            All team marks, logos, and trademarks belong to their respective owners.
          </p>
        </div>

        {onOpenLegal && (
          <div className="flex items-center space-x-3 text-[11px] font-semibold text-gray-400">
            <button
              onClick={() => onOpenLegal('dmca')}
              className="hover:text-gray-900 transition-colors cursor-pointer"
            >
              DMCA Policy
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenLegal('disclaimer')}
              className="hover:text-gray-900 transition-colors cursor-pointer"
            >
              Disclaimer
            </button>
            <span>•</span>
            <button
              onClick={() => onOpenLegal('terms')}
              className="hover:text-gray-900 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        )}
      </div>
    </footer>
  );
};
