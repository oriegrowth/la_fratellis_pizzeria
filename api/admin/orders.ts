import { ApiError, listAdminOrders } from "../_ordersDb";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const orders = await listAdminOrders(req.query ?? {});
    res.status(200).json({ orders });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("[Admin] Failed to list orders:", error);
    res.status(500).json({ error: "Failed to list orders" });
  }
}
