import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const db = new PrismaClient();
  try {
    const tutor = await db.user.findUnique({
      where: { email: "tutor@alumnos.ucn.cl" },
      select: { email: true, firstName: true, passwordHash: true },
    });
    console.log("Tutor user:", tutor?.email, "| has password hash:", !!tutor?.passwordHash);

    if (!tutor?.passwordHash) {
      // El tutor no tiene contraseña, se la seteamos
      const hash = await bcrypt.hash("tutor123", 10);
      await db.user.update({
        where: { email: "tutor@alumnos.ucn.cl" },
        data: { passwordHash: hash },
      });
      console.log("✅ Password set for tutor: tutor123");
    } else {
      const checks = ["tutor123", "admin123", "password", "123456", "Tutor123!"];
      for (const pwd of checks) {
        const ok = await bcrypt.compare(pwd, tutor.passwordHash);
        if (ok) { console.log(`✅ Tutor password is: ${pwd}`); return; }
      }
      console.log("❌ Unknown password, resetting to: tutor123");
      const hash = await bcrypt.hash("tutor123", 10);
      await db.user.update({
        where: { email: "tutor@alumnos.ucn.cl" },
        data: { passwordHash: hash },
      });
    }
  } finally {
    await db.$disconnect();
  }
}
main().catch(console.error);
