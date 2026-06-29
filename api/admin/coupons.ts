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

async function getSql(databaseUrl: string) {
  const postgresModule = await import("postgres");
  const postgres = postgresModule.default;
  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ssl: databaseUrl.includes("sslmode=disable") ? false : "require",
    connect_timeout: 10,
  });
}

export default async function handler(req: any, res: any) {
  try {
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

    const sql = await getSql(databaseUrl);

    try {
      if (req.method === "GET") {
        const coupons = await sql`
          SELECT
            c.*,
            COUNT(o.id)::int AS uses,
            COALESCE(SUM(o."totalPrice"), 0)::numeric AS revenue
          FROM coupons c
          LEFT JOIN orders o ON o."couponCode" = c.code
          GROUP BY c.id
          ORDER BY c."createdAt" DESC
        `;
        res.status(200).json({ coupons });
        return;
      }

      if (req.method === "POST") {
        const body = parseBody(req.body) as any;
        const code = String(body.code ?? "").trim().toUpperCase();
        const discountPercent = Number(body.discountPercent ?? 10);
        const referralPercent = Number(body.referralPercent ?? 0);

        if (!code) {
          res.status(400).json({ error: "Codigo do cupom e obrigatorio" });
          return;
        }

        if (discountPercent < 0 || discountPercent > 100 || referralPercent < 0 || referralPercent > 100) {
          res.status(400).json({ error: "Percentuais devem ser entre 0 e 100" });
          return;
        }

        const inserted = await sql`
          INSERT INTO coupons (code, "discountPercent", "referralPercent", email, instagram, phone, pix, "isActive")
          VALUES (
            ${code},
            ${discountPercent.toString()},
            ${referralPercent.toString()},
            ${body.email ? String(body.email) : null},
            ${body.instagram ? String(body.instagram) : null},
            ${body.phone ? String(body.phone) : null},
            ${body.pix ? String(body.pix) : null},
            true
          )
          RETURNING *
        `;

        res.status(201).json({ coupon: inserted[0] });
        return;
      }

      if (req.method === "PATCH") {
        const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
        if (!id) {
          res.status(400).json({ error: "ID do cupom e obrigatorio" });
          return;
        }

        const body = parseBody(req.body) as any;
        const isActive = Boolean(body.isActive);

        const updated = await sql`
          UPDATE coupons SET "isActive" = ${isActive}, "updatedAt" = now()
          WHERE id = ${Number(id)}
          RETURNING *
        `;

        res.status(200).json({ coupon: updated[0] });
        return;
      }

      res.status(405).json({ error: "Method not allowed" });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Admin] Coupons error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal error",
    });
  }
}
