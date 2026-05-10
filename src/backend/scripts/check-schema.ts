import { prisma } from "@/infrastructure/prisma/client";

async function main() {
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name, is_nullable, data_type 
     FROM information_schema.columns 
     WHERE table_name = 'schedules' 
       AND column_name IN ('roomId', 'roomName', 'tutoringSlotId')
     ORDER BY column_name`
  );
  console.log("Schedule columns:", JSON.stringify(cols, null, 2));

  const schedules = await prisma.$queryRawUnsafe(
    `SELECT id, title, "roomId", "roomName" FROM schedules LIMIT 10`
  );
  console.log("\nSchedule rows:", JSON.stringify(schedules, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
