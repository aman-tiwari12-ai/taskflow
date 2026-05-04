const { createClient } = require('@libsql/client');
const path = require('path');

const dbDir = process.env.DB_DIR || __dirname;
const dbPath = path.join(dbDir, 'taskflow.db');
const client = createClient({ url: `file:${dbPath}` });

const init = async () => {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')), created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')), created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS project_members (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')), joined_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(project_id, user_id))`,
    `CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL, created_by INTEGER NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','review','done')), priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')), due_date TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`
  ];
  for (const sql of stmts) await client.execute(sql);
};

const all = async (sql, args = []) => {
  const res = await client.execute({ sql, args });
  return res.rows.map(r => ({ ...r }));
};
const get = async (sql, args = []) => { const rows = await all(sql, args); return rows[0] || null; };
const run = async (sql, args = []) => { const res = await client.execute({ sql, args }); return { lastInsertRowid: Number(res.lastInsertRowid), rowsAffected: res.rowsAffected }; };

module.exports = { init, all, get, run };
