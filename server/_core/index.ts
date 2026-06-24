import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { serveStatic, setupVite } from "./vite";
import { ApiError, createPublicOrder, listAdminOrders } from "../orderHandlers";

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

  app.post("/api/public/orders", async (req, res) => {
    try {
      const order = await createPublicOrder(req.body);
      res.json({ order });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      console.error("[Orders] Failed to create order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    try {
      const orders = await listAdminOrders(req.query);
      res.json({ orders });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      console.error("[Admin] Failed to list orders:", error);
      res.status(500).json({ error: "Failed to list orders" });
    }
  });

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
