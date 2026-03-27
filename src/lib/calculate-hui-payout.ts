type CalculateHuiPayoutInput = {
  totalSlots: number;
  winnerSlots: number;
  huiAmount: number;
  bidAmount: number;
  commission: number;
  cycleDays?: number;
};

type CalculateHuiPayoutResult = {
  contributors: number;
  contributionPerSlot: number;
  grossPayout: number;
  finalPayout: number;
};

function assertNonNegativeInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} phải là số nguyên >= 0`);
  }
}

function toSafeNumber(value: bigint, field: string) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${field} vượt quá giới hạn an toàn`);
  }
  return Number(value);
}

export function calculateHuiPayout({
  totalSlots,
  winnerSlots,
  huiAmount,
  bidAmount,
  commission,
  cycleDays = 1,
}: CalculateHuiPayoutInput): CalculateHuiPayoutResult {
  assertNonNegativeInteger(totalSlots, "totalSlots");
  assertNonNegativeInteger(winnerSlots, "winnerSlots");
  assertNonNegativeInteger(huiAmount, "huiAmount");
  assertNonNegativeInteger(bidAmount, "bidAmount");
  assertNonNegativeInteger(commission, "commission");
  assertNonNegativeInteger(cycleDays, "cycleDays");

  const contributors = Math.max(0, totalSlots - winnerSlots);
  const contributionPerDay = Math.max(0, huiAmount - bidAmount);
  const contributionPerSlot = contributionPerDay * Math.max(1, cycleDays);

  const grossPayoutBigInt = BigInt(contributors) * BigInt(contributionPerSlot);
  const finalPayoutBigInt = grossPayoutBigInt - BigInt(commission);
  const finalPayout = finalPayoutBigInt < BigInt(0) ? BigInt(0) : finalPayoutBigInt;

  return {
    contributors,
    contributionPerSlot,
    grossPayout: toSafeNumber(grossPayoutBigInt, "grossPayout"),
    finalPayout: toSafeNumber(finalPayout, "finalPayout"),
  };
}
