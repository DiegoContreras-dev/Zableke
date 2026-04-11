import { PrismaClient } from "@prisma/client";

import { databaseConfig } from "@/backend/config/database.config";

type PrismaClientType = PrismaClient;

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClientType | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		...(databaseConfig.url ? { datasourceUrl: databaseConfig.url } : {}),
		log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
	});

let connectPromise: Promise<void> | null = null;

export async function ensurePrismaConnected(): Promise<void> {
	if (!connectPromise) {
		connectPromise = prisma.$connect();
	}

	await connectPromise;
}

export async function disconnectPrisma(): Promise<void> {
	await prisma.$disconnect();
	connectPromise = null;
}

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}
