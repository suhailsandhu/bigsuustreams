import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

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
            spoilerFree: Boolean(u.spoilerFree)
          });
        }
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
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
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
      lastLogin: now
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

    if (!foundUser || !foundUser.passwordHash || !foundUser.salt) {
      throw new Error('Invalid username/email or password');
    }

    const inputHash = this.hashPassword(password, foundUser.salt);
    if (inputHash !== foundUser.passwordHash) {
      throw new Error('Invalid username/email or password');
    }

    foundUser.lastLogin = new Date().toISOString();
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
        lastLogin: now
      };
      this.users.set(id, user);
    } else {
      user.lastLogin = now;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      if (displayName) user.displayName = displayName;
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

    const restored: UserAccount = {
      id,
      username: user.username || 'Member',
      email: user.email || `${user.username || 'user'}@bigsuustreams.com`,
      displayName: user.displayName || user.username || 'Member',
      provider: user.provider || 'local',
      createdAt: user.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      favoriteTeams: Array.isArray(user.favoriteTeams) ? user.favoriteTeams : [],
      spoilerFree: Boolean(user.spoilerFree)
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
