import { readFileSync, writeFileSync } from 'node:fs'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { Item, Recipe } from '../store'
import { buildWorkbook, type ExportData, exportProblems, LIMITS, patchCells } from './exportXlsx'

const template = new Uint8Array(readFileSync(new URL('../assets/sbfcc-template.xlsx', import.meta.url)))

const item = (id: string, name: string, packagePrice: number, qtyPerPack: number, shippingFee: number, unit: string): Item =>
  ({ id, name, supplier: 'Supplier & Co', packagePrice, qtyPerPack, shippingFee, unit })

const recipe = (patch: Partial<Recipe>): Recipe => ({
  id: 'r1', name: 'Iced Americano', includeVat: true, vatRate: 0.12, servings: 1, discountRate: 0.2,
  includeWastage: true, wastageRate: 0.05, ingredients: [], packaging: [], fixedMarkup: null,
  markupRate: 1, marginRate: null, manualPrice: 100, pricingMethod: 'manual', ordersPerMonth: 650, ...patch,
})

const data: ExportData = {
  customUnits: ['sachet'],
  ingredients: [item('beans', 'Espresso Coffee Beans', 900, 1000, 80, 'g'), item('dup', 'espresso coffee beans', 500, 500, 0, 'sachet')],
  packaging: [item('cup', '16 oz PET Cup', 220, 50, 40, 'piece')],
  expenses: [{ id: 'e1', name: 'Rent', amount: 25000 }, { id: 'e2', name: 'Salaries <staff>', amount: 45000 }],
  contingencyRate: 0.05,
  recipes: [
    recipe({
      ingredients: [{ id: 'l1', itemId: 'beans', qty: 18 }, { id: 'l2', itemId: 'gone', qty: 3 }, { id: 'l3', itemId: 'dup', qty: 1 }],
      packaging: [{ id: 'l4', itemId: 'cup', qty: 1 }],
    }),
    recipe({ id: 'r2', name: "Kid's Choco: Large [Promo]", includeVat: false, pricingMethod: 'markup', ordersPerMonth: null }),
    recipe({ id: 'r3', name: 'Summary' }),
  ],
}

function cell(xml: string, ref: string) {
  const m = new RegExp(`<c r="${ref}"[^>]*?(?:/>|>([\\s\\S]*?)</c>)`).exec(xml)
  if (!m) return undefined
  const body = m[1] ?? ''
  return /<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1] ?? /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1] ?? /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? ''
}

describe('xlsx export', () => {
  const out = unzipSync(buildWorkbook(template, data))
  const read = (p: string) => strFromU8(out[p])
  writeFileSync('/tmp/sbfcc-export-test.xlsx', buildWorkbook(template, data))

  it('fills ingredients, packaging, and custom units', () => {
    const ing = read('xl/worksheets/sheet2.xml')
    expect([cell(ing, 'B4'), cell(ing, 'C4'), cell(ing, 'D4'), cell(ing, 'E4'), cell(ing, 'F4'), cell(ing, 'G4')]).toEqual([
      'Espresso Coffee Beans', 'Supplier &amp; Co', '900', '1000', '80', 'g',
    ])
    expect(cell(ing, 'B5')).toBe('espresso coffee beans (2)') // MATCH ignores case, so names must differ
    expect(ing).toContain('<c r="H4" s="') // unit cost formula untouched
    expect(cell(ing, 'H4')).toBe('IF(E4=&quot;&quot;,&quot;&quot;,(D4+F4)/E4)')
    expect(cell(read('xl/worksheets/sheet3.xml'), 'B4')).toBe('16 oz PET Cup')
    expect(cell(read('xl/worksheets/sheet1.xml'), 'B29')).toBe('sachet')
  })

  it('fills OPEX and sets contingency from the app', () => {
    const opex = read('xl/worksheets/sheet4.xml')
    expect(cell(opex, 'B5')).toBe('Salaries &lt;staff&gt;')
    expect(cell(opex, 'C5')).toBe('45000')
    expect(cell(opex, 'B6')).toBe('') // template sample name cleared
    expect(cell(opex, 'C24')).toBe('SUM(C4:C22)*0.05')
    expect(cell(opex, 'B24')).toBe('CONTINGENCY (5%)')
  })

  it('adds one recipe tab per recipe with safe, unique names', () => {
    const wb = read('xl/workbook.xml')
    expect(wb).toContain('name="Blank Recipe DUPLICATE THIS"')
    expect(wb).toContain('name="Iced Americano"')
    expect(wb).toContain('name="Kids Choco Large Promo"')
    expect(wb).toContain('name="Summary (2)"')
    expect(wb).toContain('<calcPr fullCalcOnLoad="1"/>')
    expect(read('[Content_Types].xml')).toContain('/xl/worksheets/sheet9.xml')
    expect(read('xl/_rels/workbook.xml.rels')).toContain('Target="worksheets/sheet9.xml"')
  })

  it('fills recipe settings, pricing inputs, and lines', () => {
    const r = read('xl/worksheets/sheet7.xml')
    expect(cell(r, 'B4')).toBe('Iced Americano')
    expect(r).toMatch(/<c r="G18" s="\d+" t="b"><v>1<\/v><\/c>/)
    expect([cell(r, 'G19'), cell(r, 'G20'), cell(r, 'G22'), cell(r, 'AG6'), cell(r, 'AB11'), cell(r, 'AX11')]).toEqual(['0.12', '1', '0.2', '0.05', '1', '100'])
    expect([cell(r, 'B27'), cell(r, 'G27'), cell(r, 'B28'), cell(r, 'G28')]).toEqual(['Espresso Coffee Beans', '18', 'espresso coffee beans (2)', '1'])
    expect(cell(r, 'B29')).toBe('') // the deleted item's line is skipped
    expect([cell(r, 'W27'), cell(r, 'AB27')]).toEqual(['16 oz PET Cup', '1'])
    expect(cell(r, 'V7')).toBe('V5+V6') // cost formulas untouched
    expect(r).not.toContain('<drawing')
    expect(read('xl/worksheets/sheet8.xml')).toMatch(/<c r="G18" s="\d+" t="b"><v>0<\/v><\/c>/)
  })

  it('lists every recipe in Summary and widens its totals', () => {
    const s = read('xl/worksheets/sheet5.xml')
    expect([cell(s, 'B5'), cell(s, 'C5'), cell(s, 'G5')]).toEqual(['Iced Americano', 'Manual', '650'])
    expect([cell(s, 'B6'), cell(s, 'C6'), cell(s, 'G6')]).toEqual(['Kids Choco Large Promo', 'Markup %', ''])
    expect(cell(s, 'B7')).toBe('Summary (2)')
    expect(cell(s, 'T8')).toBe('IFERROR(SUM(H5:H498),&quot;&quot;)')
    expect(cell(s, 'T12')).toBe('-IFERROR(SUMPRODUCT(E5:E498,G5:G498),&quot;&quot;)')
    expect(cell(s, 'D5')).toContain('INDIRECT') // lookup formulas untouched
  })

  it('keeps every formula in the template', () => {
    const tpl = unzipSync(template)
    const count = (xml: string) => (xml.match(/<f[ >]/g) ?? []).length
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const p = `xl/worksheets/sheet${n}.xml`
      expect(count(read(p)), p).toBe(count(strFromU8(tpl[p])))
    }
    expect(count(read('xl/worksheets/sheet7.xml'))).toBe(count(strFromU8(tpl['xl/worksheets/sheet6.xml'])))
  })

  it('refuses data that does not fit the sheet', () => {
    const many = { ...data, expenses: Array.from({ length: LIMITS.expenses + 1 }, (_, i) => ({ id: `${i}`, name: 'x', amount: 1 })) }
    expect(exportProblems(many)).toEqual(['20 expenses, but the sheet holds 19.'])
    expect(() => buildWorkbook(template, many)).toThrow()
  })

  it('fails loudly if a target cell is missing', () => {
    expect(() => patchCells('<c r="A1"/>', new Map([['B2', 1]]))).toThrow(/missing cells: B2/)
  })

  it('fills the last row of every input area', () => {
    const items = Array.from({ length: LIMITS.items }, (_, i) => item(`i${i}`, `Item ${i}`, 1, 1, 0, 'g'))
    const lines = Array.from({ length: LIMITS.lines }, (_, i) => ({ id: `l${i}`, itemId: `i${i}`, qty: 1 }))
    const big: ExportData = {
      customUnits: Array.from({ length: LIMITS.customUnits }, (_, i) => `u${i}`),
      ingredients: items,
      packaging: items,
      expenses: Array.from({ length: LIMITS.expenses }, (_, i) => ({ id: `e${i}`, name: `E${i}`, amount: 1 })),
      contingencyRate: 0.1,
      recipes: [recipe({ ingredients: lines, packaging: lines })],
    }
    expect(() => buildWorkbook(template, big)).not.toThrow()
  })
})
