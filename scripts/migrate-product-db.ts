import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { getProductSql } from "../src/lib/server/productDb.ts";

await loadLocalEnv();

const sql = getProductSql();
const migrationsDir = join(process.cwd(), "data", "product", "migrations");
const migrationFiles = (await readdir(migrationsDir))
  .filter((filename) => filename.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

for (const filename of migrationFiles) {
  const migration = await readFile(join(migrationsDir, filename), "utf8");
  const statements = splitSqlStatements(migration);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`Applied ${filename}`);
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function loadLocalEnv(): Promise<void> {
  try {
    const raw = await readFile(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT";
}
