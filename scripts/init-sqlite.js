import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join('prisma', 'dev.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Ensure file exists; better-sqlite3 will create if missing
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Create tables if they do not exist
db.exec(`
CREATE TABLE IF NOT EXISTS Driver (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  home_formatted_address TEXT NOT NULL,
  home_place_id TEXT NOT NULL UNIQUE,
  home_lat REAL NOT NULL,
  home_lng REAL NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Student (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pickup_formatted_address TEXT NOT NULL,
  pickup_place_id TEXT NOT NULL UNIQUE,
  pickup_lat REAL NOT NULL,
  pickup_lng REAL NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Route (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  route_pay_one_way_cents INTEGER NOT NULL,
  route_pay_total_cents INTEGER NOT NULL,
  driver_pay_cents INTEGER NOT NULL,
  profit_cents INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Trip (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routeId INTEGER NOT NULL,
  studentId INTEGER NOT NULL,
  pickup_time DATETIME,
  dropoff_time DATETIME,
  assigned_driver_id INTEGER,
  assignment_json TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (routeId) REFERENCES Route(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (studentId) REFERENCES Student(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (assigned_driver_id) REFERENCES Driver(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Upload (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  ocr_json TEXT,
  parsed_json TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

console.log('SQLite database initialized at', dbPath);
db.close();
