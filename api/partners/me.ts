import { getDatabaseUrl, getSql } from "../_lib/db";
import { requireRole } from "../_lib/auth";

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
      const rows = await sql`
        SELECT id, role, username, name, email, phone, instagram, pix,
               "commissionPercent", status, "createdAt"
        FROM accounts
        WHERE id = ${session.accountId} AND role = 'partner'
        LIMIT 1
      `;

      if (rows.length === 0) {
        res.status(404).json({ error: "Conta nao encontrada" });
        return;
      }

      res.status(200).json({ account: rows[0] });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Partner] Me error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
