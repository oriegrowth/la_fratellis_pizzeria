import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.post("/api/public/orders", async (req, res) => {
    try {
      const body = req.body ?? {};
      const customer = body.customer ?? {};
      const items = Array.isArray(body.items) ? body.items : [];
      const total = Number(body.total ?? 0);

      if (!customer.name || !customer.phone || !customer.address || items.length === 0 || total <= 0) {
        res.status(400).json({ error: "Invalid order payload" });
        return;
      }

      const savedCustomer = await db.createOrUpdateCustomer({
        phone: String(customer.phone),
        name: String(customer.name),
        address: String(customer.address),
        addressNumber: String(customer.addressNumber || "S/N"),
        addressReference: customer.reference ? String(customer.reference) : undefined,
        savedContact: Boolean(body.savedContact),
      });

      const attribution = body.attribution ?? {};
      const order = await db.createOrder({
        customerId: savedCustomer?.id,
        phone: String(customer.phone),
        name: String(customer.name),
        address: String(customer.address),
        addressNumber: String(customer.addressNumber || "S/N"),
        addressReference: customer.reference ? String(customer.reference) : undefined,
        items: JSON.stringify(items),
        totalPrice: total,
        savedContact: Boolean(body.savedContact),
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

      res.json({ order });
    } catch (error) {
      console.error("[Orders] Failed to create order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    if (req.query.user !== "admin" || req.query.password !== "admin") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const orders = await db.getOrders();
      res.json({ orders });
    } catch (error) {
      console.error("[Admin] Failed to list orders:", error);
      res.status(500).json({ error: "Failed to list orders" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
