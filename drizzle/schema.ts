import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Pizza categories
export const pizzas = mysqlTable("pizzas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  ingredients: text("ingredients").notNull(), // JSON string with ingredients array
  category: mysqlEnum("category", ["classica", "especial", "doce"]).notNull(),
  priceSmall: decimal("priceSmall", { precision: 10, scale: 2 }).notNull(), // Brotinho
  priceLarge: decimal("priceLarge", { precision: 10, scale: 2 }).notNull(), // Grande
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pizza = typeof pizzas.$inferSelect;
export type InsertPizza = typeof pizzas.$inferInsert;

// Customers with phone-based login
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(), // Phone number as unique identifier
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address").notNull(),
  addressNumber: varchar("addressNumber", { length: 20 }).notNull(),
  addressReference: text("addressReference"), // Optional reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// Shopping cart items
export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 100 }).notNull(), // Temporary session ID for anonymous users
  pizzaId1: int("pizzaId1").notNull(), // First pizza for half-half option
  pizzaId2: int("pizzaId2"), // Second pizza for half-half option (null if single flavor)
  size: mysqlEnum("size", ["small", "large"]).notNull(), // Brotinho or Grande
  quantity: int("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Calculated price (highest price for half-half)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// Promotions
export const promotions = mysqlTable("promotions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  details: text("details"), // Additional details
  isActive: boolean("isActive").notNull().default(true),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;

// Orders
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"),
  phone: varchar("phone", { length: 20 }).notNull(), // Store phone for WhatsApp integration
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address").notNull(),
  addressNumber: varchar("addressNumber", { length: 20 }).notNull(),
  addressReference: text("addressReference"),
  items: text("items").notNull(), // JSON string with order items
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "completed", "cancelled"]).default("pending").notNull(),
  whatsappMessageId: varchar("whatsappMessageId", { length: 100 }), // For tracking
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
