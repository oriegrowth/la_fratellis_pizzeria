let sqlClient: any = null;

async function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured in Vercel");
  }

  if (!sqlClient) {
    const postgresModule = await import("postgres");
    const postgres = postgresModule.default;
    sqlClient = postgres(process.env.DATABASE_URL, {
      max: 1,
      prepare: false,
      ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : "require",
    });
  }

  return sqlClient;
}

function queryValue(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    if (queryValue(req.query?.user) !== "admin" || queryValue(req.query?.password) !== "admin") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const sql = await getSql();
    const orders = await sql`SELECT * FROM orders ORDER BY "createdAt" DESC`;
    res.status(200).json({ orders });
  } catch (error) {
    console.error("[Admin] Failed to list orders:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list orders",
    });
  }
}
