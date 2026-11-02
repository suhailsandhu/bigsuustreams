import React, { useState } from 'react';
import { Lock, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';

interface SiteGateProps {
  onUnlock: () => void;
  onOpenLegal?: (tab?: 'dmca' | 'disclaimer' | 'terms' | 'privacy') => void;
}

const CORRECT_PASSCODE = 'lebronisthegoat';

export const SiteGate: React.FC<SiteGateProps> = ({ onUnlock, onOpenLegal }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim().toLowerCase();

    if (!clean) {
      setError(true);
      setErrorMessage('Please enter the passcode.');
      return;
    }

    setIsVerifying(true);
    setError(false);
    setErrorMessage('');

    try {
      // Validate with server API (includes brute-force rate limiter)
      const res = await fetch('/api/auth/site-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean })
      });

      if (res.ok) {
        localStorage.setItem('bigsuu_site_token', 'verified_lebronisthegoat');
        sessionStorage.setItem('bigsuu_site_token', 'verified_lebronisthegoat');
        onUnlock();
      } else if (res.status === 429) {
        setError(true);
        setErrorMessage('Too many failed attempts. Please wait a few minutes.');
      } else {
        // Fallback local check in case offline
        if (clean === CORRECT_PASSCODE) {
          localStorage.setItem('bigsuu_site_token', 'verified_lebronisthegoat');
          sessionStorage.setItem('bigsuu_site_token', 'verified_lebronisthegoat');
          onUnlock();
        } else {
          setError(true);
          setErrorMessage('Incorrect passcode. Access denied.');
        }
      }
    } catch {
      // Offline fallback
      if (clean === CORRECT_PASSCODE) {
        localStorage.setItem('bigsuu_site_token', 'verified_lebronisthegoat');
        sessionStorage.setItem('bigsuu_site_token', 'verified_lebronisthegoat');
        onUnlock();
      } else {
        setError(true);
        setErrorMessage('Incorrect passcode. Access denied.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-between items-center p-4 sm:p-6 select-none selection:bg-orange-500/20">
      
      {/* Top Header Placeholder */}
      <div className="w-full max-w-md pt-4 sm:pt-8 flex justify-center">
        <div className="flex items-center space-x-2">
          <img
            src="/icon-192.png"
            alt="NBA Streams"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-2xs border border-gray-200"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="text-sm sm:text-base font-black tracking-tight text-gray-900 uppercase">
            NBA Streams
          </span>
        </div>
      </div>

      {/* Center Lock Box */}
      <div className="w-full max-w-sm bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200/80 flex items-center justify-center mx-auto mb-4 text-gray-800 shadow-2xs">
          <Lock className="w-5 h-5" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Private Access
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Enter the authorized access passcode to view live basketball streams and scores.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (error) {
                  setError(false);
                  setErrorMessage('');
                }
              }}
              placeholder="Enter passcode..."
              autoFocus
              className={`w-full bg-gray-50/90 border rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white transition-all ${
                error
                  ? 'border-red-400 ring-2 ring-red-400/20'
                  : 'border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="text-center text-xs font-bold text-red-600 animate-shake">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full bg-black hover:bg-neutral-800 active:scale-98 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
          >
            <span>{isVerifying ? 'Verifying...' : 'Unlock Site'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center space-x-1.5 text-[11px] text-gray-400 font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted Session • Rate-Limit Protected</span>
        </div>
      </div>

      {/* Bottom Legal Links */}
      <div className="w-full max-w-md pb-4 text-center">
        <p className="text-[11px] text-gray-400">
          Non-commercial educational basketball platform.{' '}
          {onOpenLegal && (
            <button
              type="button"
              onClick={() => onOpenLegal('dmca')}
              className="text-gray-500 hover:text-gray-900 underline font-semibold ml-1 cursor-pointer"
            >
              Legal & DMCA
            </button>
          )}
        </p>
      </div>

    </div>
  );
};
