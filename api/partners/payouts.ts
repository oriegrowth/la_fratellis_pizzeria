import { getDatabaseUrl, getSql } from "../_lib/db";
import { requireRole } from "../_lib/auth";
import { computeOpenPeriod } from "../_lib/partners";

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
    console.error("[Partner] Payouts error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
