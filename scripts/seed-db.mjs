import postgres from "postgres";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : "require",
});

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const menuData = await fs.readFile(path.join(root, "shared", "menuData.ts"), "utf8");
const now = new Date();

const pizzaPattern =
  /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*description:\s*(null|"[^"]*"),\s*ingredients:\s*"([^"]+)",\s*category:\s*"([^"]+)",\s*priceSmall:\s*([\d.]+),\s*priceLarge:\s*([\d.]+),\s*imageUrl:\s*image\("([^"]+)"\)/g;
const productPattern =
  /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*description:\s*(null|"[^"]*"),\s*category:\s*"([^"]+)",\s*price:\s*([\d.]+),\s*imageUrl:\s*beverageImage\("([^"]+)"\)/g;

const pizzas = [...menuData.matchAll(pizzaPattern)].map((match) => ({
  id: Number(match[1]),
  name: match[2],
  description: match[3] === "null" ? null : match[3].slice(1, -1),
  ingredients: match[4],
  category: match[5],
  priceSmall: match[6],
  priceLarge: match[7],
  imageUrl: `/images/pizzas/${match[8]}.webp`,
}));

const products = [...menuData.matchAll(productPattern)].map((match) => ({
  id: Number(match[1]),
  name: match[2],
  description: match[3] === "null" ? null : match[3].slice(1, -1),
  category: match[4],
  price: match[5],
  imageUrl: `/images/beverages/${match[6]}.svg`,
}));

const promotions = [
  {
    id: 1,
    title: "2 Pizzas por R$89",
    description: "Promocao especial para pedir em dobro com entrega gratis em Perdizes e regiao.",
    details: "Consulte sabores participantes pelo WhatsApp ao finalizar.",
    isActive: true,
    startDate: now,
    endDate: null,
  },
];

try {
  for (const pizza of pizzas) {
    await sql`
      INSERT INTO pizzas (
        id, name, description, ingredients, category, "priceSmall", "priceLarge", "imageUrl", "createdAt", "updatedAt"
      )
      VALUES (
        ${pizza.id},
        ${pizza.name},
        ${pizza.description},
        ${pizza.ingredients},
        ${pizza.category},
        ${pizza.priceSmall},
        ${pizza.priceLarge},
        ${pizza.imageUrl},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        ingredients = excluded.ingredients,
        category = excluded.category,
        "priceSmall" = excluded."priceSmall",
        "priceLarge" = excluded."priceLarge",
        "imageUrl" = excluded."imageUrl",
        "updatedAt" = now()
    `;
  }

  for (const promotion of promotions) {
    await sql`
      INSERT INTO promotions (
        id, title, description, details, "isActive", "startDate", "endDate", "createdAt", "updatedAt"
      )
      VALUES (
        ${promotion.id},
        ${promotion.title},
        ${promotion.description},
        ${promotion.details},
        ${promotion.isActive},
        ${promotion.startDate},
        ${promotion.endDate},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        details = excluded.details,
        "isActive" = excluded."isActive",
        "startDate" = excluded."startDate",
        "endDate" = excluded."endDate",
        "updatedAt" = now()
    `;
  }

  for (const product of products) {
    await sql`
      INSERT INTO products (
        id, name, description, category, price, "imageUrl", "createdAt", "updatedAt"
      )
      VALUES (
        ${product.id},
        ${product.name},
        ${product.description},
        ${product.category},
        ${product.price},
        ${product.imageUrl},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        price = excluded.price,
        "imageUrl" = excluded."imageUrl",
        "updatedAt" = now()
    `;
  }

  console.log(`Database seeded: ${pizzas.length} pizzas, ${products.length} products, ${promotions.length} promotions`);
} finally {
  await sql.end();
}
