const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'ghanahealth.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply schema on every boot — all statements are idempotent (CREATE ... IF NOT EXISTS)
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Keep existing installations compatible with the staff role model.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
if (!userColumns.includes('job_role')) db.exec('ALTER TABLE users ADD COLUMN job_role TEXT');
if (!userColumns.includes('department')) db.exec('ALTER TABLE users ADD COLUMN department TEXT');

module.exports = db;
