import { getDatabaseUrl, getSql, parseBody } from "../_lib/db";
import { requireRole } from "../_lib/auth";

const VALID_STATUSES = ["pending", "active", "disabled"] as const;

export default async function handler(req: any, res: any) {
  try {
    if (!requireRole(req, res, "admin")) return;

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(500).json({ error: "DATABASE_URL nao configurada na Vercel" });
      return;
    }

    const sql = await getSql(databaseUrl);
    try {
      if (req.method === "GET") {
        // Each partner with lifetime sales totals and current pending payout (if any).
        const partners = await sql`
          SELECT
            a.id, a.username, a.name, a.email, a.phone, a.instagram, a.pix,
            a."commissionPercent", a.status, a."createdAt",
            COALESCE(s."totalSales", 0)::numeric AS "totalSales",
            COALESCE(s."ordersCount", 0)::int AS "ordersCount",
            COALESCE(p."pendingPayouts", 0)::int AS "pendingPayouts"
          FROM accounts a
          LEFT JOIN (
            SELECT c."accountId", SUM(o."totalPrice") AS "totalSales", COUNT(o.id) AS "ordersCount"
            FROM coupons c
            JOIN orders o ON o."couponCode" = c.code
            WHERE c."accountId" IS NOT NULL
            GROUP BY c."accountId"
          ) s ON s."accountId" = a.id
          LEFT JOIN (
            SELECT "accountId", COUNT(id) AS "pendingPayouts"
            FROM "payoutRequests" WHERE status = 'pending'
            GROUP BY "accountId"
          ) p ON p."accountId" = a.id
          WHERE a.role = 'partner'
          ORDER BY a."createdAt" DESC
        `;
        res.status(200).json({ partners });
        return;
      }

      if (req.method === "PATCH") {
        const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
        if (!id || isNaN(Number(id))) {
          res.status(400).json({ error: "ID do parceiro invalido" });
          return;
        }

        const body = parseBody(req.body) as any;
        const status = body.status !== undefined ? String(body.status) : null;
        const commissionPercent = body.commissionPercent !== undefined ? Number(body.commissionPercent) : null;

        if (status !== null && !VALID_STATUSES.includes(status as any)) {
          res.status(400).json({ error: "Status invalido" });
          return;
        }
        if (commissionPercent !== null && (commissionPercent < 0 || commissionPercent > 100)) {
          res.status(400).json({ error: "Comissao deve ser entre 0 e 100" });
          return;
        }

        const updated = await sql`
          UPDATE accounts SET
            status = COALESCE(${status}, status),
            "commissionPercent" = COALESCE(${commissionPercent !== null ? commissionPercent.toString() : null}, "commissionPercent"),
            "updatedAt" = now()
          WHERE id = ${Number(id)} AND role = 'partner'
          RETURNING id, username, name, "commissionPercent", status
        `;

        if (updated.length === 0) {
          res.status(404).json({ error: "Parceiro nao encontrado" });
          return;
        }

        res.status(200).json({ partner: updated[0] });
        return;
      }

      res.status(405).json({ error: "Method not allowed" });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Admin] Partners error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
