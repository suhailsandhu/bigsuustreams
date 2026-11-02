import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 bg-white mt-16 text-xs text-gray-500 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p>© {new Date().getFullYear()} NBA Streams. Non-commercial basketball research & streaming platform.</p>
      </div>
    </footer>
  );
};
