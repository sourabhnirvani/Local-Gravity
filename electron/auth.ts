import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { getDb } from './database';

interface SessionData {
  userId: number;
  token: string;
  username: string;
}

interface SessionStore {
  get(key: 'session'): SessionData | undefined;
  set(key: 'session', value: SessionData): void;
  delete(key: 'session'): void;
}

let storePromise: Promise<SessionStore> | null = null;

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSessionStore() {
  if (!storePromise) {
    const dynamicImport = new Function("specifier", 'return import(specifier);') as (specifier: string) => Promise<{ default: new () => SessionStore }>;
    storePromise = dynamicImport('electron-store').then(({ default: Store }) => new Store());
  }

  return storePromise;
}

export function setupAuthHandlers() {
  ipcMain.handle('auth-register', async (_, payload: { username: string; email: string; password: string }) => {
    try {
      const username = payload.username?.trim();
      const email = payload.email?.trim().toLowerCase();
      const password = payload.password;

      if (!username || !email || !password) {
        throw new Error('All fields are required');
      }
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const db = getDb();
      const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
      if (existing) {
        throw new Error('Username or email already exists');
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, hash);

      const sessionToken = `session_${result.lastInsertRowid}_${Date.now()}`;
      const store = await getSessionStore();
      store.set('session', { userId: Number(result.lastInsertRowid), token: sessionToken, username });

      return { success: true, token: sessionToken, username };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
    }
  });

  ipcMain.handle('auth-login', async (_, payload: { email: string; password: string }) => {
    try {
      const email = payload.email?.trim().toLowerCase();
      const password = payload.password;
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
        | { id: number; username: string; password_hash: string }
        | undefined;

      if (!user) {
        throw new Error('Invalid credentials');
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        throw new Error('Invalid credentials');
      }

      const sessionToken = `session_${user.id}_${Date.now()}`;
      const store = await getSessionStore();
      store.set('session', { userId: user.id, token: sessionToken, username: user.username });

      return { success: true, token: sessionToken, username: user.username };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  });

  ipcMain.handle('auth-logout', async () => {
    const store = await getSessionStore();
    store.delete('session');
    return { success: true };
  });

  ipcMain.handle('auth-check-session', async () => {
    const store = await getSessionStore();
    const session = store.get('session');
    if (session) {
      return { success: true, session };
    }
    return { success: false };
  });
}
