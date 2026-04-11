export const databaseConfig = {
  url: process.env.DATABASE_URL?.trim(),
};

export function ensureDatabaseUrl(): string {
  if (!databaseConfig.url) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return databaseConfig.url;
}
