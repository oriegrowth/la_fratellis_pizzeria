import { getDatabaseUrl, getSql, parseBody } from "../../_lib/db";
import { requireRole } from "../../_lib/auth";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "PATCH") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const session = requireRole(req, res, "partner");
    if (!session) return;

    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: "ID do cupom invalido" });
      return;
    }

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(500).json({ error: "DATABASE_URL nao configurada na Vercel" });
      return;
    }

    const sql = await getSql(databaseUrl);
    try {
      const owned = await sql`
        SELECT id FROM coupons WHERE id = ${Number(id)} AND "accountId" = ${session.accountId} LIMIT 1
      `;
      if (owned.length === 0) {
        res.status(403).json({ error: "Cupom nao encontrado ou nao pertence a voce" });
        return;
      }

      const body = parseBody(req.body) as any;

      // Partners may edit the customer discount, the code, and the active flag — never the commission.
      const newCode = body.code !== undefined ? String(body.code).trim().toUpperCase() : null;
      const newDiscount = body.discountPercent !== undefined ? Number(body.discountPercent) : null;
      const newActive = body.isActive !== undefined ? Boolean(body.isActive) : null;

      if (newCode !== null && !newCode) {
        res.status(400).json({ error: "Codigo do cupom e obrigatorio" });
        return;
      }
      if (newDiscount !== null && (newDiscount < 0 || newDiscount > 100)) {
        res.status(400).json({ error: "Desconto deve ser entre 0 e 100" });
        return;
      }

      if (newCode) {
        const clash = await sql`SELECT id FROM coupons WHERE code = ${newCode} AND id <> ${Number(id)} LIMIT 1`;
        if (clash.length > 0) {
          res.status(409).json({ error: "Ja existe um cupom com esse codigo" });
          return;
        }
      }

      const updated = await sql`
        UPDATE coupons SET
          code = COALESCE(${newCode}, code),
          "discountPercent" = COALESCE(${newDiscount !== null ? newDiscount.toString() : null}, "discountPercent"),
          "isActive" = COALESCE(${newActive}, "isActive"),
          "updatedAt" = now()
        WHERE id = ${Number(id)}
        RETURNING *
      `;

      res.status(200).json({ coupon: updated[0] });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Partner] Update coupon error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
