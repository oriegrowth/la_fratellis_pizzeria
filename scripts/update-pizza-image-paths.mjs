import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const menuDataPath = path.join(root, "shared", "menuData.ts");
const menuData = await fs.readFile(menuDataPath, "utf8");
const pizzaMatches = [...menuData.matchAll(/name:\s*"([^"]+)".*?imageUrl:\s*image\("([^"]+)"\)/g)];
const pizzaImages = pizzaMatches.map((match) => ({
  name: match[1],
  imageUrl: `/images/pizzas/${match[2]}.webp`,
}));

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "la_fratellis",
  port: Number(process.env.DB_PORT || 3306),
});

try {
  for (const pizza of pizzaImages) {
    await connection.execute("UPDATE pizzas SET imageUrl = ? WHERE name = ?", [pizza.imageUrl, pizza.name]);
  }

  console.log(`Pizza image paths updated: ${pizzaImages.length}`);
} finally {
  await connection.end();
}
