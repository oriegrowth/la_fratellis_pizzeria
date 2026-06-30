import { getDatabaseUrl, getSql, parseBody } from "../_lib/db";
import { verifyPassword, signSession, setSessionCookie } from "../_lib/auth";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = parseBody(req.body) as any;
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!username || !password) {
      res.status(400).json({ error: "Usuario e senha sao obrigatorios" });
      return;
    }

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(500).json({ error: "DATABASE_URL nao configurada na Vercel" });
      return;
    }

    const sql = await getSql(databaseUrl);
    try {
      const rows = await sql`
        SELECT id, "passwordHash" FROM accounts
        WHERE username = ${username} AND role = 'admin' AND status = 'active'
        LIMIT 1
      `;

      if (rows.length === 0 || !(await verifyPassword(password, rows[0].passwordHash))) {
        res.status(401).json({ error: "Usuario ou senha invalidos" });
        return;
      }

      setSessionCookie(res, signSession({ accountId: rows[0].id, role: "admin" }));
      res.status(200).json({ ok: true });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Admin] Login error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
