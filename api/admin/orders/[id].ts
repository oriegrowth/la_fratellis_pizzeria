function getDatabaseUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || "";
}

function parseBody(body: unknown) {
  if (typeof body !== "string") return body ?? {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

const VALID_STATUSES = ["pending", "sent", "completed", "cancelled"] as const;

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "PATCH") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const user = Array.isArray(req.query?.user) ? req.query.user[0] : req.query?.user;
    const password = Array.isArray(req.query?.password) ? req.query.password[0] : req.query?.password;

    if (user !== "admin" || password !== "admin") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    const body = parseBody(req.body) as any;
    const status = String(body.status ?? "");

    if (!VALID_STATUSES.includes(status as any)) {
      res.status(400).json({ error: "Invalid status" });
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
      const updated = await sql`
        UPDATE orders
        SET status = ${status}, "updatedAt" = now()
        WHERE id = ${Number(id)}
        RETURNING id, status
      `;

      if (updated.length === 0) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      res.status(200).json({ order: updated[0] });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Admin] Failed to update order:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update order",
    });
  }
}
