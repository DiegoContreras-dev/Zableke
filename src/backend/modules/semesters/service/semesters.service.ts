import { AuthError } from "@/backend/common/errors/auth.error";
import { getCurrentSemester } from "@/backend/modules/offerings/dto/offering.dto";
import { prisma } from "@/infrastructure/prisma/client";

const CODE_RE = /^\d{4}-[12]$/;

function defaults(code: string) {
  const [yearText, periodText] = code.split("-");
  const year = Number(yearText);
  const second = periodText === "2";
  return {
    startDate: new Date(Date.UTC(year, second ? 7 : 2, 1)),
    endDate: new Date(Date.UTC(year, second ? 11 : 6, 31, 23, 59, 59)),
    months: second ? [8, 9, 10, 11, 12] : [3, 4, 5, 6, 7],
  };
}

function view(record: {
  code: string;
  startDate: Date;
  endDate: Date;
  status: string;
  months: number[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...record,
    startDate: record.startDate.toISOString(),
    endDate: record.endDate.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class SemestersService {
  async ensureInitialSemester() {
    const count = await prisma.academicSemester.count();
    if (count > 0) return;
    const code = getCurrentSemester();
    await prisma.academicSemester.create({
      data: { code, status: "ACTIVE", ...defaults(code) },
    });
  }

  async list() {
    await this.ensureInitialSemester();
    const semesters = await prisma.academicSemester.findMany({
      orderBy: { code: "desc" },
    });
    return semesters.map(view);
  }

  async active() {
    await this.ensureInitialSemester();
    const semester = await prisma.academicSemester.findFirst({
      where: { status: "ACTIVE" },
    });
    if (!semester) {
      throw new AuthError("No hay un semestre activo configurado", "INVALID_STATE", 409);
    }
    return view(semester);
  }

  async activeCode() {
    return (await this.active()).code;
  }

  async assertWritable(code: string) {
    const semester = await prisma.academicSemester.findUnique({ where: { code } });
    if (!semester) throw new AuthError("Semestre no encontrado", "RESOURCE_NOT_FOUND", 404);
    if (semester.status === "CLOSED") {
      throw new AuthError("El semestre está cerrado y es de solo lectura", "INVALID_STATE", 409);
    }
    return semester;
  }

  async create(raw: {
    code?: string;
    startDate?: string;
    endDate?: string;
    months?: number[];
  }) {
    const code = raw.code?.trim() ?? "";
    if (!CODE_RE.test(code)) {
      throw new AuthError("El semestre debe usar el formato YYYY-1 o YYYY-2", "INVALID_INPUT", 400);
    }
    const fallback = defaults(code);
    const startDate = raw.startDate ? new Date(`${raw.startDate}T00:00:00Z`) : fallback.startDate;
    const endDate = raw.endDate ? new Date(`${raw.endDate}T23:59:59Z`) : fallback.endDate;
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate >= endDate) {
      throw new AuthError("Las fechas del semestre no son válidas", "INVALID_INPUT", 400);
    }
    const months = [...new Set(raw.months ?? fallback.months)]
      .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
      .sort((a, b) => a - b);
    if (months.length === 0) throw new AuthError("Selecciona al menos un mes", "INVALID_INPUT", 400);

    try {
      return view(await prisma.academicSemester.create({
        data: { code, startDate, endDate, months, status: "PLANNING" },
      }));
    } catch {
      throw new AuthError("El semestre ya existe", "INVALID_INPUT", 409);
    }
  }

  async activate(code: string) {
    const target = await prisma.academicSemester.findUnique({ where: { code } });
    if (!target) throw new AuthError("Semestre no encontrado", "RESOURCE_NOT_FOUND", 404);
    await prisma.$transaction([
      prisma.academicSemester.updateMany({
        where: { status: "ACTIVE", code: { not: code } },
        data: { status: "CLOSED" },
      }),
      prisma.academicSemester.update({
        where: { code },
        data: { status: "ACTIVE" },
      }),
    ]);
    return view((await prisma.academicSemester.findUnique({ where: { code } }))!);
  }
}
