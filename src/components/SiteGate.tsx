import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

interface SiteGateProps {
  onUnlock: () => void;
  onOpenLegal?: (tab?: 'dmca' | 'disclaimer' | 'terms') => void;
}

const isPasscodeValid = (p: string) => {
  const c = p.trim().toLowerCase();
  return c === '7865';
};

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
        // Fallback local check
        if (isPasscodeValid(clean)) {
          localStorage.setItem('bigsuu_site_token', 'verified_7865');
          sessionStorage.setItem('bigsuu_site_token', 'verified_7865');
          onUnlock();
        } else {
          setError(true);
          setErrorMessage('Incorrect passcode. Access denied.');
        }
      }
    } catch {
      // Offline fallback
      if (isPasscodeValid(clean)) {
        localStorage.setItem('bigsuu_site_token', 'verified_7865');
        sessionStorage.setItem('bigsuu_site_token', 'verified_7865');
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
      
      {/* Top Spacer */}
      <div className="w-full pt-4 sm:pt-10" />

      {/* Main Lock Card with Big Official NBA Streams Logo */}
      <div className="w-full max-w-sm flex flex-col items-center">
        
        {/* Prominent Official NBA Streams Logo (Noticeably Bigger) */}
        <div className="mb-6 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="NBA Streams"
            className="h-36 sm:h-48 md:h-52 w-auto object-contain filter drop-shadow-sm transition-transform hover:scale-105"
          />
        </div>

        {/* Clean Form Card */}
        <div className="w-full bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          
          <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight text-center mb-5">
            Enter Passcode
          </h2>

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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="text-center text-xs font-bold text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-black hover:bg-neutral-800 active:scale-98 text-white font-bold text-xs sm:text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              <span>{isVerifying ? 'Verifying...' : 'Enter Site'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>

      {/* Bottom Legal Links */}
      <div className="w-full max-w-md pb-6 text-center">
        <p className="text-[11px] text-gray-400">
          Non-commercial educational sports platform.{' '}
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
