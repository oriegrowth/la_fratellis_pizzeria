import { boolean, integer, numeric, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const pizzaCategory = pgEnum("pizza_category", ["classica", "especial", "doce"]);
export const pizzaSize = pgEnum("pizza_size", ["small", "large"]);
export const cartItemType = pgEnum("cart_item_type", ["pizza", "product"]);
export const orderStatus = pgEnum("order_status", ["pending", "sent", "completed", "cancelled"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Pizza categories
export const pizzas = pgTable("pizzas", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  ingredients: text("ingredients").notNull(), // JSON string with ingredients array
  category: pizzaCategory("category").notNull(),
  priceSmall: numeric("priceSmall", { precision: 10, scale: 2 }).notNull(), // Brotinho
  priceLarge: numeric("priceLarge", { precision: 10, scale: 2 }).notNull(), // Grande
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Pizza = typeof pizzas.$inferSelect;
export type InsertPizza = typeof pizzas.$inferInsert;

// Menu products that are sold with a single unit price, such as drinks.
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// Customers with phone-based login
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(), // Phone number as unique identifier
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address").notNull(),
  addressNumber: varchar("addressNumber", { length: 20 }).notNull(),
  addressReference: text("addressReference"), // Optional reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// Shopping cart items
export const cartItems = pgTable("cartItems", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 100 }).notNull(), // Temporary session ID for anonymous users
  itemType: cartItemType("itemType").default("pizza").notNull(),
  pizzaId1: integer("pizzaId1"), // First pizza for half-half option
  pizzaId2: integer("pizzaId2"), // Second pizza for half-half option (null if single flavor)
  productId: integer("productId"),
  size: pizzaSize("size"), // Brotinho or Grande
  quantity: integer("quantity").notNull().default(1),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // Calculated price (highest price for half-half)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// Promotions
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  details: text("details"), // Additional details
  isActive: boolean("isActive").notNull().default(true),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId"),
  phone: varchar("phone", { length: 20 }).notNull(), // Store phone for WhatsApp integration
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address").notNull(),
  addressNumber: varchar("addressNumber", { length: 20 }).notNull(),
  addressReference: text("addressReference"),
  items: text("items").notNull(), // JSON string with order items
  totalPrice: numeric("totalPrice", { precision: 10, scale: 2 }).notNull(),
  status: orderStatus("status").default("pending").notNull(),
  whatsappMessageId: varchar("whatsappMessageId", { length: 100 }), // For tracking
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
