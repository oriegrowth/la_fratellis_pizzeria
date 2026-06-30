import { getDatabaseUrl, getSql, parseBody } from "../_lib/db.js";
import { requireRole } from "../_lib/auth.js";

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
        const payouts = await sql`
          SELECT
            p.id, p."accountId", p."periodStart", p."periodEnd", p."totalSales",
            p."commissionAmount", p.status, p."paymentNote", p."requestedAt", p."paidAt",
            a.name AS "partnerName", a.username AS "partnerUsername", a.pix AS "partnerPix"
          FROM "payoutRequests" p
          JOIN accounts a ON a.id = p."accountId"
          ORDER BY
            CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END,
            p."requestedAt" DESC
        `;
        res.status(200).json({ payouts });
        return;
      }

      if (req.method === "PATCH") {
        const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
        if (!id || isNaN(Number(id))) {
          res.status(400).json({ error: "ID do saque invalido" });
          return;
        }

        const body = parseBody(req.body) as any;
        const status = String(body.status ?? "");
        if (status !== "paid" && status !== "rejected") {
          res.status(400).json({ error: "Status deve ser 'paid' ou 'rejected'" });
          return;
        }

        const paymentNote = body.paymentNote ? String(body.paymentNote) : null;
        const paidAt = status === "paid" ? new Date() : null;

        const updated = await sql`
          UPDATE "payoutRequests" SET
            status = ${status},
            "paymentNote" = ${paymentNote},
            "paidAt" = ${paidAt},
            "updatedAt" = now()
          WHERE id = ${Number(id)} AND status = 'pending'
          RETURNING *
        `;

        if (updated.length === 0) {
          res.status(404).json({ error: "Saque nao encontrado ou ja processado" });
          return;
        }

        res.status(200).json({ payout: updated[0] });
        return;
      }

      res.status(405).json({ error: "Method not allowed" });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Admin] Payouts error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
