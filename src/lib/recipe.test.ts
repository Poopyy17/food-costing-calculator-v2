import { describe, expect, it } from 'vitest'
import type { Item, Recipe } from '../store'
import { evaluateRecipe } from './recipe'

const item = (id: string, packagePrice: number, qtyPerPack: number, shippingFee: number): Item =>
  ({ id, name: id, supplier: '', packagePrice, qtyPerPack, shippingFee, unit: '' })

const recipe = (patch: Partial<Recipe>): Recipe => ({
  id: 'r', name: 'Iced Americano', includeVat: true, vatRate: 0.12, servings: 1, discountRate: 0.2,
  includeWastage: false, wastageRate: 0.05, ingredients: [], packaging: [], fixedMarkup: null,
  markupRate: null, marginRate: null, manualPrice: null, pricingMethod: 'manual', ordersPerMonth: null, ...patch,
})

describe('evaluateRecipe', () => {
  const beans = item('beans', 900, 1000, 80) // ₱0.98/g
  const cup = item('cup', 220, 50, 40) // ₱5.20/pc

  it('costs a recipe end to end', () => {
    const r = recipe({
      ingredients: [{ id: 'l1', itemId: 'beans', qty: 18 }],
      packaging: [{ id: 'l2', itemId: 'cup', qty: 1 }],
      manualPrice: 100,
    })
    const { serving, batch, prices } = evaluateRecipe(r, [beans], [cup])
    expect(serving?.ingredients).toBeCloseTo(17.64)
    expect(serving?.packaging).toBeCloseTo(5.2)
    expect(batch).toBeNull()
    expect(prices.manual?.profit).toBeCloseTo(100 / 1.12 - 22.84)
    expect(prices.fixed).toBeNull()
  })

  it('splits batch packaging across servings and shows batch totals', () => {
    const r = recipe({ servings: 10, packaging: [{ id: 'l', itemId: 'cup', qty: 10 }] })
    const { serving, batch } = evaluateRecipe(r, [], [cup])
    expect(serving?.packaging).toBeCloseTo(5.2)
    expect(batch?.packaging).toBeCloseTo(52)
  })

  it('treats a deleted item as zero cost', () => {
    const r = recipe({ ingredients: [{ id: 'l', itemId: 'gone', qty: 5 }] })
    const { ingredientLines, serving } = evaluateRecipe(r, [beans], [])
    expect(ingredientLines[0].cost).toBeNull()
    expect(serving?.total).toBe(0)
  })
})
