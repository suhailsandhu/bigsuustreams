import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'courtside.db');
const OLD_USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database with WAL mode for high concurrency
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT,
    salt TEXT,
    provider TEXT NOT NULL DEFAULT 'local',
    google_id TEXT,
    avatar_url TEXT,
    favorite_teams TEXT DEFAULT '[]',
    spoiler_free INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    last_login TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    stream_key TEXT NOT NULL,
    game_name TEXT NOT NULL,
    watched_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
`);

// Migrate from legacy data/users.json if database is freshly created and users.json exists
try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0 && fs.existsSync(OLD_USERS_FILE)) {
    const raw = fs.readFileSync(OLD_USERS_FILE, 'utf-8');
    const legacyUsers = JSON.parse(raw);
    if (Array.isArray(legacyUsers) && legacyUsers.length > 0) {
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO users (
          id, username, email, display_name, password_hash, salt, provider, google_id, avatar_url, favorite_teams, spoiler_free, created_at, last_login
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);
      for (const u of legacyUsers) {
        insertStmt.run(
          u.id,
          u.username,
          u.email,
          u.displayName || u.username,
          u.passwordHash || null,
          u.salt || null,
          u.provider || 'local',
          u.googleId || null,
          u.avatarUrl || null,
          JSON.stringify(u.favoriteTeams || []),
          u.spoilerFree ? 1 : 0,
          u.createdAt || new Date().toISOString(),
          u.lastLogin || new Date().toISOString()
        );
      }
      console.log(`[SQLite] Migrated ${legacyUsers.length} legacy users from users.json`);
    }
  }
} catch (err) {
  console.warn('[SQLite] Notice during legacy user migration:', err);
}

export { db };
