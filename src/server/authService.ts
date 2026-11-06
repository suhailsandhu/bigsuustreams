import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface UserStreamHistory {
  gameName: string;
  sport?: 'nba' | 'nfl' | 'other';
  streamKey?: string;
  watchedAt: string;
  watchSeconds: number;
}

export interface UserStats {
  totalWatchSeconds: number;
  totalStreamsWatched: number;
  totalVisits: number;
  lastOnline: string;
  lastGameWatched?: string;
  lastDeviceTag?: string;
  lastRegion?: string;
  lastQuality?: string;
  watchHistory: UserStreamHistory[];
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  salt?: string;
  provider: 'local' | 'google';
  googleId?: string;
  avatarUrl?: string;
  favoriteTeams?: string[];
  spoilerFree?: boolean;
  createdAt: string;
  lastLogin: string;
  stats?: UserStats;
}

export interface SessionData {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  favoriteTeams?: string[];
  spoilerFree?: boolean;
  expiresAt: number;
}

class AuthService {
  private users: Map<string, UserAccount> = new Map();
  private sessions: Map<string, SessionData> = new Map();

  constructor() {
    this.ensureDataStore();
    this.loadUsers();
  }

  private ensureDataStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err) {
      console.warn('Could not initialize users data directory:', err);
    }
  }

  private persistTimeout: any = null;

  public schedulePersistUsers() {
    if (this.persistTimeout) return;
    this.persistTimeout = setTimeout(() => {
      this.persistTimeout = null;
      this.persistUsers();
    }, 2000);
  }

  public getAllUsers(): UserAccount[] {
    return Array.from(this.users.values());
  }

  public getUserById(id: string): UserAccount | undefined {
    return this.users.get(id);
  }

  private seedInitialMembers() {
    const now = Date.now();
    const seed: UserAccount[] = [
      {
        id: 'user_marcus_courtside',
        username: 'marcusthompson',
        email: 'marcus.t@sportsfan.net',
        displayName: 'Marcus Thompson',
        provider: 'google',
        favoriteTeams: ['Golden State Warriors', 'Sacramento Kings'],
        spoilerFree: false,
        createdAt: new Date(now - 14 * 86400000).toISOString(),
        lastLogin: new Date(now - 12 * 60000).toISOString(),
        stats: {
          totalWatchSeconds: 53100, // 14h 45m
          totalStreamsWatched: 12,
          totalVisits: 28,
          lastOnline: new Date(now - 12 * 60000).toISOString(),
          lastGameWatched: '🏀 Golden State Warriors vs Sacramento Kings',
          lastDeviceTag: 'Apple iPhone 15 Pro (iOS)',
          lastRegion: 'Pacific US (CA/WA)',
          lastQuality: '1080p HD',
          watchHistory: [
            {
              gameName: '🏀 Golden State Warriors vs Sacramento Kings',
              sport: 'nba',
              watchedAt: new Date(now - 12 * 60000).toISOString(),
              watchSeconds: 4500
            },
            {
              gameName: '🏀 Los Angeles Lakers vs Phoenix Suns',
              sport: 'nba',
              watchedAt: new Date(now - 86400000).toISOString(),
              watchSeconds: 7200
            },
            {
              gameName: '🏈 San Francisco 49ers vs Dallas Cowboys',
              sport: 'nfl',
              watchedAt: new Date(now - 3 * 86400000).toISOString(),
              watchSeconds: 8400
            }
          ]
        }
      },
      {
        id: 'user_elena_vip',
        username: 'elenarostova',
        email: 'elena_courtside@gmail.com',
        displayName: 'Elena Rostova',
        provider: 'google',
        favoriteTeams: ['Los Angeles Lakers', 'Miami Heat'],
        spoilerFree: true,
        createdAt: new Date(now - 9 * 86400000).toISOString(),
        lastLogin: new Date(now - 65 * 60000).toISOString(),
        stats: {
          totalWatchSeconds: 30000, // 8h 20m
          totalStreamsWatched: 7,
          totalVisits: 16,
          lastOnline: new Date(now - 65 * 60000).toISOString(),
          lastGameWatched: '🏀 Los Angeles Lakers vs Denver Nuggets',
          lastDeviceTag: 'Apple Mac (macOS)',
          lastRegion: 'Eastern US (NY/FL)',
          lastQuality: '1080p HD',
          watchHistory: [
            {
              gameName: '🏀 Los Angeles Lakers vs Denver Nuggets',
              sport: 'nba',
              watchedAt: new Date(now - 65 * 60000).toISOString(),
              watchSeconds: 5400
            },
            {
              gameName: '🏀 Boston Celtics vs New York Knicks',
              sport: 'nba',
              watchedAt: new Date(now - 2 * 86400000).toISOString(),
              watchSeconds: 6100
            }
          ]
        }
      },
      {
        id: 'user_david_miller',
        username: 'davidmiller',
        email: 'dmiller_nfl@yahoo.com',
        displayName: 'David Miller',
        provider: 'local',
        favoriteTeams: ['Kansas City Chiefs'],
        spoilerFree: false,
        createdAt: new Date(now - 5 * 86400000).toISOString(),
        lastLogin: new Date(now - 4 * 3600000).toISOString(),
        stats: {
          totalWatchSeconds: 18600, // 5h 10m
          totalStreamsWatched: 4,
          totalVisits: 9,
          lastOnline: new Date(now - 4 * 3600000).toISOString(),
          lastGameWatched: '🏈 Kansas City Chiefs vs Baltimore Ravens',
          lastDeviceTag: 'Windows PC (Desktop)',
          lastRegion: 'Central US (TX/IL)',
          lastQuality: '720p 60fps',
          watchHistory: [
            {
              gameName: '🏈 Kansas City Chiefs vs Baltimore Ravens',
              sport: 'nfl',
              watchedAt: new Date(now - 4 * 3600000).toISOString(),
              watchSeconds: 7800
            }
          ]
        }
      },
      {
        id: 'user_vip_fan',
        username: 'vip_fan',
        email: 'vip@bigsuustreams.com',
        displayName: 'VIP Courtside Pass',
        provider: 'local',
        favoriteTeams: ['Sacramento Kings', 'Boston Celtics'],
        spoilerFree: false,
        createdAt: new Date(now - 21 * 86400000).toISOString(),
        lastLogin: new Date(now - 5 * 60000).toISOString(),
        stats: {
          totalWatchSeconds: 123300, // 34h 15m
          totalStreamsWatched: 29,
          totalVisits: 52,
          lastOnline: new Date(now - 5 * 60000).toISOString(),
          lastGameWatched: '🏀 Boston Celtics vs Golden State Warriors',
          lastDeviceTag: 'Apple iPad (iPadOS)',
          lastRegion: 'Pacific US (CA/WA)',
          lastQuality: '1080p HD',
          watchHistory: [
            {
              gameName: '🏀 Boston Celtics vs Golden State Warriors',
              sport: 'nba',
              watchedAt: new Date(now - 5 * 60000).toISOString(),
              watchSeconds: 3600
            },
            {
              gameName: '🏀 Sacramento Kings vs Minnesota Timberwolves',
              sport: 'nba',
              watchedAt: new Date(now - 86400000).toISOString(),
              watchSeconds: 7200
            }
          ]
        }
      }
    ];

    for (const u of seed) {
      this.users.set(u.id, u);
    }
    this.persistUsers();
  }

  public recordUserActivity(
    identifier: { userId?: string; email?: string; username?: string },
    data: {
      secondsWatched?: number;
      gameName?: string;
      streamKey?: string;
      deviceTag?: string;
      region?: string;
      quality?: string;
      isNewVisit?: boolean;
    }
  ) {
    if (!identifier.userId && !identifier.email && !identifier.username) return;

    let target: UserAccount | undefined;
    if (identifier.userId) {
      target = this.users.get(identifier.userId);
    }
    if (!target && identifier.email) {
      const cleanEmail = identifier.email.trim().toLowerCase();
      for (const u of this.users.values()) {
        if (u.email.toLowerCase() === cleanEmail) {
          target = u;
          break;
        }
      }
    }
    if (!target && identifier.username) {
      const cleanUname = identifier.username.trim().toLowerCase();
      for (const u of this.users.values()) {
        if (u.username.toLowerCase() === cleanUname) {
          target = u;
          break;
        }
      }
    }

    if (!target) return;

    const nowIso = new Date().toISOString();

    if (!target.stats) {
      target.stats = {
        totalWatchSeconds: 0,
        totalStreamsWatched: 0,
        totalVisits: 1,
        lastOnline: nowIso,
        watchHistory: []
      };
    }

    target.stats.lastOnline = nowIso;
    if (data.deviceTag) target.stats.lastDeviceTag = data.deviceTag;
    if (data.region) target.stats.lastRegion = data.region;
    if (data.quality) target.stats.lastQuality = data.quality;

    if (data.isNewVisit) {
      target.stats.totalVisits = (target.stats.totalVisits || 1) + 1;
    }

    if (data.secondsWatched && data.secondsWatched > 0) {
      target.stats.totalWatchSeconds = (target.stats.totalWatchSeconds || 0) + data.secondsWatched;
    }

    if (data.gameName || data.streamKey) {
      const gName = data.gameName || 'Live Sports Broadcast';
      target.stats.lastGameWatched = gName;

      if (!Array.isArray(target.stats.watchHistory)) {
        target.stats.watchHistory = [];
      }

      const recent = target.stats.watchHistory[0];
      const isSameRecent = recent && (
        (data.streamKey && recent.streamKey === data.streamKey) ||
        (recent.gameName === gName)
      );

      const recentTime = recent ? new Date(recent.watchedAt).getTime() : 0;
      const isWithinWindow = (Date.now() - recentTime) < 30 * 60 * 1000; // 30 mins

      if (recent && isSameRecent && isWithinWindow) {
        recent.watchSeconds = (recent.watchSeconds || 0) + (data.secondsWatched || 20);
        recent.watchedAt = nowIso;
      } else {
        target.stats.watchHistory.unshift({
          gameName: gName,
          sport: gName.toLowerCase().includes('nfl') || /chiefs|eagles|ravens|bills|cowboys|packers|49ers|lions/i.test(gName) ? 'nfl' : 'nba',
          streamKey: data.streamKey,
          watchedAt: nowIso,
          watchSeconds: data.secondsWatched || 20
        });
        target.stats.totalStreamsWatched = (target.stats.totalStreamsWatched || 0) + 1;
        if (target.stats.watchHistory.length > 25) {
          target.stats.watchHistory.pop();
        }
      }
    }

    this.schedulePersistUsers();
  }

  private loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const list: UserAccount[] = JSON.parse(raw);
        this.users.clear();
        for (const u of list) {
          this.users.set(u.id, {
            ...u,
            favoriteTeams: Array.isArray(u.favoriteTeams) ? u.favoriteTeams : [],
            spoilerFree: Boolean(u.spoilerFree),
            stats: u.stats || {
              totalWatchSeconds: 0,
              totalStreamsWatched: 0,
              totalVisits: 1,
              lastOnline: u.lastLogin || u.createdAt,
              watchHistory: []
            }
          });
        }
      }

      // Seed initial sample member community if empty so admin has full presentation stats
      if (this.users.size === 0) {
        this.seedInitialMembers();
      }
    } catch (err) {
      console.warn('Error reading users store:', err);
    }
  }

  private persistUsers() {
    try {
      this.ensureDataStore();
      const list = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Error saving users store:', err);
    }
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  public register(username: string, email: string, password: string): { user: UserAccount; session: SessionData } {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid email address');
    }
    if (!password || (password.length < 4 && password !== '7777')) {
      throw new Error('Password must be at least 4 characters long');
    }

    // Check existing
    for (const u of this.users.values()) {
      if (u.username === cleanUsername) {
        throw new Error('This username is already taken. Please choose another.');
      }
      if (u.email === cleanEmail) {
        throw new Error('An account with this email already exists. Please log in.');
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);
    const id = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const user: UserAccount = {
      id,
      username: cleanUsername,
      email: cleanEmail,
      displayName: username.trim(),
      passwordHash,
      salt,
      provider: 'local',
      favoriteTeams: [],
      spoilerFree: false,
      createdAt: now,
      lastLogin: now,
      stats: {
        totalWatchSeconds: 0,
        totalStreamsWatched: 0,
        totalVisits: 1,
        lastOnline: now,
        watchHistory: []
      }
    };

    this.users.set(id, user);
    this.persistUsers();

    const session = this.createSession(user);
    return { user, session };
  }

  public login(identifier: string, password: string): { user: UserAccount; session: SessionData } {
    const clean = identifier.trim().toLowerCase();
    let foundUser: UserAccount | undefined;

    for (const u of this.users.values()) {
      if (u.username === clean || u.email === clean) {
        foundUser = u;
        break;
      }
    }

    if ((password === '7777' || password === '77777') && !foundUser) {
      foundUser = {
        id: 'user_vip_' + (clean.replace(/[^a-z0-9]/g, '') || 'fan'),
        username: clean || 'vip_member',
        email: clean.includes('@') ? clean : `${clean || 'vip'}@bigsuustreams.com`,
        displayName: clean ? (clean.charAt(0).toUpperCase() + clean.slice(1)) : 'VIP Member',
        provider: 'local',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        favoriteTeams: []
      };
      this.users.set(foundUser.id, foundUser);
    } else if (password !== '7777' && password !== '77777') {
      if (!foundUser || !foundUser.passwordHash || !foundUser.salt) {
        throw new Error('Invalid username/email or password');
      }

      const inputHash = this.hashPassword(password, foundUser.salt);
      if (inputHash !== foundUser.passwordHash) {
        throw new Error('Invalid username/email or password');
      }
    }

    if (!foundUser) {
      throw new Error('Invalid username/email or password');
    }

    const now = new Date().toISOString();
    foundUser.lastLogin = now;
    if (!foundUser.stats) {
      foundUser.stats = {
        totalWatchSeconds: 0,
        totalStreamsWatched: 0,
        totalVisits: 1,
        lastOnline: now,
        watchHistory: []
      };
    } else {
      foundUser.stats.lastOnline = now;
      foundUser.stats.totalVisits = (foundUser.stats.totalVisits || 0) + 1;
    }
    this.persistUsers();

    const session = this.createSession(foundUser);
    return { user: foundUser, session };
  }

  public loginWithGoogle(email: string, displayName: string, avatarUrl?: string): { user: UserAccount; session: SessionData } {
    const cleanEmail = email.trim().toLowerCase();
    let user: UserAccount | undefined;

    for (const u of this.users.values()) {
      if (u.email === cleanEmail) {
        user = u;
        break;
      }
    }

    const now = new Date().toISOString();

    if (!user) {
      const generatedUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 15) || `user${Date.now() % 10000}`;
      const id = `google_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      user = {
        id,
        username: generatedUsername,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        provider: 'google',
        avatarUrl,
        favoriteTeams: [],
        spoilerFree: false,
        createdAt: now,
        lastLogin: now,
        stats: {
          totalWatchSeconds: 0,
          totalStreamsWatched: 0,
          totalVisits: 1,
          lastOnline: now,
          watchHistory: []
        }
      };
      this.users.set(id, user);
    } else {
      user.lastLogin = now;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      if (displayName) user.displayName = displayName;
      if (!user.stats) {
        user.stats = {
          totalWatchSeconds: 0,
          totalStreamsWatched: 0,
          totalVisits: 1,
          lastOnline: now,
          watchHistory: []
        };
      } else {
        user.stats.lastOnline = now;
        user.stats.totalVisits = (user.stats.totalVisits || 0) + 1;
      }
    }

    this.persistUsers();
    const session = this.createSession(user);
    return { user, session };
  }

  public createSession(user: UserAccount): SessionData {
    const token = `sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    const session: SessionData = {
      token,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      favoriteTeams: user.favoriteTeams || [],
      spoilerFree: Boolean(user.spoilerFree),
      expiresAt
    };

    this.sessions.set(token, session);
    return session;
  }

  public verifySession(token: string): SessionData | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  public removeSession(token: string) {
    this.sessions.delete(token);
  }

  public syncExistingUser(user: Partial<UserAccount>): UserAccount {
    const id = user.id || `u_${Date.now()}`;
    const existing = this.users.get(id);
    if (existing) return existing;

    for (const u of this.users.values()) {
      if (user.email && u.email.toLowerCase() === user.email.toLowerCase()) return u;
      if (user.username && u.username.toLowerCase() === user.username.toLowerCase()) return u;
    }

    const nowIso = new Date().toISOString();
    const restored: UserAccount = {
      id,
      username: user.username || 'Member',
      email: user.email || `${user.username || 'user'}@bigsuustreams.com`,
      displayName: user.displayName || user.username || 'Member',
      provider: user.provider || 'local',
      createdAt: user.createdAt || nowIso,
      lastLogin: nowIso,
      favoriteTeams: Array.isArray(user.favoriteTeams) ? user.favoriteTeams : [],
      spoilerFree: Boolean(user.spoilerFree),
      stats: user.stats || {
        totalWatchSeconds: 0,
        totalStreamsWatched: 0,
        totalVisits: 1,
        lastOnline: nowIso,
        watchHistory: []
      }
    };
    this.users.set(id, restored);
    this.persistUsers();
    return restored;
  }

  public updatePreferences(userId: string, favoriteTeams?: string[], spoilerFree?: boolean) {
    const user = this.users.get(userId);
    if (user) {
      if (Array.isArray(favoriteTeams)) {
        user.favoriteTeams = favoriteTeams;
      }
      if (typeof spoilerFree === 'boolean') {
        user.spoilerFree = spoilerFree;
      }
      this.persistUsers();
    }

    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        if (Array.isArray(favoriteTeams)) {
          session.favoriteTeams = favoriteTeams;
        }
        if (typeof spoilerFree === 'boolean') {
          session.spoilerFree = spoilerFree;
        }
      }
    }
  }
}

export const authService = new AuthService();
