import { PrismaClient } from "@prisma/client";

const CAREER_SCHOOL_MAP: Record<string, string> = {
  "Biología Marina": "Facultad de Ciencias del Mar",
  "Derecho": "Facultad de Ciencias Jurídicas",
  "Enfermería": "Facultad de Medicina",
  "Ingeniería Civil en Computación e Informática": "Facultad de Ingeniería y Ciencias Geológicas",
  "Ingeniería Civil Industrial": "Facultad de Ingeniería y Ciencias Geológicas",
  "Ingeniería Comercial": "Facultad de Economía y Administración",
  "Ingeniería en Acuicultura": "Facultad de Ciencias del Mar",
  "Ingeniería en Información y Control de Gestión": "Facultad de Economía y Administración",
  "Ingeniería en Tecnologías de Información": "Facultad de Ingeniería y Ciencias Geológicas",
  "Kinesiología": "Facultad de Medicina",
  "Nutrición y Dietética": "Facultad de Medicina",
  "Pedagogía en Educación Diferencial": "Escuela de Educación",
  "Pedagogía en Filosofía y Religión": "Escuela de Educación",
  "Ingeniería en Prevención de Riesgos y Medio Ambiente": "Facultad de Ingeniería y Ciencias Geológicas",
};

async function seedCareers() {
  const prisma = new PrismaClient();
  try {
    for (const [name, schoolName] of Object.entries(CAREER_SCHOOL_MAP)) {
      await prisma.career.upsert({
        where: { name },
        update: { schoolName },
        create: { name, schoolName },
      });
      console.log(`Upserted career: ${name}`);
    }
    console.log("Seeding complete.");
  } catch (error) {
    console.error("Error seeding careers:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCareers();
