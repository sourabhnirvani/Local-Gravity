import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';

let db: Database.Database;

export function initDatabase() {
    // Store db in userData so it persists across updates
    const dbPath = path.join(app.getPath('userData'), 'localgravity.db');
    db = new Database(dbPath);

    // Create users table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
}

export function getDb() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}
