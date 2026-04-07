const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new () => any;
};

const prisma = new PrismaClient();

async function main() {
  const [adminRole, tutorRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: {
        name: "ADMIN",
        description: "Coordinador o jefatura con control total del sistema",
      },
    }),
    prisma.role.upsert({
      where: { name: "TUTOR" },
      update: {},
      create: {
        name: "TUTOR",
        description: "Tutor con gestión de su propio calendario",
      },
    }),
  ]);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@ucn.cl" },
    update: {
      firstName: "Admin",
      lastName: "UCN",
      isActive: true,
    },
    create: {
      email: "admin@ucn.cl",
      firstName: "Admin",
      lastName: "UCN",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "tutor@alumnos.ucn.cl" },
    update: {
      firstName: "Tutor",
      lastName: "Demo",
      isActive: true,
    },
    create: {
      email: "tutor@alumnos.ucn.cl",
      firstName: "Tutor",
      lastName: "Demo",
      isActive: true,
      roles: {
        create: [{ roleId: tutorRole.id }],
      },
      tutorProfile: {
        create: {
          department: "General",
        },
      },
    },
  });

  console.log("Seed ejecutado correctamente: roles y usuarios base creados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

