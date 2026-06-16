import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, pizzas, customers, cartItems, orders, promotions } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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
  if (!db) return [];
  return db.select().from(pizzas);
}

export async function getPizzasByCategory(category: 'classica' | 'especial' | 'doce') {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pizzas).where(eq(pizzas.category, category));
}

export async function getPizzaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(pizzas).where(eq(pizzas.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Customer queries
export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createOrUpdateCustomer(data: {
  phone: string;
  name: string;
  address: string;
  addressNumber: string;
  addressReference?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const existing = await getCustomerByPhone(data.phone);
  if (existing) {
    await db.update(customers).set({
      name: data.name,
      address: data.address,
      addressNumber: data.addressNumber,
      addressReference: data.addressReference || null,
    }).where(eq(customers.phone, data.phone));
    return existing;
  }

  const result = await db.insert(customers).values(data);
  return { ...data, id: result[0].insertId };
}

// Cart queries
export async function getCartItems(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
}

export async function addToCart(data: {
  sessionId: string;
  pizzaId1: number;
  pizzaId2?: number;
  size: 'small' | 'large';
  quantity: number;
  price: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(cartItems).values([{
    sessionId: data.sessionId,
    pizzaId1: data.pizzaId1,
    pizzaId2: data.pizzaId2 || null,
    size: data.size,
    quantity: data.quantity,
    price: data.price.toString(),
  }]);
  return result;
}

export async function removeFromCart(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(cartItems).where(eq(cartItems.id, id));
  return true;
}

export async function clearCart(sessionId: string) {
  const db = await getDb();
  if (!db) return false;
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
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(orders).values([{
    customerId: data.customerId || null,
    phone: data.phone,
    name: data.name,
    address: data.address,
    addressNumber: data.addressNumber,
    addressReference: data.addressReference || null,
    items: data.items,
    totalPrice: data.totalPrice.toString(),
    status: 'pending' as const,
  }]);
  return result;
}

// Promotions queries
export async function getActivePromotions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promotions).where(eq(promotions.isActive, true));
}
