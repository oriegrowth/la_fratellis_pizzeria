import postgres from "postgres";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const menuDataPath = path.join(root, "shared", "menuData.ts");
const menuData = await fs.readFile(menuDataPath, "utf8");
const pizzaMatches = [...menuData.matchAll(/name:\s*"([^"]+)".*?imageUrl:\s*image\("([^"]+)"\)/g)];
const pizzaImages = pizzaMatches.map((match) => ({
  name: match[1],
  imageUrl: `/images/pizzas/${match[2]}.webp`,
}));

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : "require",
});

try {
  for (const pizza of pizzaImages) {
    await sql`UPDATE pizzas SET "imageUrl" = ${pizza.imageUrl}, "updatedAt" = now() WHERE name = ${pizza.name}`;
  }

  console.log(`Pizza image paths updated: ${pizzaImages.length}`);
} finally {
  await sql.end();
}
