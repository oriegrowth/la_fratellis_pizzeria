import { ApiError, createPublicOrder } from "../_ordersDb";

function parseBody(body: unknown) {
  if (typeof body !== "string") return body;

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const order = await createPublicOrder(parseBody(req.body));
    res.status(200).json({ order });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("[Orders] Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
}
