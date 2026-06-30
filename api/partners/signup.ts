import { getDatabaseUrl, getSql, parseBody } from "../_lib/db";
import { hashPassword, signSession, setSessionCookie } from "../_lib/auth";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = parseBody(req.body) as any;
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();

    if (!username || username.length < 3) {
      res.status(400).json({ error: "Usuario deve ter pelo menos 3 caracteres" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }
    if (!name) {
      res.status(400).json({ error: "Nome e obrigatorio" });
      return;
    }

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(500).json({ error: "DATABASE_URL nao configurada na Vercel" });
      return;
    }

    const sql = await getSql(databaseUrl);
    try {
      const existing = await sql`SELECT id FROM accounts WHERE username = ${username} LIMIT 1`;
      if (existing.length > 0) {
        res.status(409).json({ error: "Este usuario ja existe" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const inserted = await sql`
        INSERT INTO accounts (role, username, "passwordHash", name, email, phone, instagram, pix, status)
        VALUES (
          'partner',
          ${username},
          ${passwordHash},
          ${name},
          ${body.email ? String(body.email) : null},
          ${body.phone ? String(body.phone) : null},
          ${body.instagram ? String(body.instagram) : null},
          ${body.pix ? String(body.pix) : null},
          'pending'
        )
        RETURNING id
      `;

      setSessionCookie(res, signSession({ accountId: inserted[0].id, role: "partner" }));
      res.status(201).json({ ok: true });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Partner] Signup error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}
