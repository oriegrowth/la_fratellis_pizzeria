import { getDatabaseUrl, getSql } from "../_lib/db";
import { requireRole } from "../_lib/auth";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    if (!requireRole(req, res, "admin")) return;

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(500).json({ error: "DATABASE_URL nao configurada na Vercel" });
      return;
    }

    const sql = await getSql(databaseUrl);

    try {
      const orders = await sql`
        SELECT
          o.id, o."customerId", o.phone, o.name, o.address, o."addressNumber", o."addressReference",
          o.items, o."totalPrice", o."savedContact", o."campaignSource", o."campaignMedium",
          o."campaignName", o."campaignTerm", o."campaignContent", o.gclid, o.fbclid, o."landingPage",
          o.referrer, o.status, o."couponCode", o."createdAt", o."updatedAt",
          a.name AS "partnerName"
        FROM orders o
        LEFT JOIN coupons c ON c.code = o."couponCode"
        LEFT JOIN accounts a ON a.id = c."accountId"
        ORDER BY o."createdAt" DESC
      `;
      res.status(200).json({ orders });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Admin] Failed to list orders:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list orders",
    });
  }
}
