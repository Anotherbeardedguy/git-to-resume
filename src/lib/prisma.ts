import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function withPgBouncer(url: string | undefined): string | undefined {
  if (!url) return url;
  const isPooler = url.includes(".pooler.supabase.com") || url.includes(":6543/");
  if (!isPooler) return url;
  if (url.includes("pgbouncer=true")) return url;
  return url.includes("?") ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
}

const datasourceUrl = withPgBouncer(process.env.DATABASE_URL);

if (datasourceUrl && datasourceUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = datasourceUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
