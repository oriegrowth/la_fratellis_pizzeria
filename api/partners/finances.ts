import { getDatabaseUrl, getSql } from "../_lib/db.js";
import { requireRole } from "../_lib/auth.js";
import { computeOpenPeriod } from "../_lib/partners.js";

// Consolidated partner finances endpoint (Vercel Hobby plan caps a deployment at 12 functions).
//   GET ?view=sales (default) -> open-period sales report + per-order breakdown
//   GET ?view=payouts         -> payout request history
//   POST                      -> "request withdrawal": closes the open cycle
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
        const view = String(req.query?.view ?? "sales");
        if (view === "payouts") {
          const payouts = await sql`
            SELECT id, "periodStart", "periodEnd", "totalSales", "commissionAmount",
                   status, "paymentNote", "requestedAt", "paidAt"
            FROM "payoutRequests"
            WHERE "accountId" = ${session.accountId}
            ORDER BY "requestedAt" DESC
          `;
          res.status(200).json({ payouts });
          return;
        }

        const period = await computeOpenPeriod(sql, session.accountId);
        if (!period) {
          res.status(404).json({ error: "Conta nao encontrada" });
          return;
        }

        // Per-order breakdown for the open period, so the partner sees which sales make up the total.
        const orders = await sql`
          SELECT o.id, o.name, o."totalPrice", o."couponCode", o.status, o."createdAt"
          FROM orders o
          JOIN coupons c ON c.code = o."couponCode"
          WHERE c."accountId" = ${session.accountId}
            AND o."createdAt" >= ${period.periodStart}
            AND o."createdAt" <= ${period.periodEnd}
          ORDER BY o."createdAt" DESC
        `;

        res.status(200).json({
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          totalSales: period.totalSales,
          ordersCount: period.ordersCount,
          commissionPercent: period.commissionPercent,
          commissionAmount: period.commissionAmount,
          orders,
        });
        return;
      }

      if (req.method === "POST") {
        // Block a second request while one is still pending — its sales are already reserved.
        const pending = await sql`
          SELECT id FROM "payoutRequests"
          WHERE "accountId" = ${session.accountId} AND status = 'pending'
          LIMIT 1
        `;
        if (pending.length > 0) {
          res.status(409).json({ error: "Voce ja tem uma solicitacao de saque pendente." });
          return;
        }

        const period = await computeOpenPeriod(sql, session.accountId);
        if (!period) {
          res.status(404).json({ error: "Conta nao encontrada" });
          return;
        }
        if (period.commissionAmount <= 0) {
          res.status(400).json({ error: "Nao ha comissao acumulada para sacar." });
          return;
        }

        const inserted = await sql`
          INSERT INTO "payoutRequests"
            ("accountId", "periodStart", "periodEnd", "totalSales", "commissionAmount", status)
          VALUES (
            ${session.accountId},
            ${period.periodStart},
            ${period.periodEnd},
            ${period.totalSales.toString()},
            ${period.commissionAmount.toString()},
            'pending'
          )
          RETURNING *
        `;

        res.status(201).json({ payout: inserted[0] });
        return;
      }

      res.status(405).json({ error: "Method not allowed" });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Partner] Finances error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
