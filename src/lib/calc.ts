// Pure formulas, ported one-to-one from the SBFCC v3.0 Google Sheet.
// Sheet cell references are noted so each result can be traced back.

export type PricingMethod = 'fixed' | 'markup' | 'margin' | 'manual'

/** Ingredients!H / Other!H: =IF(E="","",(D+F)/E) */
export function unitCost(packagePrice: number | null, shippingFee: number | null, qtyPerPack: number | null) {
  if (!qtyPerPack) return null
  return ((packagePrice ?? 0) + (shippingFee ?? 0)) / qtyPerPack
}

export type CostInput = {
  ingredientsTotal: number // SUM(Q27:T292), the batch ingredient cost
  packagingTotal: number // SUM(AL27:AO292), the batch packaging cost
  servings: number // G20
  includeWastage: boolean // AG5
  wastageRate: number // AG6
}

/** Recipe!V5:V7 — per-serving cost. Wastage applies to ingredients and packaging, as in the sheet. */
export function servingCost({ ingredientsTotal, packagingTotal, servings, includeWastage, wastageRate }: CostInput) {
  if (!(servings > 0)) return null
  const factor = includeWastage ? 1 / (1 - wastageRate) : 1
  if (!Number.isFinite(factor) || factor <= 0) return null
  const ingredients = (ingredientsTotal / servings) * factor
  const packaging = (packagingTotal / servings) * factor
  return { ingredients, packaging, total: ingredients + packaging }
}

export type PriceSettings = {
  includeVat: boolean // G18
  vatRate: number // G19
  discountRate: number // G22, PWD/senior
}

export type PriceBreakdown = {
  priceBeforeVat: number
  vat: number
  sellingPrice: number
  profit: number
  discountAmount: number
  discountedPrice: number
  profitAfterDiscount: number
  impliedMargin: number | null
  impliedMarkup: number | null
}

function breakdown(cost: number, priceBeforeVat: number, vat: number, s: PriceSettings): PriceBreakdown {
  const profit = priceBeforeVat - cost
  const discountAmount = priceBeforeVat * s.discountRate
  const discountedPrice = priceBeforeVat - discountAmount
  return {
    priceBeforeVat,
    vat,
    sellingPrice: priceBeforeVat + vat,
    profit,
    discountAmount,
    discountedPrice,
    profitAfterDiscount: discountedPrice - cost,
    impliedMargin: priceBeforeVat ? profit / priceBeforeVat : null,
    impliedMarkup: cost ? profit / cost : null,
  }
}

const addVat = (pre: number, s: PriceSettings) => (s.includeVat ? pre * s.vatRate : 0)

/** Fixed markup column (Q13:Q20): price before VAT = cost + amount */
export function priceFixedMarkup(cost: number, amount: number, s: PriceSettings) {
  const pre = cost + amount
  return breakdown(cost, pre, addVat(pre, s), s)
}

/** Markup % column (AB13:AB20): price before VAT = cost × (1 + markup) */
export function priceMarkup(cost: number, markup: number, s: PriceSettings) {
  const pre = cost * (1 + markup)
  return breakdown(cost, pre, addVat(pre, s), s)
}

/** Margin % column (AM13:AM20): price before VAT = cost ÷ (1 − margin). Null when margin ≥ 100%. */
export function priceMargin(cost: number, margin: number, s: PriceSettings) {
  if (margin >= 1) return null
  const pre = cost / (1 - margin)
  return breakdown(cost, pre, addVat(pre, s), s)
}

/** Manual column (AX11:AX22): the entered price already includes VAT. */
export function priceManual(cost: number, sellingPrice: number, s: PriceSettings) {
  const pre = s.includeVat ? sellingPrice / (1 + s.vatRate) : sellingPrice
  return breakdown(cost, pre, sellingPrice - pre, s)
}

/** OPEX!C23:C25. The sheet hardcodes contingency; here it is a setting. */
export function opexTotals(amounts: number[], contingencyRate: number) {
  const total = amounts.reduce((a, b) => a + b, 0)
  const contingency = total * contingencyRate
  return { total, contingency, estimated: total + contingency }
}

export type SummaryRow = {
  sellingPrice: number
  costPerOrder: number
  profitPerOrder: number
  vatPerOrder: number
  ordersPerMonth: number
}

/** Summary!T8:T18, summed over every recipe (the sheet stopped at fixed row ranges). */
export function monthlyProjection(rows: SummaryRow[], monthlyOpex: number) {
  let grossSales = 0
  let vat = 0
  let cogs = 0
  for (const r of rows) {
    grossSales += r.sellingPrice * r.ordersPerMonth
    vat += r.vatPerOrder * r.ordersPerMonth
    cogs += r.costPerOrder * r.ordersPerMonth
  }
  const netSales = grossSales - vat
  const grossProfit = netSales - cogs
  const netProfit = grossProfit - monthlyOpex
  return {
    grossSales,
    vat,
    netSales,
    cogs,
    grossProfit,
    opex: monthlyOpex,
    netProfit,
    netProfitMargin: netSales ? netProfit / netSales : 0,
  }
}
