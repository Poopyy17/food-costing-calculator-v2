// Fills the original SBFCC v3.0 workbook with the app's data by editing its XML in place.
// Only input cells change; every formula, style, dropdown, and checkbox stays as the sheet author made it.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { PricingMethod } from './calc'
import type { Expense, Item, Recipe } from '../store'

export type ExportData = {
  customUnits: string[]
  ingredients: Item[]
  packaging: Item[]
  expenses: Expense[]
  contingencyRate: number
  recipes: Recipe[]
}

type Value = string | number | boolean | null | { formula: string }
type Edits = Map<string, Value>

// Fixed input areas of the template (see the guide and the sheet's own data validation ranges).
const SHEETS = {
  units: 'xl/worksheets/sheet1.xml',
  ingredients: 'xl/worksheets/sheet2.xml',
  packaging: 'xl/worksheets/sheet3.xml',
  opex: 'xl/worksheets/sheet4.xml',
  summary: 'xl/worksheets/sheet5.xml',
  recipe: 'xl/worksheets/sheet6.xml',
}
export const LIMITS = {
  customUnits: 35, // Units!B29:B63
  items: 999, // rows 4–1002
  expenses: 19, // OPEX!B4:C22
  recipes: 494, // Summary rows 5–498
  lines: 266, // recipe rows 27–292
}
const METHOD_NAMES: Record<PricingMethod, string> = {
  fixed: 'Fixed Markup',
  markup: 'Markup %',
  margin: 'Margin %',
  manual: 'Manual',
}

/** Problems that would make the export incomplete. Empty when the data fits the template. */
export function exportProblems(d: ExportData): string[] {
  const p: string[] = []
  const over = (n: number, max: number, what: string) => n > max && p.push(`${n} ${what}, but the sheet holds ${max}.`)
  over(d.customUnits.length, LIMITS.customUnits, 'custom units')
  over(d.ingredients.length, LIMITS.items, 'ingredients')
  over(d.packaging.length, LIMITS.items, 'packaging items')
  over(d.expenses.length, LIMITS.expenses, 'expenses')
  over(d.recipes.length, LIMITS.recipes, 'recipes')
  for (const r of d.recipes) {
    over(r.ingredients.length, LIMITS.lines, `ingredient lines in ${r.name || 'a recipe'}`)
    over(r.packaging.length, LIMITS.lines, `packaging lines in ${r.name || 'a recipe'}`)
  }
  return p
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function cellXml(ref: string, style: string, v: Value) {
  const s = style ? ` s="${style}"` : ''
  if (v === null || v === '') return `<c r="${ref}"${s}/>`
  if (typeof v === 'boolean') return `<c r="${ref}"${s} t="b"><v>${v ? 1 : 0}</v></c>`
  if (typeof v === 'number') return `<c r="${ref}"${s}><v>${v}</v></c>`
  if (typeof v === 'string') return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
  return `<c r="${ref}"${s}><f>${esc(v.formula)}</f></c>`
}

/** Rewrites existing cells in one pass. Every edited cell must already exist in the template. */
export function patchCells(xml: string, edits: Edits): string {
  const done = new Set<string>()
  const out = xml.replace(/<c r="([A-Z]+\d+)"([^>]*?)(\/>|>[\s\S]*?<\/c>)/g, (whole, ref: string, attrs: string) => {
    if (!edits.has(ref)) return whole
    done.add(ref)
    const style = /\ss="(\d+)"/.exec(attrs)?.[1] ?? ''
    return cellXml(ref, style, edits.get(ref)!)
  })
  const missing = [...edits.keys()].filter((r) => !done.has(r))
  if (missing.length) throw new Error(`Template is missing cells: ${missing.slice(0, 5).join(', ')}`)
  return out
}

/** Names the sheet can look up with MATCH: non-empty and unique (MATCH ignores case). */
function exportNames(items: Item[], fallback: string) {
  const seen = new Set<string>()
  const names = new Map<string, string>()
  items.forEach((item, i) => {
    const base = item.name.trim() || `${fallback} ${i + 1}`
    let name = base
    for (let n = 2; seen.has(name.toLowerCase()); n++) name = `${base} (${n})`
    seen.add(name.toLowerCase())
    names.set(item.id, name)
  })
  return names
}

/** Excel tab names: ≤31 chars, none of []:*?/\ , no apostrophes (Summary's INDIRECT quotes names), unique. */
function tabNames(recipes: Recipe[]) {
  const taken = new Set(['units', 'ingredients', 'other', 'opex', 'summary', 'blank recipe duplicate this'])
  return recipes.map((r, i) => {
    const cleaned = r.name.replace(/'/g, '').replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim()
    const base = (cleaned || `Recipe ${i + 1}`).slice(0, 31).trim()
    let name = base
    for (let n = 2; taken.has(name.toLowerCase()); n++) {
      const suffix = ` (${n})`
      name = base.slice(0, 31 - suffix.length).trim() + suffix
    }
    taken.add(name.toLowerCase())
    return name
  })
}

function itemEdits(items: Item[], names: Map<string, string>): Edits {
  const e: Edits = new Map()
  items.forEach((item, i) => {
    const row = 4 + i
    e.set(`B${row}`, names.get(item.id)!)
    e.set(`C${row}`, item.supplier || null)
    e.set(`D${row}`, item.packagePrice)
    e.set(`E${row}`, item.qtyPerPack)
    e.set(`F${row}`, item.shippingFee)
    e.set(`G${row}`, item.unit || null)
  })
  return e
}

function recipeEdits(r: Recipe, ingredientNames: Map<string, string>, packagingNames: Map<string, string>): Edits {
  const e: Edits = new Map<string, Value>([
    ['B4', r.name || null],
    ['G18', r.includeVat],
    ['G19', r.vatRate],
    ['G20', r.servings],
    ['G22', r.discountRate],
    ['AG5', r.includeWastage],
    ['AG6', r.wastageRate],
    ['Q11', r.fixedMarkup],
    ['AB11', r.markupRate],
    ['AM11', r.marginRate],
    ['AX11', r.manualPrice],
  ])
  // Lines whose item was deleted or never chosen have nothing for the sheet to look up.
  const fill = (lines: Recipe['ingredients'], names: Map<string, string>, nameCol: string, qtyCol: string) =>
    lines
      .filter((l) => names.has(l.itemId))
      .forEach((l, i) => {
        e.set(`${nameCol}${27 + i}`, names.get(l.itemId)!)
        e.set(`${qtyCol}${27 + i}`, l.qty)
      })
  fill(r.ingredients, ingredientNames, 'B', 'G')
  fill(r.packaging, packagingNames, 'W', 'AB')
  return e
}

export function buildWorkbook(template: Uint8Array, d: ExportData): Uint8Array {
  const problems = exportProblems(d)
  if (problems.length) throw new Error(problems.join(' '))

  const files = unzipSync(template)
  const read = (path: string) => strFromU8(files[path])
  const write = (path: string, xml: string) => (files[path] = strToU8(xml))

  // Units: custom units go in the grey cells after the built-in list.
  write(SHEETS.units, patchCells(read(SHEETS.units), new Map(d.customUnits.map((u, i) => [`B${29 + i}`, u]))))

  const ingredientNames = exportNames(d.ingredients, 'Ingredient')
  const packagingNames = exportNames(d.packaging, 'Item')
  write(SHEETS.ingredients, patchCells(read(SHEETS.ingredients), itemEdits(d.ingredients, ingredientNames)))
  write(SHEETS.packaging, patchCells(read(SHEETS.packaging), itemEdits(d.packaging, packagingNames)))

  // OPEX: replace the sample expense names, and make contingency match the app's setting.
  const opex: Edits = new Map()
  for (let i = 0; i < LIMITS.expenses; i++) {
    const x = d.expenses[i]
    opex.set(`B${4 + i}`, x ? x.name || null : null)
    opex.set(`C${4 + i}`, x ? x.amount : null)
  }
  const pct = Number((d.contingencyRate * 100).toFixed(4))
  opex.set('B24', `CONTINGENCY (${pct}%)`)
  opex.set('C24', { formula: `SUM(C4:C22)*${d.contingencyRate}` })
  write(SHEETS.opex, patchCells(read(SHEETS.opex), opex))

  // Recipes: one copy of the blank recipe tab per recipe, the way the guide says to duplicate it.
  const tabs = tabNames(d.recipes)
  const blank = read(SHEETS.recipe).replace(/<drawing r:id="[^"]*"\/>/, '') // the drawing is empty; copies have no rels
  let workbook = read('xl/workbook.xml')
  let rels = read('xl/_rels/workbook.xml.rels')
  let types = read('[Content_Types].xml')
  const maxSheetId = Math.max(...[...workbook.matchAll(/sheetId="(\d+)"/g)].map((m) => Number(m[1])))
  const newSheets: string[] = []
  d.recipes.forEach((r, i) => {
    const n = 7 + i
    const path = `xl/worksheets/sheet${n}.xml`
    write(path, patchCells(blank, recipeEdits(r, ingredientNames, packagingNames)))
    newSheets.push(`<sheet state="visible" name="${esc(tabs[i])}" sheetId="${maxSheetId + 1 + i}" r:id="rIdRecipe${n}"/>`)
    rels = rels.replace(
      '</Relationships>',
      `<Relationship Id="rIdRecipe${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/></Relationships>`,
    )
    types = types.replace(
      '</Types>',
      `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" PartName="/${path}"/></Types>`,
    )
  })
  workbook = workbook.replace('</sheets>', newSheets.join('') + '</sheets>')
  // Cached results in the template are stale now; recalculate when the file opens.
  workbook = workbook.replace(/<calcPr\b[^>]*\/>/, '<calcPr fullCalcOnLoad="1"/>')
  write('xl/workbook.xml', workbook)
  write('xl/_rels/workbook.xml.rels', rels)
  write('[Content_Types].xml', types)

  // Summary: list every recipe by tab name. The template's totals stopped at fixed rows
  // (gross sales at 29 recipes, COGS at 94), so widen them to the whole table.
  const summary: Edits = new Map<string, Value>([
    ['T8', { formula: 'IFERROR(SUM(H5:H498),"")' }],
    ['T12', { formula: '-IFERROR(SUMPRODUCT(E5:E498,G5:G498),"")' }],
  ])
  d.recipes.forEach((r, i) => {
    summary.set(`B${5 + i}`, tabs[i])
    summary.set(`C${5 + i}`, METHOD_NAMES[r.pricingMethod])
    summary.set(`G${5 + i}`, r.ordersPerMonth)
  })
  write(SHEETS.summary, patchCells(read(SHEETS.summary), summary))

  return zipSync(files)
}
