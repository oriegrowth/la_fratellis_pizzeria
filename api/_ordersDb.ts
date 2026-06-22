import postgres from "postgres";

type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  landingPage?: string;
  referrer?: string;
};

type PublicOrderBody = {
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
    addressNumber?: string;
    reference?: string;
  };
  savedContact?: boolean;
  items?: Array<{ total?: unknown }>;
  total?: unknown;
  attribution?: Attribution;
};

let sql: ReturnType<typeof postgres> | null = null;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new ApiError(500, "DATABASE_URL is not configured in Vercel");
  }

  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      prepare: false,
      ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : "require",
    });
  }

  return sql;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function createPublicOrder(body: PublicOrderBody) {
  const database = getSql();
  const customer = body.customer ?? {};
  const items = Array.isArray(body.items) ? body.items : [];
  const total = Number(body.total ?? 0);
  const orderSubtotal = items.reduce((sum: number, item) => {
    const lineTotal = Number(item.total ?? 0);
    return lineTotal > 0 ? sum + lineTotal : sum;
  }, 0);

  if (!customer.name || !customer.phone || !customer.address || items.length === 0 || orderSubtotal <= 0 || total < 0) {
    throw new ApiError(400, "Invalid order payload");
  }

  const phone = String(customer.phone);
  const shouldSaveContact = Boolean(body.savedContact);
  let customerId: number | null = null;

  if (shouldSaveContact) {
    const saved = await database`
      INSERT INTO customers (
        phone,
        name,
        address,
        "addressNumber",
        "addressReference",
        "savedContact"
      )
      VALUES (
        ${phone},
        ${String(customer.name)},
        ${String(customer.address)},
        ${String(customer.addressNumber || "S/N")},
        ${customer.reference ? String(customer.reference) : null},
        true
      )
      ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        "addressNumber" = EXCLUDED."addressNumber",
        "addressReference" = EXCLUDED."addressReference",
        "savedContact" = true,
        "updatedAt" = now()
      RETURNING id
    `;
    customerId = Number(saved[0]?.id ?? 0) || null;
  } else {
    const existing = await database`SELECT id FROM customers WHERE phone = ${phone} LIMIT 1`;
    customerId = Number(existing[0]?.id ?? 0) || null;
  }

  const attribution = body.attribution ?? {};
  const order = await database`
    INSERT INTO orders (
      "customerId",
      phone,
      name,
      address,
      "addressNumber",
      "addressReference",
      items,
      "totalPrice",
      "savedContact",
      "campaignSource",
      "campaignMedium",
      "campaignName",
      "campaignTerm",
      "campaignContent",
      gclid,
      fbclid,
      "landingPage",
      referrer,
      status
    )
    VALUES (
      ${customerId},
      ${phone},
      ${String(customer.name)},
      ${String(customer.address)},
      ${String(customer.addressNumber || "S/N")},
      ${customer.reference ? String(customer.reference) : null},
      ${JSON.stringify(items)},
      ${total.toString()},
      ${shouldSaveContact},
      ${attribution.utmSource ? String(attribution.utmSource) : null},
      ${attribution.utmMedium ? String(attribution.utmMedium) : null},
      ${attribution.utmCampaign ? String(attribution.utmCampaign) : null},
      ${attribution.utmTerm ? String(attribution.utmTerm) : null},
      ${attribution.utmContent ? String(attribution.utmContent) : null},
      ${attribution.gclid ? String(attribution.gclid) : null},
      ${attribution.fbclid ? String(attribution.fbclid) : null},
      ${attribution.landingPage ? String(attribution.landingPage) : null},
      ${attribution.referrer ? String(attribution.referrer) : null},
      'pending'
    )
    RETURNING *
  `;

  return order[0];
}

export async function listAdminOrders(query: Record<string, unknown>) {
  if (stringValue(query.user) !== "admin" || stringValue(query.password) !== "admin") {
    throw new ApiError(401, "Unauthorized");
  }

  const database = getSql();
  return database`SELECT * FROM orders ORDER BY "createdAt" DESC`;
}
