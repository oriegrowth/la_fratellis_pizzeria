function getDatabaseUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || "";
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const code = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
    if (!code) {
      res.status(400).json({ error: "code required" });
      return;
    }

    const phoneParam = Array.isArray(req.query?.phone) ? req.query.phone[0] : req.query?.phone;
    const phone = phoneParam ? String(phoneParam) : "";

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(200).json({ valid: false });
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
        SELECT code, "discountPercent", "accountId", "firstPurchaseOnly"
        FROM coupons
        WHERE code = ${String(code).trim().toUpperCase()} AND "isActive" = true
        LIMIT 1
      `;

      if (rows.length === 0) {
        res.status(200).json({ valid: false });
        return;
      }

      // Internal first-purchase coupon (e.g. PRIMEIRACOMPRA): only valid for customers with no
      // existing registration. "cadastro" = a row in the customers table for that phone.
      if (rows[0].firstPurchaseOnly) {
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 10) {
          res.status(200).json({ valid: false, reason: "phone_required" });
          return;
        }
        const existing = await sql`SELECT id FROM customers WHERE phone = ${phone} LIMIT 1`;
        if (existing.length > 0) {
          res.status(200).json({ valid: false, reason: "already_registered" });
          return;
        }
      }

      res.status(200).json({
        valid: true,
        code: rows[0].code,
        discountPercent: Number(rows[0].discountPercent),
        isPartner: rows[0].accountId !== null && rows[0].accountId !== undefined,
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Coupons] Validation failed:", error);
    res.status(200).json({ valid: false });
  }
}
