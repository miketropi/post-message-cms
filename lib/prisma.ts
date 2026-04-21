import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function sqlitePathFromDatabaseUrl(url: string): string {
  if (url.startsWith("file:")) {
    return url.slice("file:".length);
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaBetterSqlite3({
    url: sqlitePathFromDatabaseUrl(databaseUrl),
  });
  return new PrismaClient({ adapter });
}

/**
 * In development, do not reuse `globalThis.prisma`. After `prisma migrate` /
 * `prisma generate`, Turbopack can reload modules while an old client (without
 * new models) stays on `globalThis`, so `prisma.user` becomes undefined.
 * Production keeps a singleton to reuse connections across requests.
 */
export const prisma =
  process.env.NODE_ENV === "production"
    ? (globalForPrisma.prisma ??= createPrismaClient())
    : createPrismaClient();
