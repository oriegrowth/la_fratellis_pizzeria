import { pbkdf2 as pbkdf2Cb, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Cb);

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha256";
const SESSION_COOKIE = "lf_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type SessionPayload = {
  accountId: number;
  role: "admin" | "partner";
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET nao configurada");
  }
  return secret;
}

function base64url(input: Buffer) {
  return input.toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  const derived = await pbkdf2(password, salt, iterations, expected.length, PBKDF2_DIGEST);

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function signSession(payload: Omit<SessionPayload, "exp">, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): string {
  const fullPayload: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds };
  const encodedPayload = base64url(Buffer.from(JSON.stringify(fullPayload)));
  const signature = base64url(createHmac("sha256", getSessionSecret()).update(encodedPayload).digest());
  return `${encodedPayload}.${signature}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = base64url(createHmac("sha256", getSessionSecret()).update(encodedPayload).digest());
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req: any): Record<string, string> {
  const header = req.headers?.cookie as string | undefined;
  if (!header) return {};

  return Object.fromEntries(
    header.split(";").map((part: string) => {
      const index = part.indexOf("=");
      if (index === -1) return [part.trim(), ""];
      return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
    }),
  );
}

export function getSessionFromRequest(req: any): SessionPayload | null {
  return verifySession(parseCookies(req)[SESSION_COOKIE]);
}

export function setSessionCookie(res: any, token: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const attributes = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  res.setHeader("Set-Cookie", attributes.join("; "));
}

export function clearSessionCookie(res: any) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function requireRole(req: any, res: any, role: "admin" | "partner"): SessionPayload | null {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== role) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
}
