function getDatabaseUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || "";
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const phone = Array.isArray(req.query?.phone) ? req.query.phone[0] : req.query?.phone;
    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      res.status(400).json({ error: "Phone required" });
      return;
    }

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(404).json({ customer: null });
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
      const rows = await sql`
        SELECT name, address, "addressNumber", "addressReference"
        FROM customers
        WHERE phone = ${String(phone)}
        LIMIT 1
      `;

      if (rows.length === 0) {
        res.status(200).json({ customer: null });
        return;
      }

      res.status(200).json({ customer: rows[0] });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Customers] Lookup failed:", error);
    res.status(200).json({ customer: null });
  }
}
