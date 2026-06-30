import { getDatabaseUrl, getSql, parseBody } from "../_lib/db.js";
import {
  hashPassword,
  verifyPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  requireRole,
} from "../_lib/auth.js";

// Consolidated partner auth endpoint (Vercel Hobby plan caps a deployment at 12 functions).
//   GET                  -> current logged-in partner profile ("me")
//   POST ?action=signup  -> self-register (status pending, auto-login)
//   POST ?action=login   -> login
//   POST ?action=logout  -> logout
export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      return await me(req, res);
    }

    if (req.method === "POST") {
      const action = String(req.query?.action ?? "");
      if (action === "signup") return await signup(req, res);
      if (action === "login") return await login(req, res);
      if (action === "logout") {
        clearSessionCookie(res);
        res.status(200).json({ ok: true });
        return;
      }
      res.status(400).json({ error: "Acao invalida" });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[Partner] Auth error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
}

async function me(req: any, res: any) {
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
}

async function signup(req: any, res: any) {
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
}

async function login(req: any, res: any) {
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
      SELECT id, "passwordHash", status FROM accounts
      WHERE username = ${username} AND role = 'partner'
      LIMIT 1
    `;

    if (rows.length === 0 || !(await verifyPassword(password, rows[0].passwordHash))) {
      res.status(401).json({ error: "Usuario ou senha invalidos" });
      return;
    }

    if (rows[0].status === "disabled") {
      res.status(403).json({ error: "Conta desativada. Fale com o administrador." });
      return;
    }

    setSessionCookie(res, signSession({ accountId: rows[0].id, role: "partner" }));
    res.status(200).json({ ok: true });
  } finally {
    await sql.end();
  }
}
