import { getDatabaseUrl, getSql, parseBody } from "../_lib/db.js";
import {
  hashPassword,
  verifyPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
} from "../_lib/auth.js";

// Consolidated admin auth endpoint (Vercel Hobby plan caps a deployment at 12 functions).
//   POST ?action=login  -> login
//   POST ?action=logout -> logout
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const action = String(req.query?.action ?? "");

    if (action === "logout") {
      clearSessionCookie(res);
      res.status(200).json({ ok: true });
      return;
    }

    if (action !== "login") {
      res.status(400).json({ error: "Acao invalida" });
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
      // First-run bootstrap: if no admin account exists yet, the first login creates it
      // with the submitted credentials (replaces the manual seed-admin step).
      const adminCount = await sql`SELECT count(*)::int AS n FROM accounts WHERE role = 'admin'`;
      if (adminCount[0].n === 0) {
        if (password.length < 6) {
          res.status(400).json({ error: "Defina uma senha de admin com pelo menos 6 caracteres" });
          return;
        }
        const passwordHash = await hashPassword(password);
        const inserted = await sql`
          INSERT INTO accounts (role, username, "passwordHash", name, status)
          VALUES ('admin', ${username}, ${passwordHash}, ${username}, 'active')
          RETURNING id
        `;
        setSessionCookie(res, signSession({ accountId: inserted[0].id, role: "admin" }));
        res.status(201).json({ ok: true, created: true });
        return;
      }

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
    console.error("[Admin] Auth error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
