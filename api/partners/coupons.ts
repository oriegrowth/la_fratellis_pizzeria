import { getDatabaseUrl, getSql, parseBody } from "../_lib/db";
import { requireRole } from "../_lib/auth";

export default async function handler(req: any, res: any) {
  try {
    const session = requireRole(req, res, "partner");
    if (!session) return;

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
          WHERE c."accountId" = ${session.accountId}
          GROUP BY c.id
          ORDER BY c."createdAt" DESC
        `;
        res.status(200).json({ coupons });
        return;
      }

      if (req.method === "POST") {
        const accountRows = await sql`
          SELECT status, "commissionPercent", email, phone, instagram, pix
          FROM accounts WHERE id = ${session.accountId} LIMIT 1
        `;
        if (accountRows.length === 0) {
          res.status(404).json({ error: "Conta nao encontrada" });
          return;
        }
        if (accountRows[0].status !== "active") {
          res.status(403).json({ error: "Sua conta ainda nao foi aprovada pelo administrador." });
          return;
        }

        const body = parseBody(req.body) as any;
        const code = String(body.code ?? "").trim().toUpperCase();
        const discountPercent = Number(body.discountPercent ?? 10);

        if (!code) {
          res.status(400).json({ error: "Codigo do cupom e obrigatorio" });
          return;
        }
        if (discountPercent < 0 || discountPercent > 100) {
          res.status(400).json({ error: "Desconto deve ser entre 0 e 100" });
          return;
        }

        const existing = await sql`SELECT id FROM coupons WHERE code = ${code} LIMIT 1`;
        if (existing.length > 0) {
          res.status(409).json({ error: "Ja existe um cupom com esse codigo" });
          return;
        }

        // referralPercent is snapshotted from the partner's admin-set commission; partners cannot edit it.
        const account = accountRows[0];
        const inserted = await sql`
          INSERT INTO coupons (code, "discountPercent", "referralPercent", email, instagram, phone, pix, "isActive", "accountId")
          VALUES (
            ${code},
            ${discountPercent.toString()},
            ${Number(account.commissionPercent).toString()},
            ${account.email ?? null},
            ${account.instagram ?? null},
            ${account.phone ?? null},
            ${account.pix ?? null},
            true,
            ${session.accountId}
          )
          RETURNING *
        `;

        res.status(201).json({ coupon: inserted[0] });
        return;
      }

      res.status(405).json({ error: "Method not allowed" });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Partner] Coupons error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
