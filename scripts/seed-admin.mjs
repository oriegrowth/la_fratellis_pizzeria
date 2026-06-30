// Cria ou atualiza a conta de administrador com senha hasheada.
// Uso: node scripts/seed-admin.mjs <usuario> <senha> ["Nome do admin"]
// Requer DATABASE_URL no ambiente (use scripts/run-with-env.mjs ou exporte manualmente).
import postgres from "postgres";
import { pbkdf2 as pbkdf2Cb, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Cb);

const [, , usernameArg, passwordArg, nameArg] = process.argv;

if (!usernameArg || !passwordArg) {
  console.error('Uso: node scripts/seed-admin.mjs <usuario> <senha> ["Nome do admin"]');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const username = usernameArg.trim().toLowerCase();
const name = nameArg || "Administrador";

async function hashPassword(password) {
  const iterations = 100_000;
  const salt = randomBytes(16);
  const derived = await pbkdf2(password, salt, iterations, 64, "sha256");
  return `pbkdf2$${iterations}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : "require",
});

try {
  const passwordHash = await hashPassword(passwordArg);
  const rows = await sql`
    INSERT INTO accounts (role, username, "passwordHash", name, status)
    VALUES ('admin', ${username}, ${passwordHash}, ${name}, 'active')
    ON CONFLICT (username) DO UPDATE SET
      "passwordHash" = excluded."passwordHash",
      role = 'admin',
      status = 'active',
      name = excluded.name,
      "updatedAt" = now()
    RETURNING id, username, role, status
  `;
  console.log("Conta admin pronta:", rows[0]);
} finally {
  await sql.end();
}
