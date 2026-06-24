function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || "";
}

function parseBody(body: unknown) {
  if (typeof body !== "string") return body ?? {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      res.status(500).json({ error: "DATABASE_URL nao configurada na Vercel" });
      return;
    }

    const postgresModule = await import("postgres");
    const postgres = postgresModule.default;
    const sql = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      ssl: databaseUrl.includes("sslmode=disable") ? false : "require",
      connect_timeout: 10,
    });

    try {
      const body = parseBody(req.body) as any;
      const customer = body.customer ?? {};
      const items = Array.isArray(body.items) ? body.items : [];
      const total = Number(body.total ?? 0);
      const orderSubtotal = items.reduce((sum: number, item: { total?: unknown }) => {
        const lineTotal = Number(item.total ?? 0);
        return lineTotal > 0 ? sum + lineTotal : sum;
      }, 0);

      if (!customer.name || !customer.phone || !customer.address || items.length === 0 || orderSubtotal <= 0 || total < 0) {
        res.status(400).json({ error: "Invalid order payload" });
        return;
      }

      const phone = String(customer.phone);
      const shouldSaveContact = Boolean(body.savedContact);
      let customerId: number | null = null;

      if (shouldSaveContact) {
        const saved = await sql`
          INSERT INTO customers (phone, name, address, "addressNumber", "addressReference", "savedContact")
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
        const existing = await sql`SELECT id FROM customers WHERE phone = ${phone} LIMIT 1`;
        customerId = Number(existing[0]?.id ?? 0) || null;
      }

      const attribution = body.attribution ?? {};
      const order = await sql`
        INSERT INTO orders (
          "customerId", phone, name, address, "addressNumber", "addressReference",
          items, "totalPrice", "savedContact",
          "campaignSource", "campaignMedium", "campaignName", "campaignTerm", "campaignContent",
          gclid, fbclid, "landingPage", referrer, status
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

      res.status(200).json({ order: order[0] });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("[Orders] Failed to create order:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create order",
    });
  }
}
