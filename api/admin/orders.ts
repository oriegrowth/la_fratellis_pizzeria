function getDatabaseUrl() {
  // POSTGRES_URL é injetado pela integração Supabase↔Vercel (pooler, ideal para serverless)
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || "";
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const user = Array.isArray(req.query?.user) ? req.query.user[0] : req.query?.user;
    const password = Array.isArray(req.query?.password) ? req.query.password[0] : req.query?.password;

    if (user !== "admin" || password !== "admin") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(500).json({ error: "DATABASE_URL nao configurada na Vercel" });
      return;
    }

    const postgresModule = await import("postgres");
    const postgres = postgresModule.default;
    const sql = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      ssl: databaseUrl.includes("sslmode=disable") ? false : "require",
      connect_timeout: 10,
    });

    try {
      const orders = await sql`SELECT * FROM orders ORDER BY "createdAt" DESC`;
      res.status(200).json({ orders });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Admin] Failed to list orders:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list orders",
    });
  }
}
