import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { lookup } from "dns/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("❌ DATABASE_URL não encontrada no .env");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error("❌ URL inválida — não conseguiu fazer parse:", url.slice(0, 40) + "...");
  process.exit(1);
}

console.log("📍 Host:", parsed.hostname);
console.log("🔌 Porta:", parsed.port);
console.log("👤 Usuário:", parsed.username);
console.log("🗄️  Banco:", parsed.pathname);

// Test DNS first
try {
  const addresses = await lookup(parsed.hostname);
  console.log("✅ DNS resolvido:", addresses.address);
} catch (err) {
  console.error("❌ DNS falhou para:", parsed.hostname);
  console.error("   Erro:", err.message);
  console.error("\n💡 Verifique a região no Supabase: Project Settings → Database → Connection pooling");
  console.error("   Copie o URI de lá diretamente em vez de montar manualmente.");
  process.exit(1);
}

// Test actual connection
try {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require", connect_timeout: 10 });

  const result = await sql`SELECT 1 AS ok`;
  console.log("✅ Conexão OK!");

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  console.log("📋 Tabelas:", tables.map(t => t.table_name).join(", ") || "(nenhuma)");

  await sql.end();
} catch (err) {
  console.error("❌ Falha na conexão:", err.message);
  process.exit(1);
}
