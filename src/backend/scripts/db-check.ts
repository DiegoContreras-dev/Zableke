import { ensurePrismaConnected, disconnectPrisma, prisma } from "@/infrastructure/prisma/client";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Create .env from .env.example and configure your database connection."
    );
  }

  await ensurePrismaConnected();

  const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`;
  const now = result[0]?.now;

  console.log("Prisma DB connection OK", now ? `at ${now.toISOString?.() ?? now}` : "");
}

main()
  .catch((error) => {
    console.error("Prisma DB connection failed");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
