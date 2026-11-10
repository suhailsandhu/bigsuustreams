import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { ALL_TEAMS } from '../data/nbaTeams';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: any) => void;
  currentSport?: 'nba' | 'nfl';
  onOpenLegal?: (tab?: 'dmca' | 'disclaimer' | 'terms' | 'privacy') => void;
  initialPasscodeMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onSuccess,
  onOpenLegal,
  initialPasscodeMode = false
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Quick Passcode State (Passcode: 7865 - Accessible only via /quickaccess)
  const [showPasscodeMode, setShowPasscodeMode] = useState(() => Boolean(initialPasscodeMode));
  const [quickPasscode, setQuickPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPasscodeMode) {
      setShowPasscodeMode(true);
    }
  }, [initialPasscodeMode]);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [favoriteTeamId, setFavoriteTeamId] = useState(() => localStorage.getItem('bss_favorite_team') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Verification helper: sandhu.suhail@gmail.com is the ONLY authorized VIP account
  const isSuhailUser = (uName?: string, uEmail?: string) => {
    const cleanU = (uName || '').trim().toLowerCase();
    const cleanE = (uEmail || '').trim().toLowerCase();
    return cleanU === 'sandhu.suhail@gmail.com' || cleanU === 'suhailsandhu' || cleanE === 'sandhu.suhail@gmail.com';
  };

  const suhailVipUser = {
    id: 'user_suhail_vip',
    username: 'sandhu.suhail@gmail.com',
    displayName: 'Suhail Sandhu',
    email: 'sandhu.suhail@gmail.com',
    role: 'vip',
    isVip: true,
    membership: 'vip'
  };

  const handleQuickPasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickPasscode.trim().toLowerCase();
    if (!clean) {
      setPasscodeError('Please enter the passcode.');
      return;
    }

    setLoading(true);
    setPasscodeError(null);

    // Quick Login: Grants standard viewer access (VIP removed per owner instruction)
    if (clean === '7865') {
      const guestUser = {
        id: `guest_${Date.now()}`,
        username: 'guest_viewer',
        displayName: 'Guest Viewer',
        email: 'guest@bigsuustreams.com',
        role: 'member',
        isVip: false,
        membership: 'basic'
      };
      localStorage.setItem('bigsuu_auth_token', 'token_guest_' + Date.now());
      localStorage.setItem('bigsuu_auth_user', JSON.stringify(guestUser));
      sessionStorage.setItem('bigsuu_auth_token', 'token_guest_' + Date.now());
      setLoading(false);
      onSuccess(guestUser);
      return;
    }

    try {
      const res = await fetch('/api/auth/site-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean })
      });

      if (res.ok) {
        const data = await res.json();
        const user = data.user || {
          id: `guest_${Date.now()}`,
          username: 'guest_viewer',
          displayName: 'Guest Viewer',
          email: 'guest@bigsuustreams.com',
          role: 'member',
          isVip: false,
          membership: 'basic'
        };
        // Enforce: No VIP through quick login
        user.isVip = false;
        user.role = 'member';
        user.membership = 'basic';
        localStorage.setItem('bigsuu_auth_token', data.token || 'token_guest');
        localStorage.setItem('bigsuu_auth_user', JSON.stringify(user));
        sessionStorage.setItem('bigsuu_auth_token', data.token || 'token_guest');
        onSuccess(user);
      } else {
        setPasscodeError('Incorrect passcode. Access denied.');
      }
    } catch {
      setPasscodeError('Incorrect passcode. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isSuhail = isSuhailUser(username, email);

    if (mode === 'register') {
      if (!username.trim() || username.trim().length < 3) {
        setError('Username must be at least 3 characters');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }
      if (!password || (password.length < 4 && password !== '7865')) {
        setError('Password must be at least 4 characters');
        return;
      }
    } else {
      if (!username.trim()) {
        setError('Please enter your username or email');
        return;
      }
      if (!password) {
        setError('Please enter your password');
        return;
      }

      // If Suhail logs in with 7865 passcode, grant exclusive VIP account
      if (password === '7865' && isSuhail) {
        localStorage.setItem('bigsuu_auth_token', 'token_suhail_vip');
        localStorage.setItem('bigsuu_auth_user', JSON.stringify(suhailVipUser));
        sessionStorage.setItem('bigsuu_auth_token', 'token_suhail_vip');
        onSuccess(suhailVipUser);
        return;
      }

      // Fast-path login for other members with 7865 password -> Standard Member (NOT VIP)
      if (password === '7865') {
        const standardMember = {
          id: 'user_' + (username.trim().replace(/[^a-z0-9]/gi, '') || 'member'),
          username: username.trim() || 'member',
          displayName: username.trim() || 'Member',
          email: username.includes('@') ? username.trim() : `${username.trim()}@bigsuustreams.com`,
          role: 'member',
          isVip: false,
          membership: 'basic'
        };
        localStorage.setItem('bigsuu_auth_token', 'token_' + Date.now());
        localStorage.setItem('bigsuu_auth_user', JSON.stringify(standardMember));
        sessionStorage.setItem('bigsuu_auth_token', 'token_' + Date.now());
        onSuccess(standardMember);
        return;
      }
    }

    setLoading(true);

    try {
      if (favoriteTeamId) {
        localStorage.setItem('bss_favorite_team', favoriteTeamId);
        window.dispatchEvent(new Event('storage'));
      }

      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register' 
        ? { username: username.trim(), email: email.trim(), password }
        : { identifier: username.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok && data.token) {
        const user = data.user;
        if (isSuhailUser(user.username, user.email)) {
          user.role = 'vip';
          user.isVip = true;
          user.membership = 'vip';
          user.displayName = 'Suhail Sandhu';
        } else {
          user.role = 'member';
          user.isVip = false;
          user.membership = 'basic';
        }
        localStorage.setItem('bigsuu_auth_token', data.token);
        localStorage.setItem('bigsuu_auth_user', JSON.stringify(user));
        sessionStorage.setItem('bigsuu_auth_token', data.token);
        onSuccess(user);
      } else {
        // Fallback for 7865 password
        if (password === '7865') {
          const user = isSuhail ? suhailVipUser : {
            id: 'user_' + (username.trim().replace(/[^a-z0-9]/gi, '') || 'member'),
            username: username.trim() || 'member',
            displayName: username.trim() || 'Member',
            email: email.trim() || (username.includes('@') ? username.trim() : 'member@bigsuustreams.com'),
            role: 'member',
            isVip: false,
            membership: 'basic'
          };
          localStorage.setItem('bigsuu_auth_token', 'token_' + Date.now());
          localStorage.setItem('bigsuu_auth_user', JSON.stringify(user));
          sessionStorage.setItem('bigsuu_auth_token', 'token_' + Date.now());
          onSuccess(user);
        } else {
          setError(data.error || 'Authentication failed. Please check your credentials.');
        }
      }
    } catch {
      const user = isSuhail ? suhailVipUser : {
        id: `local_${Date.now()}`,
        username: username.trim() || 'member',
        displayName: username.trim() || 'Member',
        email: email.trim() || (username.includes('@') ? username.trim() : 'member@bigsuustreams.com'),
        role: 'member',
        isVip: false,
        membership: 'basic'
      };
      localStorage.setItem('bigsuu_auth_token', 'local_token_' + Date.now());
      localStorage.setItem('bigsuu_auth_user', JSON.stringify(user));
      onSuccess(user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md select-none animate-in fade-in duration-200">
      
      {/* iOS-Style Modal Card / Bottom Sheet */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[94vh] transition-all">
        
        {/* Top Header Handle (Key icon removed - accessible only via /quickaccess) */}
        <div className="flex items-center justify-center px-6 pt-4 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full sm:hidden" />
        </div>

        <div className="p-6 sm:p-8 pt-3 overflow-y-auto">
          
          {/* Top Logo Presentation (NBA + NFL Dual Brand from Home Screen Icon) */}
          <div className="flex flex-col items-center justify-center mb-5">
            <img
              src="/app-brand-logo.png"
              alt="NBA & NFL"
              className="h-16 sm:h-20 w-auto object-contain rounded-2xl filter drop-shadow-md mb-2 transition transform hover:scale-105"
            />
            {showPasscodeMode ? (
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight text-center">
                Quick Access
              </h2>
            ) : mode === 'register' ? (
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight text-center">
                Create an Account
              </h2>
            ) : null}
            <p className="text-xs text-gray-400 font-medium text-center mt-1 max-w-xs">
              {showPasscodeMode
                ? 'Enter authorized access passcode.'
                : mode === 'login'
                ? 'Sign in to access live NBA and NFL streams.'
                : 'Join BSS for unlimited free sports streaming.'}
            </p>
          </div>

          {/* ========================================================= */}
          {/* QUICK PASSCODE MODE (Passcode: 7865)                      */}
          {/* ========================================================= */}
          {showPasscodeMode ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150 py-2">
              <form onSubmit={handleQuickPasscodeSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 text-center">
                    Enter Passcode
                  </label>
                  <input
                    type="password"
                    value={quickPasscode}
                    onChange={(e) => {
                      setQuickPasscode(e.target.value);
                      setPasscodeError(null);
                    }}
                    placeholder="••••"
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xl font-black tracking-widest text-gray-900 focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 transition"
                  />
                </div>

                {passcodeError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 text-center animate-shake">
                    {passcodeError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-800 text-white font-extrabold text-sm shadow-md transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <span>Enter Site</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPasscodeMode(false)}
                  className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-900 py-1.5 cursor-pointer"
                >
                  ← Or Sign In / Create Account
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Segmented iOS Tab Switcher */}
              <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-2xl mb-4 border border-gray-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    {mode === 'login' ? 'Username or Email' : 'Choose Username'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={mode === 'login' ? 'Username or email address' : 'Unique username'}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 transition"
                      required
                    />
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 transition"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter password'}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Favorite Sports Team (Optional)
                    </label>
                    <select
                      value={favoriteTeamId}
                      onChange={(e) => setFavoriteTeamId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 transition cursor-pointer"
                    >
                      <option value="">Choose favorite team (optional)...</option>
                      <optgroup label="🏀 NBA Basketball">
                        {ALL_TEAMS.filter(t => t.league === 'NBA').map(team => (
                          <option key={team.id} value={team.id}>
                            {team.displayName}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🏈 NFL Football">
                        {ALL_TEAMS.filter(t => t.league === 'NFL').map(team => (
                          <option key={team.id} value={team.id}>
                            {team.displayName}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 text-center animate-shake">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-800 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign In to Site' : 'Create My Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Trust and Legal Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center space-x-1.5 text-[11px] text-gray-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted Session</span>
            </div>

            {onOpenLegal && (
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-gray-400 font-semibold px-2">
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="hover:underline hover:text-gray-600 cursor-pointer"
                >
                  Terms of Service
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:underline hover:text-gray-600 cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onOpenLegal('dmca')}
                  className="hover:underline hover:text-gray-600 cursor-pointer"
                >
                  DMCA Policy
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onOpenLegal('disclaimer')}
                  className="hover:underline hover:text-gray-600 cursor-pointer"
                >
                  Disclaimer
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
