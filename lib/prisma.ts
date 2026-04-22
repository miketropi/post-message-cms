import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  if (databaseUrl.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL points to SQLite (file:…). Set a MySQL URL, e.g. mysql://USER:PASSWORD@HOST:3306/DATABASE",
    );
  }
  const adapter = new PrismaMariaDb(databaseUrl);
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
