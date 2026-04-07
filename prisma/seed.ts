// Prisma Seed — Datos iniciales para desarrollo
// Ejecutar con: npx prisma db seed

// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

async function main() {
  // TODO: Insertar roles por defecto (Admin, Tutor)
  // TODO: Insertar usuario admin inicial
  console.log("Seed ejecutado correctamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
