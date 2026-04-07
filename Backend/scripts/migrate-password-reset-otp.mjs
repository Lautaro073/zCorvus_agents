import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
  throw new Error("Missing TURSO_DATABASE_URL in environment.");
}

const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

const tableSql = `
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
`;

const indexStatements = [
  "CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id ON password_reset_otps(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);",
  "CREATE INDEX IF NOT EXISTS idx_password_reset_otps_used ON password_reset_otps(used);",
];

const requiredColumns = [
  "id",
  "user_id",
  "otp_hash",
  "expires_at",
  "used",
  "created_at",
  "used_at",
];

async function ensureTable() {
  await client.execute("PRAGMA foreign_keys = ON;");
  await client.execute(tableSql);

  for (const sql of indexStatements) {
    await client.execute(sql);
  }
}

async function verifyTable() {
  const table = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: ["password_reset_otps"],
  });

  if (!table.rows.length) {
    throw new Error("Migration failed: password_reset_otps table was not created.");
  }

  const columnsResult = await client.execute("PRAGMA table_info(password_reset_otps);");
  const existingColumns = new Set(columnsResult.rows.map((row) => String(row.name)));

  const missing = requiredColumns.filter((name) => !existingColumns.has(name));
  if (missing.length > 0) {
    throw new Error(`Migration incomplete: missing columns ${missing.join(", ")}.`);
  }
}

async function main() {
  await ensureTable();
  await verifyTable();
  console.log("Migration applied: password_reset_otps is ready in Turso.");
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
