import { PrismaClient } from "@prisma/client";

async function run() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: { role: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  users.forEach(u => {
    console.log(`${u.email} - Roles: ${u.roles.map(r => r.role.name).join(', ')}`);
  });
  
  await prisma.$disconnect();
}

run().catch(console.error);
