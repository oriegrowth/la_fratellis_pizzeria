import { getDatabaseUrl, getSql } from "../_lib/db";
import { requireRole } from "../_lib/auth";
import { computeOpenPeriod } from "../_lib/partners";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const session = requireRole(req, res, "partner");
    if (!session) return;

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(500).json({ error: "DATABASE_URL nao configurada na Vercel" });
      return;
    }

    const sql = await getSql(databaseUrl);
    try {
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
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Partner] Sales error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
