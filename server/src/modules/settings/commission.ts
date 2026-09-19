export interface FeeBreakdown {
  totalAmount: number;
  buyerCommissionPercent: number;
  sellerCommissionPercent: number;
  buyerFee: number;
  buyerTotal: number;
  sellerFee: number;
  sellerPayout: number;
  platformRevenue: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeFees(
  totalAmount: number,
  buyerCommissionPercent: number,
  sellerCommissionPercent: number,
): FeeBreakdown {
  const buyerFee = round2((totalAmount * buyerCommissionPercent) / 100);
  const sellerFee = round2((totalAmount * sellerCommissionPercent) / 100);
  return {
    totalAmount,
    buyerCommissionPercent,
    sellerCommissionPercent,
    buyerFee,
    buyerTotal: round2(totalAmount + buyerFee),
    sellerFee,
    sellerPayout: round2(totalAmount - sellerFee),
    platformRevenue: round2(buyerFee + sellerFee),
  };
}
