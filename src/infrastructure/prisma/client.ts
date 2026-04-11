const { PrismaClient } = require("@prisma/client") as {
	PrismaClient: new (options?: {
		log?: Array<"query" | "info" | "warn" | "error">;
	}) => unknown;
};

type PrismaClientType = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClientType | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}
