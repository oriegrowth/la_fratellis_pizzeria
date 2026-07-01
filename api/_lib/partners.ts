// Shared accumulation-cycle math for partners.
//
// A partner accumulates commission over an "open period". Requesting a withdrawal writes a
// payoutRequest whose periodEnd closes the current cycle and opens the next one. A pending or
// paid request acts as the boundary; a rejected request does not, so its sales fold back into the
// open period.

export type OpenPeriod = {
  periodStart: Date;
  periodEnd: Date;
  totalSales: number;
  ordersCount: number;
  commissionPercent: number;
  commissionAmount: number;
};

/**
 * Computes the partner's currently-open accumulation period: sales attributed to any of the
 * partner's coupons since the last non-rejected payout (or account creation), up to now.
 * Returns null when the account does not exist or is not a partner.
 */
export async function computeOpenPeriod(sql: any, accountId: number): Promise<OpenPeriod | null> {
  const accountRows = await sql`
    SELECT username, "commissionPercent", "createdAt" FROM accounts
    WHERE id = ${accountId} AND role = 'partner'
    LIMIT 1
  `;
  if (accountRows.length === 0) return null;

  const username = accountRows[0].username;
  const commissionPercent = Number(accountRows[0].commissionPercent);

  const boundaryRows = await sql`
    SELECT MAX("periodEnd") AS boundary FROM "payoutRequests"
    WHERE "accountId" = ${accountId} AND status IN ('pending', 'paid')
  `;

  const periodStart: Date = boundaryRows[0]?.boundary
    ? new Date(boundaryRows[0].boundary)
    : new Date(accountRows[0].createdAt);
  const periodEnd = new Date();

  // A sale is attributed to the partner when it either used one of the partner's coupons OR
  // arrived through the partner's referral link (partnerRef) without any coupon. In the link case
  // the customer paid full price, so the same commission percent naturally yields a larger amount.
  const salesRows = await sql`
    SELECT
      COUNT(o.id)::int AS "ordersCount",
      COALESCE(SUM(o."totalPrice"), 0)::numeric AS "totalSales"
    FROM orders o
    LEFT JOIN coupons c ON c.code = o."couponCode"
    WHERE o."createdAt" >= ${periodStart}
      AND o."createdAt" <= ${periodEnd}
      AND (
        c."accountId" = ${accountId}
        OR (o."couponCode" IS NULL AND o."partnerRef" = ${username})
      )
  `;

  const totalSales = Number(salesRows[0].totalSales);
  const commissionAmount = Math.round(totalSales * commissionPercent) / 100;

  return {
    periodStart,
    periodEnd,
    totalSales,
    ordersCount: salesRows[0].ordersCount,
    commissionPercent,
    commissionAmount,
  };
}
