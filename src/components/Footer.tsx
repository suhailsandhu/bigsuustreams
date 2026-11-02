import React from 'react';

interface FooterProps {
  onOpenLegal?: (tab?: 'dmca' | 'disclaimer' | 'terms' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  return (
    <footer className="border-t border-gray-100 bg-white/60 mt-6 py-2.5 text-[10px] text-gray-400 select-none text-center">
      <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
        <span className="font-medium">© {new Date().getFullYear()} BSS</span>
        {onOpenLegal && (
          <>
            <span className="text-gray-300">•</span>
            <button
              onClick={() => onOpenLegal('dmca')}
              className="hover:text-gray-800 transition cursor-pointer"
            >
              DMCA
            </button>
            <span className="text-gray-300">•</span>
            <button
              onClick={() => onOpenLegal('disclaimer')}
              className="hover:text-gray-800 transition cursor-pointer"
            >
              Disclaimer
            </button>
            <span className="text-gray-300">•</span>
            <button
              onClick={() => onOpenLegal('terms')}
              className="hover:text-gray-800 transition cursor-pointer"
            >
              Terms
            </button>
            <span className="text-gray-300">•</span>
            <button
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-gray-800 transition cursor-pointer"
            >
              Privacy
            </button>
          </>
        )}
      </div>
    </footer>
  );
};
