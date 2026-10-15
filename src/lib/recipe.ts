import type { Item, Line, Recipe } from '../store'
import {
  type PriceBreakdown,
  type PricingMethod,
  priceFixedMarkup,
  priceManual,
  priceMargin,
  priceMarkup,
  servingCost,
  unitCost,
} from './calc'

export type EvaluatedLine = { line: Line; item: Item | undefined; unitCost: number | null; cost: number | null }

export const itemUnitCost = (i: Item) => unitCost(i.packagePrice, i.shippingFee, i.qtyPerPack)

function evaluateLines(lines: Line[], items: Item[]): EvaluatedLine[] {
  return lines.map((line) => {
    const item = items.find((i) => i.id === line.itemId)
    const uc = item ? itemUnitCost(item) : null
    return { line, item, unitCost: uc, cost: line.qty != null && uc != null ? line.qty * uc : null }
  })
}

const sum = (lines: EvaluatedLine[]) => lines.reduce((a, l) => a + (l.cost ?? 0), 0)

export function evaluateRecipe(r: Recipe, ingredients: Item[], packaging: Item[]) {
  const ingredientLines = evaluateLines(r.ingredients, ingredients)
  const packagingLines = evaluateLines(r.packaging, packaging)
  const servings = r.servings ?? 0
  const serving = servingCost({
    ingredientsTotal: sum(ingredientLines),
    packagingTotal: sum(packagingLines),
    servings,
    includeWastage: r.includeWastage,
    wastageRate: r.wastageRate,
  })
  // The sheet only shows the Batch column when a recipe makes more than one serving.
  const batch =
    serving && servings > 1
      ? { ingredients: serving.ingredients * servings, packaging: serving.packaging * servings, total: serving.total * servings }
      : null

  const s = { includeVat: r.includeVat, vatRate: r.vatRate, discountRate: r.discountRate }
  const cost = serving?.total
  const prices: Record<PricingMethod, PriceBreakdown | null> =
    cost == null
      ? { fixed: null, markup: null, margin: null, manual: null }
      : {
          fixed: r.fixedMarkup == null ? null : priceFixedMarkup(cost, r.fixedMarkup, s),
          markup: r.markupRate == null ? null : priceMarkup(cost, r.markupRate, s),
          margin: r.marginRate == null ? null : priceMargin(cost, r.marginRate, s),
          manual: r.manualPrice == null ? null : priceManual(cost, r.manualPrice, s),
        }

  return { ingredientLines, packagingLines, serving, batch, prices }
}

export const METHOD_LABELS: Record<PricingMethod, string> = {
  fixed: 'Fixed markup',
  markup: 'Markup %',
  margin: 'Margin %',
  manual: 'Manual price',
}
