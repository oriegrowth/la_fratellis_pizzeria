export function getDatabaseUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || "";
}

export async function getSql(databaseUrl: string) {
  const postgresModule = await import("postgres");
  const postgres = postgresModule.default;
  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ssl: databaseUrl.includes("sslmode=disable") ? false : "require",
    connect_timeout: 10,
  });
}

export function parseBody(body: unknown) {
  if (typeof body !== "string") return body ?? {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}
