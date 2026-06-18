import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, pizzas, products, customers, cartItems, orders, promotions } from "../drizzle/schema";
import { ENV } from './_core/env';
import { fallbackPizzas, fallbackProducts, fallbackPromotions } from "@shared/menuData";

let _db: ReturnType<typeof drizzle> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;
let memoryCartId = 1;
let memoryCustomerId = 1;
let memoryOrderId = 1;
const memoryCartItems: Array<{
  id: number;
  sessionId: string;
  itemType: "pizza" | "product";
  pizzaId1: number | null;
  pizzaId2: number | null;
  productId: number | null;
  size: "small" | "large" | null;
  quantity: number;
  price: string;
  createdAt: Date;
  updatedAt: Date;
}> = [];
const memoryCustomers: Array<{
  id: number;
  phone: string;
  name: string;
  address: string;
  addressNumber: string;
  addressReference: string | null;
  savedContact: boolean;
  createdAt: Date;
  updatedAt: Date;
}> = [];
const memoryOrders: Array<{
  id: number;
  customerId: number | null;
  phone: string;
  name: string;
  address: string;
  addressNumber: string;
  addressReference: string | null;
  items: string;
  totalPrice: string;
  savedContact: boolean;
  campaignSource: string | null;
  campaignMedium: string | null;
  campaignName: string | null;
  campaignTerm: string | null;
  campaignContent: string | null;
  gclid: string | null;
  fbclid: string | null;
  landingPage: string | null;
  referrer: string | null;
  status: "pending" | "sent" | "completed" | "cancelled";
  whatsappMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = [];

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _sql = postgres(process.env.DATABASE_URL, {
        max: 1,
        prepare: false,
        ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : "require",
      });
      _db = drizzle(_sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Pizza queries
export async function getAllPizzas() {
  const db = await getDb();
  if (!db) return fallbackPizzas;
  const result = await db.select().from(pizzas);
  return result.length > 0 ? result : fallbackPizzas;
}

export async function getPizzasByCategory(category: 'classica' | 'especial' | 'doce') {
  const db = await getDb();
  if (!db) return fallbackPizzas.filter(pizza => pizza.category === category);
  const result = await db.select().from(pizzas).where(eq(pizzas.category, category));
  return result.length > 0 ? result : fallbackPizzas.filter(pizza => pizza.category === category);
}

export async function getPizzaById(id: number) {
  const db = await getDb();
  if (!db) return fallbackPizzas.find(pizza => pizza.id === id) ?? null;
  const result = await db.select().from(pizzas).where(eq(pizzas.id, id)).limit(1);
  return result.length > 0 ? result[0] : fallbackPizzas.find(pizza => pizza.id === id) ?? null;
}

// Product queries
export async function getAllProducts() {
  const db = await getDb();
  if (!db) return fallbackProducts;

  try {
    const result = await db.select().from(products);
    return result.length > 0 ? result : fallbackProducts;
  } catch (error) {
    console.warn("[Database] Cannot get products, using fallback:", error);
    return fallbackProducts;
  }
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return fallbackProducts.find(product => product.id === id) ?? null;

  try {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result.length > 0 ? result[0] : fallbackProducts.find(product => product.id === id) ?? null;
  } catch (error) {
    console.warn("[Database] Cannot get product, using fallback:", error);
    return fallbackProducts.find(product => product.id === id) ?? null;
  }
}

// Customer queries
export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return memoryCustomers.find(customer => customer.phone === phone) ?? null;
  const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createOrUpdateCustomer(data: {
  phone: string;
  name: string;
  address: string;
  addressNumber: string;
  addressReference?: string;
  savedContact?: boolean;
}) {
  const db = await getDb();
  if (!db) {
    const existing = memoryCustomers.find(customer => customer.phone === data.phone);
    const now = new Date();

    if (existing) {
      existing.name = data.name;
      existing.address = data.address;
      existing.addressNumber = data.addressNumber;
      existing.addressReference = data.addressReference || null;
      existing.savedContact = Boolean(data.savedContact);
      existing.updatedAt = now;
      return existing;
    }

    const customer = {
      id: memoryCustomerId++,
      phone: data.phone,
      name: data.name,
      address: data.address,
      addressNumber: data.addressNumber,
      addressReference: data.addressReference || null,
      savedContact: Boolean(data.savedContact),
      createdAt: now,
      updatedAt: now,
    };
    memoryCustomers.push(customer);
    return customer;
  }

  const existing = await getCustomerByPhone(data.phone);
  if (existing) {
    await db.update(customers).set({
      name: data.name,
      address: data.address,
      addressNumber: data.addressNumber,
      addressReference: data.addressReference || null,
      savedContact: Boolean(data.savedContact),
    }).where(eq(customers.phone, data.phone));
    return {
      ...existing,
      ...data,
      addressReference: data.addressReference || null,
      savedContact: Boolean(data.savedContact),
    };
  }

  const result = await db.insert(customers).values({
    ...data,
    savedContact: Boolean(data.savedContact),
  }).returning();
  return result[0];
}

// Cart queries
export async function getCartItems(sessionId: string) {
  const db = await getDb();
  if (!db) return memoryCartItems.filter(item => item.sessionId === sessionId);
  return db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
}

export async function addToCart(data: {
  sessionId: string;
  itemType?: 'pizza' | 'product';
  pizzaId1?: number;
  pizzaId2?: number;
  productId?: number;
  size?: 'small' | 'large';
  quantity: number;
  price: number;
}) {
  const itemType = data.itemType ?? 'pizza';

  const db = await getDb();
  if (!db) {
    const now = new Date();
    const item = {
      id: memoryCartId++,
      sessionId: data.sessionId,
      itemType,
      pizzaId1: data.pizzaId1 || null,
      pizzaId2: data.pizzaId2 || null,
      productId: data.productId || null,
      size: data.size || null,
      quantity: data.quantity,
      price: data.price.toString(),
      createdAt: now,
      updatedAt: now,
    };
    memoryCartItems.push(item);
    return item;
  }
  const result = await db.insert(cartItems).values([{
    sessionId: data.sessionId,
    itemType,
    pizzaId1: data.pizzaId1 || null,
    pizzaId2: data.pizzaId2 || null,
    productId: data.productId || null,
    size: data.size || null,
    quantity: data.quantity,
    price: data.price.toString(),
  }]).returning();
  return result[0];
}

export async function removeFromCart(id: number) {
  const db = await getDb();
  if (!db) {
    const index = memoryCartItems.findIndex(item => item.id === id);
    if (index === -1) return false;
    memoryCartItems.splice(index, 1);
    return true;
  }
  await db.delete(cartItems).where(eq(cartItems.id, id));
  return true;
}

export async function clearCart(sessionId: string) {
  const db = await getDb();
  if (!db) {
    for (let index = memoryCartItems.length - 1; index >= 0; index--) {
      if (memoryCartItems[index].sessionId === sessionId) {
        memoryCartItems.splice(index, 1);
      }
    }
    return true;
  }
  await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  return true;
}

// Order queries
export async function createOrder(data: {
  customerId?: number;
  phone: string;
  name: string;
  address: string;
  addressNumber: string;
  addressReference?: string;
  items: string; // JSON string
  totalPrice: number;
  savedContact?: boolean;
  campaignSource?: string;
  campaignMedium?: string;
  campaignName?: string;
  campaignTerm?: string;
  campaignContent?: string;
  gclid?: string;
  fbclid?: string;
  landingPage?: string;
  referrer?: string;
}) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const order = {
      id: memoryOrderId++,
      customerId: data.customerId || null,
      phone: data.phone,
      name: data.name,
      address: data.address,
      addressNumber: data.addressNumber,
      addressReference: data.addressReference || null,
      items: data.items,
      totalPrice: data.totalPrice.toString(),
      savedContact: Boolean(data.savedContact),
      campaignSource: data.campaignSource || null,
      campaignMedium: data.campaignMedium || null,
      campaignName: data.campaignName || null,
      campaignTerm: data.campaignTerm || null,
      campaignContent: data.campaignContent || null,
      gclid: data.gclid || null,
      fbclid: data.fbclid || null,
      landingPage: data.landingPage || null,
      referrer: data.referrer || null,
      status: "pending" as const,
      whatsappMessageId: null,
      createdAt: now,
      updatedAt: now,
    };
    memoryOrders.push(order);
    return order;
  }
  const result = await db.insert(orders).values([{
    customerId: data.customerId || null,
    phone: data.phone,
    name: data.name,
    address: data.address,
    addressNumber: data.addressNumber,
    addressReference: data.addressReference || null,
    items: data.items,
    totalPrice: data.totalPrice.toString(),
    savedContact: Boolean(data.savedContact),
    campaignSource: data.campaignSource || null,
    campaignMedium: data.campaignMedium || null,
    campaignName: data.campaignName || null,
    campaignTerm: data.campaignTerm || null,
    campaignContent: data.campaignContent || null,
    gclid: data.gclid || null,
    fbclid: data.fbclid || null,
    landingPage: data.landingPage || null,
    referrer: data.referrer || null,
    status: 'pending' as const,
  }]).returning();
  return result[0];
}

export async function getOrders() {
  const db = await getDb();
  if (!db) return [...memoryOrders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

// Promotions queries
export async function getActivePromotions() {
  const db = await getDb();
  if (!db) return fallbackPromotions;
  const result = await db.select().from(promotions).where(eq(promotions.isActive, true));
  return result.length > 0 ? result : fallbackPromotions;
}
