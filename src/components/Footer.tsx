import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 bg-white mt-16 text-xs text-gray-500 py-6 select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <p>© {new Date().getFullYear()} NBA Streams. Non-commercial basketball streaming platform.</p>
        <p className="text-[11px] text-gray-400">All NBA team logos and trademarks belong to their respective owners.</p>
      </div>
    </footer>
  );
};
