import crypto from 'crypto';
import { db } from './db.ts';

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
  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  private mapDbUser(row: any): UserAccount {
    let favoriteTeams: string[] = [];
    try {
      favoriteTeams = JSON.parse(row.favorite_teams || '[]');
    } catch {
      favoriteTeams = [];
    }

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name || row.username,
      passwordHash: row.password_hash || undefined,
      salt: row.salt || undefined,
      provider: (row.provider as 'local' | 'google') || 'local',
      googleId: row.google_id || undefined,
      avatarUrl: row.avatar_url || undefined,
      favoriteTeams,
      spoilerFree: Boolean(row.spoiler_free),
      createdAt: row.created_at,
      lastLogin: row.last_login
    };
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
    const existing = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(cleanUsername, cleanEmail) as any;
    if (existing) {
      if (existing.username === cleanUsername) {
        throw new Error('This username is already taken. Please choose another.');
      }
      if (existing.email === cleanEmail) {
        throw new Error('An account with this email already exists. Please log in.');
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);
    const id = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (
        id, username, email, display_name, password_hash, salt, provider, avatar_url, favorite_teams, spoiler_free, created_at, last_login
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 'local', null, '[]', 0, ?, ?
      )
    `);

    insertStmt.run(id, cleanUsername, cleanEmail, username.trim(), passwordHash, salt, now, now);

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

    const session = this.createSession(user);
    return { user, session };
  }

  public login(identifier: string, password: string): { user: UserAccount; session: SessionData } {
    const clean = identifier.trim().toLowerCase();
    const row = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(clean, clean) as any;

    if (!row || !row.password_hash || !row.salt) {
      throw new Error('Invalid username/email or password');
    }

    const inputHash = this.hashPassword(password, row.salt);
    if (inputHash !== row.password_hash) {
      throw new Error('Invalid username/email or password');
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now, row.id);
    row.last_login = now;

    const user = this.mapDbUser(row);
    const session = this.createSession(user);
    return { user, session };
  }

  public loginWithGoogle(email: string, displayName: string, avatarUrl?: string): { user: UserAccount; session: SessionData } {
    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;
    const now = new Date().toISOString();

    let user: UserAccount;

    if (!existing) {
      const generatedUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 15) || `user${Date.now() % 10000}`;
      const id = `google_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      db.prepare(`
        INSERT INTO users (
          id, username, email, display_name, provider, avatar_url, favorite_teams, spoiler_free, created_at, last_login
        ) VALUES (
          ?, ?, ?, ?, 'google', ?, '[]', 0, ?, ?
        )
      `).run(id, generatedUsername, cleanEmail, displayName || cleanEmail.split('@')[0], avatarUrl || null, now, now);

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
    } else {
      db.prepare('UPDATE users SET last_login = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?').run(now, avatarUrl || null, existing.id);
      existing.last_login = now;
      if (avatarUrl) existing.avatar_url = avatarUrl;
      user = this.mapDbUser(existing);
    }

    const session = this.createSession(user);
    return { user, session };
  }

  public createSession(user: UserAccount): SessionData {
    const token = `sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    db.prepare(`
      INSERT INTO sessions (token, user_id, username, display_name, avatar_url, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(token, user.id, user.username, user.displayName, user.avatarUrl || null, expiresAt);

    return {
      token,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      favoriteTeams: user.favoriteTeams,
      spoilerFree: user.spoilerFree,
      expiresAt
    };
  }

  public verifySession(token: string): SessionData | null {
    if (!token) return null;
    const row = db.prepare(`
      SELECT s.*, u.favorite_teams, u.spoiler_free
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `).get(token) as any;

    if (!row) return null;

    if (Date.now() > row.expires_at) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    let favoriteTeams: string[] = [];
    try {
      favoriteTeams = JSON.parse(row.favorite_teams || '[]');
    } catch {
      favoriteTeams = [];
    }

    return {
      token: row.token,
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url || undefined,
      favoriteTeams,
      spoilerFree: Boolean(row.spoiler_free),
      expiresAt: row.expires_at
    };
  }

  public removeSession(token: string) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  public updatePreferences(userId: string, favoriteTeams?: string[], spoilerFree?: boolean) {
    if (favoriteTeams !== undefined && spoilerFree !== undefined) {
      db.prepare('UPDATE users SET favorite_teams = ?, spoiler_free = ? WHERE id = ?')
        .run(JSON.stringify(favoriteTeams), spoilerFree ? 1 : 0, userId);
    } else if (favoriteTeams !== undefined) {
      db.prepare('UPDATE users SET favorite_teams = ? WHERE id = ?')
        .run(JSON.stringify(favoriteTeams), userId);
    } else if (spoilerFree !== undefined) {
      db.prepare('UPDATE users SET spoiler_free = ? WHERE id = ?')
        .run(spoilerFree ? 1 : 0, userId);
    }
  }

  public recordWatchHistory(userId: string, gameId: string, streamKey: string, gameName: string) {
    try {
      db.prepare(`
        INSERT INTO watch_history (user_id, game_id, stream_key, game_name, watched_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, gameId, streamKey, gameName, new Date().toISOString());
    } catch (e) {
      // Ignore non-fatal watch history errors
    }
  }

  public getWatchHistory(userId: string, limit = 10) {
    return db.prepare('SELECT * FROM watch_history WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit);
  }
}

export const authService = new AuthService();
