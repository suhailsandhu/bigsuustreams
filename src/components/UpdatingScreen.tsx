import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface UpdatingScreenProps {
  onBackOnline?: () => void;
}

export const UpdatingScreen: React.FC<UpdatingScreenProps> = ({ onBackOnline }) => {
  const [dots, setDots] = useState('');

  // Animated dots for "Checking connection..."
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 600);
    return () => clearInterval(dotInterval);
  }, []);

  // Periodic health check every 2.5 seconds to auto-reload once update is finished
  useEffect(() => {
    let isMounted = true;

    const checkServer = async () => {
      try {
        const res = await fetch('/api/system-status', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.updating === false) {
            if (onBackOnline) {
              onBackOnline();
            } else {
              window.location.reload();
            }
            return;
          }
        }
      } catch {
        // Server still restarting / building
      }

      if (isMounted) {
        // Continue polling
      }
    };

    const interval = setInterval(checkServer, 2500);
    // Initial check after 2 seconds
    const timeout = setTimeout(checkServer, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onBackOnline]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300"
    >
      <div className="flex flex-col items-center max-w-md w-full text-center">
        {/* Brand Logo with subtle breathing pulse */}
        <div className="relative mb-6">
          <img
            src="/app-brand-logo.png"
            alt="BigSuuStreams NBA & NFL"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-3xl shadow-xl border border-gray-100 transition-transform duration-700 animate-pulse"
          />
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Website is updating
        </h1>

        {/* Subtitle in nice, refined letters per user requirement */}
        <p className="text-sm sm:text-base font-semibold text-gray-600 mt-2.5 tracking-normal">
          Website is updating. Check back in two minutes.
        </p>

        {/* Modern clean animated loading pill */}
        <div className="mt-8 flex items-center space-x-2.5 bg-gray-50 border border-gray-200/90 px-4 py-2 rounded-full shadow-2xs">
          <RefreshCw className="w-4 h-4 text-gray-700 animate-spin" />
          <span className="text-xs font-semibold text-gray-700">
            Checking status{dots}
          </span>
        </div>

        {/* Manual Refresh Option */}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 text-xs font-bold text-gray-500 hover:text-black underline underline-offset-4 transition cursor-pointer"
        >
          Tap here to reload now
        </button>
      </div>
    </div>
  );
};
