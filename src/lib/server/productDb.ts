import { neon } from "@neondatabase/serverless";

export type ProductSql = ReturnType<typeof neon>;

let cachedSql: ProductSql | null = null;

export function isProductDatabaseConfigured(): boolean {
  return Boolean(optionalEnv("DATABASE_URL"));
}

export function getProductSql(): ProductSql {
  const databaseUrl = optionalEnv("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Faro product persistence.");
  }
  cachedSql ??= neon(databaseUrl);
  return cachedSql;
}

function optionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}
