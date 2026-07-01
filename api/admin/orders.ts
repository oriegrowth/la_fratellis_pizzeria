import { getDatabaseUrl, getSql, parseBody } from "../_lib/db.js";
import { requireRole } from "../_lib/auth.js";

const VALID_STATUSES = ["pending", "sent", "completed", "cancelled"] as const;

// GET           -> list all orders (with partner name attribution)
// PATCH ?id=<n> -> update order status (folded in from orders/[id].ts to stay under Vercel's function limit)
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET" && req.method !== "PATCH") {
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
      if (req.method === "PATCH") {
        const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
        if (!id || isNaN(Number(id))) {
          res.status(400).json({ error: "Invalid order id" });
          return;
        }

        const body = parseBody(req.body) as any;
        const status = String(body.status ?? "");
        if (!VALID_STATUSES.includes(status as any)) {
          res.status(400).json({ error: "Invalid status" });
          return;
        }

        const updated = await sql`
          UPDATE orders
          SET status = ${status}, "updatedAt" = now()
          WHERE id = ${Number(id)}
          RETURNING id, status
        `;

        if (updated.length === 0) {
          res.status(404).json({ error: "Order not found" });
          return;
        }

        res.status(200).json({ order: updated[0] });
        return;
      }

      const orders = await sql`
        SELECT
          o.id, o."customerId", o.phone, o.name, o.address, o."addressNumber", o."addressReference",
          o.items, o."totalPrice", o."savedContact", o."campaignSource", o."campaignMedium",
          o."campaignName", o."campaignTerm", o."campaignContent", o.gclid, o.fbclid, o."landingPage",
          o.referrer, o.status, o."couponCode", o."partnerRef", o."createdAt", o."updatedAt",
          a.name AS "partnerName",
          pr.name AS "partnerRefName"
        FROM orders o
        LEFT JOIN coupons c ON c.code = o."couponCode"
        LEFT JOIN accounts a ON a.id = c."accountId"
        LEFT JOIN accounts pr ON pr.username = o."partnerRef" AND pr.role = 'partner'
        ORDER BY o."createdAt" DESC
      `;
      res.status(200).json({ orders });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Admin] Orders error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to handle orders",
    });
  }
}
