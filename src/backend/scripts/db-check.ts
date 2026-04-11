import { ensureDatabaseUrl } from "@/backend/config/database.config";
import { ensurePrismaConnected, disconnectPrisma, prisma } from "@/infrastructure/prisma/client";

async function main(): Promise<void> {
  ensureDatabaseUrl();

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
