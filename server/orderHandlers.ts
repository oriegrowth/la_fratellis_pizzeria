import * as db from "./db";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function assertPersistentDatabase() {
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    throw new ApiError(500, "DATABASE_URL is not configured in Vercel");
  }
}

export async function createPublicOrder(body: any) {
  assertPersistentDatabase();

  const customer = body?.customer ?? {};
  const items = Array.isArray(body?.items) ? body.items : [];
  const total = Number(body?.total ?? 0);
  const orderSubtotal = items.reduce((sum: number, item: { total?: unknown }) => {
    const lineTotal = Number(item.total ?? 0);
    return lineTotal > 0 ? sum + lineTotal : sum;
  }, 0);

  if (!customer.name || !customer.phone || !customer.address || items.length === 0 || orderSubtotal <= 0 || total < 0) {
    throw new ApiError(400, "Invalid order payload");
  }

  const phone = String(customer.phone);
  const shouldSaveContact = Boolean(body.savedContact);
  const savedCustomer = shouldSaveContact
    ? await db.createOrUpdateCustomer({
        phone,
        name: String(customer.name),
        address: String(customer.address),
        addressNumber: String(customer.addressNumber || "S/N"),
        addressReference: customer.reference ? String(customer.reference) : undefined,
        savedContact: true,
      })
    : await db.getCustomerByPhone(phone);

  const attribution = body.attribution ?? {};
  return db.createOrder({
    customerId: savedCustomer?.id,
    phone,
    name: String(customer.name),
    address: String(customer.address),
    addressNumber: String(customer.addressNumber || "S/N"),
    addressReference: customer.reference ? String(customer.reference) : undefined,
    items: JSON.stringify(items),
    totalPrice: total,
    savedContact: shouldSaveContact,
    campaignSource: attribution.utmSource ? String(attribution.utmSource) : undefined,
    campaignMedium: attribution.utmMedium ? String(attribution.utmMedium) : undefined,
    campaignName: attribution.utmCampaign ? String(attribution.utmCampaign) : undefined,
    campaignTerm: attribution.utmTerm ? String(attribution.utmTerm) : undefined,
    campaignContent: attribution.utmContent ? String(attribution.utmContent) : undefined,
    gclid: attribution.gclid ? String(attribution.gclid) : undefined,
    fbclid: attribution.fbclid ? String(attribution.fbclid) : undefined,
    landingPage: attribution.landingPage ? String(attribution.landingPage) : undefined,
    referrer: attribution.referrer ? String(attribution.referrer) : undefined,
  });
}

export async function listAdminOrders(query: Record<string, unknown>) {
  assertPersistentDatabase();

  if (stringValue(query.user) !== "admin" || stringValue(query.password) !== "admin") {
    throw new ApiError(401, "Unauthorized");
  }

  return db.getOrders();
}
