import { describe, expect, it } from 'vitest'
import {
  monthlyProjection,
  opexTotals,
  priceFixedMarkup,
  priceManual,
  priceMargin,
  priceMarkup,
  servingCost,
  unitCost,
} from './calc'

// Expected values come from the SBFCC v3.0 guide's screenshots.
const vatOn = { includeVat: true, vatRate: 0.12, discountRate: 0.2 }
const vatOff = { ...vatOn, includeVat: false }

describe('unit cost', () => {
  it('adds shipping and divides by qty per pack', () => {
    expect(unitCost(900, 80, 1000)).toBeCloseTo(0.98)
    expect(unitCost(95, 20, 20)).toBeCloseTo(5.75)
  })
  it('is blank without a qty per pack', () => {
    expect(unitCost(900, 80, null)).toBeNull()
    expect(unitCost(900, 80, 0)).toBeNull()
  })
})

describe('serving cost', () => {
  it('divides by servings', () => {
    const c = servingCost({ ingredientsTotal: 500, packagingTotal: 0, servings: 10, includeWastage: false, wastageRate: 0.05 })
    expect(c?.total).toBe(50)
  })
  it('applies wastage as cost ÷ (1 − w), to ingredients and packaging', () => {
    const c = servingCost({ ingredientsTotal: 100, packagingTotal: 10, servings: 1, includeWastage: true, wastageRate: 0.05 })
    expect(c?.ingredients).toBeCloseTo(105.2632, 4)
    expect(c?.packaging).toBeCloseTo(10.5263, 4)
  })
})

describe('pricing methods', () => {
  it('fixed markup: ₱40 + ₱60', () => {
    const p = priceFixedMarkup(40, 60, vatOn)
    expect(p).toMatchObject({ priceBeforeVat: 100, profit: 60, discountedPrice: 80, profitAfterDiscount: 40 })
    expect(p.vat).toBeCloseTo(12)
    expect(p.sellingPrice).toBeCloseTo(112)
    expect(p.discountAmount).toBeCloseTo(20)
  })
  it('markup %: ₱50 at 100%', () => {
    const p = priceMarkup(50, 1, vatOn)
    expect(p.sellingPrice).toBeCloseTo(112)
    expect(p.profit).toBeCloseTo(50)
    expect(p.profitAfterDiscount).toBeCloseTo(30)
  })
  it('margin %: ₱35 at 65%', () => {
    const p = priceMargin(35, 0.65, vatOn)!
    expect(p.priceBeforeVat).toBeCloseTo(100)
    expect(p.profit).toBeCloseTo(65)
    expect(p.profitAfterDiscount).toBeCloseTo(45)
  })
  it('margin of 100% or more has no price', () => {
    expect(priceMargin(35, 1, vatOn)).toBeNull()
  })
  it('manual: ₱100 VAT-inclusive on ₱31.16 cost', () => {
    const p = priceManual(31.16, 100, vatOn)
    expect(p.priceBeforeVat).toBeCloseTo(89.29, 2)
    expect(p.vat).toBeCloseTo(10.71, 2)
    expect(p.profit).toBeCloseTo(58.13, 2)
    expect(p.impliedMargin).toBeCloseTo(0.651, 3)
    expect(p.impliedMarkup).toBeCloseTo(1.8654, 4)
    expect(p.discountAmount).toBeCloseTo(17.86, 2)
    expect(p.discountedPrice).toBeCloseTo(71.43, 2)
    expect(p.profitAfterDiscount).toBeCloseTo(40.27, 2)
  })
  it('manual without VAT keeps the full price', () => {
    const p = priceManual(90.65, 150, vatOff)
    expect(p.vat).toBe(0)
    expect(p.profit).toBeCloseTo(59.35)
  })
})

describe('OPEX', () => {
  it('adds contingency', () => {
    expect(opexTotals([98000], 0.05).estimated).toBeCloseTo(102900)
    expect(opexTotals([98000], 0.1).estimated).toBeCloseTo(107800)
  })
})

describe('monthly projection', () => {
  it('matches the guide summary example', () => {
    const row = (price: number, cost: number, orders: number, vat: boolean) => {
      const p = priceManual(cost, price, vat ? vatOn : vatOff)
      return { sellingPrice: price, costPerOrder: cost, profitPerOrder: p.profit, vatPerOrder: p.vat, ordersPerMonth: orders }
    }
    const m = monthlyProjection(
      [row(100, 31.16, 650, true), row(120, 53.62, 950, true), row(150, 90.65, 600, false)],
      107800,
    )
    expect(m.grossSales).toBeCloseTo(269000)
    expect(m.vat).toBeCloseTo(19178.57, 2)
    expect(m.netSales).toBeCloseTo(249821.43, 2)
    // The guide's COGS (125,585.61) uses unrounded costs; rounded inputs land within a few pesos.
    expect(Math.abs(m.cogs - 125585.61)).toBeLessThan(5)
    expect(m.netProfitMargin).toBeCloseTo(0.0658, 3)
  })
})
