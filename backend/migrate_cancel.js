const { PrismaClient } = require('@prisma/client');

// Use raw SQLite via better-sqlite3 (available as Prisma's dependency)
const path = require('path');
const dbPath = path.join(__dirname, 'prisma', 'dev.db');

// Try using Prisma's bundled better-sqlite3
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  // fallback: find it in node_modules
  Database = require(path.join(__dirname, 'node_modules', 'better-sqlite3'));
}

const db = new Database(dbPath);

const sqls = [
  `ALTER TABLE "User" ADD COLUMN "cancellation_date" DATETIME`,
  `ALTER TABLE "User" ADD COLUMN "access_until" DATETIME`,
  `CREATE TABLE IF NOT EXISTS "CancellationFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "motivo" TEXT NOT NULL,
    "detalhe" TEXT,
    "accepted_discount" BOOLEAN NOT NULL DEFAULT false,
    "accepted_downgrade" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" TEXT NOT NULL,
    CONSTRAINT "CancellationFeedback_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`
];

for (const sql of sqls) {
  try {
    db.exec(sql);
    console.log('OK:', sql.slice(0, 60));
  } catch (e) {
    if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
      console.log('Already exists, skipping:', sql.slice(0, 60));
    } else {
      console.error('Error:', e.message);
    }
  }
}

db.close();
console.log('Migration completed.');
