import Database from 'better-sqlite3';
const db = new Database('dev.db');
const rows = db.prepare("SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','index','trigger','view') ORDER BY type, name").all();
console.log(rows);
db.close();

