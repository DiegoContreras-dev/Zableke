import { PrismaClient } from "@prisma/client";

async function run() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  });
  
  users.forEach(u => {
    console.log(`User: ${u.email}`);
    u.roles.forEach(ur => {
      console.log(`  Role: ${ur.role.name}`);
      console.log(`  Permissions: ${ur.role.description}`); // We can't see permissions if it's not a column, but maybe they are hardcoded?
    });
  });
  
  await prisma.$disconnect();
}

run().catch(console.error);
