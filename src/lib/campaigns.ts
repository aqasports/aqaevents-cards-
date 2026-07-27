/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";

export async function validateAndApplyPromoCode(
  code: string,
  originalPrice: number
): Promise<{
  valid: boolean;
  error?: string;
  discountAmount: number;
  finalPrice: number;
  promo?: any;
}> {
  if (!code || !code.trim()) {
    return {
      valid: false,
      error: "PROMO_CODE_REQUIRED",
      discountAmount: 0,
      finalPrice: originalPrice,
    };
  }

  const cleanCode = code.trim().toUpperCase();

  const promo = await prisma.campaignPromo.findUnique({
    where: { code: cleanCode },
  });

  if (!promo) {
    return {
      valid: false,
      error: "PROMO_NOT_FOUND",
      discountAmount: 0,
      finalPrice: originalPrice,
    };
  }

  if (!promo.active) {
    return {
      valid: false,
      error: "PROMO_INACTIVE",
      discountAmount: 0,
      finalPrice: originalPrice,
    };
  }

  const now = new Date();
  if (promo.validFrom && now < promo.validFrom) {
    return {
      valid: false,
      error: "PROMO_NOT_YET_VALID",
      discountAmount: 0,
      finalPrice: originalPrice,
    };
  }

  if (promo.validUntil && now > promo.validUntil) {
    return {
      valid: false,
      error: "PROMO_EXPIRED",
      discountAmount: 0,
      finalPrice: originalPrice,
    };
  }

  if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
    return {
      valid: false,
      error: "PROMO_USAGE_LIMIT_REACHED",
      discountAmount: 0,
      finalPrice: originalPrice,
    };
  }

  let calculatedDiscount = 0;
  if (promo.discountType === "percentage") {
    calculatedDiscount = Math.round((originalPrice * promo.discountValue) / 100);
  } else {
    calculatedDiscount = Math.round(promo.discountValue);
  }

  const discountAmount = Math.min(originalPrice, Math.max(0, calculatedDiscount));
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    valid: true,
    discountAmount,
    finalPrice,
    promo,
  };
}

export async function incrementPromoUses(promoId: string) {
  return await prisma.campaignPromo.update({
    where: { id: promoId },
    data: { usesCount: { increment: 1 } },
  });
}
