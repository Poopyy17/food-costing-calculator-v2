import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PricingMethod } from './lib/calc'

export type ItemKind = 'ingredients' | 'packaging'

export type Item = {
  id: string
  name: string
  supplier: string
  packagePrice: number | null
  qtyPerPack: number | null
  shippingFee: number | null
  unit: string
}

export type Line = { id: string; itemId: string; qty: number | null }

export type Recipe = {
  id: string
  name: string
  includeVat: boolean
  vatRate: number
  servings: number | null
  discountRate: number
  includeWastage: boolean
  wastageRate: number
  ingredients: Line[]
  packaging: Line[]
  fixedMarkup: number | null
  markupRate: number | null
  marginRate: number | null
  manualPrice: number | null
  pricingMethod: PricingMethod
  ordersPerMonth: number | null
}

export type Expense = { id: string; name: string; amount: number | null }

export const DEFAULT_UNITS = [
  'g', 'kg', 'oz', 'lbs', 'mg', 'mL', 'L', 'fl oz', 'tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon',
  'unit', 'dozen', 'pack', 'bottle', 'can', 'box', 'jar', 'bag', 'piece', 'tray', 'slice',
]

const DEFAULT_EXPENSES = [
  'Rent', 'Salaries (staff)', 'Electricity', 'Water', 'Internet/Phone', 'POS / Software', 'Cleaning Supplies',
  'LPG / Cooking Fuel', 'Permits & Licenses, Monthly Allocation', 'Repairs & Maintenance', 'Marketing / Ads',
  'Miscellaneous Expenses',
]

export const newId = () => crypto.randomUUID()

export const blankItem = (): Item => ({
  id: newId(), name: '', supplier: '', packagePrice: null, qtyPerPack: null, shippingFee: null, unit: '',
})

const blankRecipe = (name: string): Recipe => ({
  id: newId(),
  name,
  includeVat: true,
  vatRate: 0.12,
  servings: 1,
  discountRate: 0.2,
  includeWastage: true,
  wastageRate: 0.05,
  ingredients: [],
  packaging: [],
  fixedMarkup: null,
  markupRate: null,
  marginRate: null,
  manualPrice: null,
  pricingMethod: 'manual',
  ordersPerMonth: null,
})

type Data = {
  customUnits: string[]
  ingredients: Item[]
  packaging: Item[]
  expenses: Expense[]
  contingencyRate: number
  recipes: Recipe[]
}

type Actions = {
  addUnit: (unit: string) => void
  removeUnit: (unit: string) => void
  addItem: (kind: ItemKind) => string
  updateItem: (kind: ItemKind, id: string, patch: Partial<Item>) => void
  removeItem: (kind: ItemKind, id: string) => void
  addExpense: () => string
  updateExpense: (id: string, patch: Partial<Expense>) => void
  removeExpense: (id: string) => void
  setContingencyRate: (rate: number) => void
  addRecipe: () => string
  duplicateRecipe: (id: string) => string | undefined
  updateRecipe: (id: string, patch: Partial<Recipe>) => void
  removeRecipe: (id: string) => void
  restore: (data: Data) => void
  loadSample: () => void
}

export type State = Data & Actions

const initialData = (): Data => ({
  customUnits: [],
  ingredients: [],
  packaging: [],
  expenses: DEFAULT_EXPENSES.map((name) => ({ id: newId(), name, amount: null })),
  contingencyRate: 0.05,
  recipes: [],
})

export const snapshot = (s: State): Data => ({
  customUnits: s.customUnits,
  ingredients: s.ingredients,
  packaging: s.packaging,
  expenses: s.expenses,
  contingencyRate: s.contingencyRate,
  recipes: s.recipes,
})

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialData(),

      addUnit: (unit) =>
        set((s) => (DEFAULT_UNITS.includes(unit) || s.customUnits.includes(unit) ? s : { customUnits: [...s.customUnits, unit] })),
      removeUnit: (unit) => set((s) => ({ customUnits: s.customUnits.filter((u) => u !== unit) })),

      addItem: (kind) => {
        const item = blankItem()
        set((s) => ({ [kind]: [...s[kind], item] }))
        return item.id
      },
      updateItem: (kind, id, patch) =>
        set((s) => ({ [kind]: s[kind].map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeItem: (kind, id) => set((s) => ({ [kind]: s[kind].filter((i) => i.id !== id) })),

      addExpense: () => {
        const id = newId()
        set((s) => ({ expenses: [...s.expenses, { id, name: '', amount: null }] }))
        return id
      },
      updateExpense: (id, patch) =>
        set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      setContingencyRate: (contingencyRate) => set({ contingencyRate }),

      addRecipe: () => {
        const recipe = blankRecipe(`Recipe ${get().recipes.length + 1}`)
        set((s) => ({ recipes: [...s.recipes, recipe] }))
        return recipe.id
      },
      duplicateRecipe: (id) => {
        const src = get().recipes.find((r) => r.id === id)
        if (!src) return
        const copy: Recipe = {
          ...src,
          id: newId(),
          name: `${src.name} (copy)`,
          ingredients: src.ingredients.map((l) => ({ ...l, id: newId() })),
          packaging: src.packaging.map((l) => ({ ...l, id: newId() })),
        }
        set((s) => ({ recipes: [...s.recipes, copy] }))
        return copy.id
      },
      updateRecipe: (id, patch) =>
        set((s) => ({ recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      removeRecipe: (id) => set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      restore: (data) => set(data),

      // Ingredients, packaging, and OPEX from the guide's screenshots, for trying the app out.
      loadSample: () => {
        const item = (name: string, supplier: string, packagePrice: number, qtyPerPack: number, shippingFee: number, unit: string): Item =>
          ({ id: newId(), name, supplier, packagePrice, qtyPerPack, shippingFee, unit })
        const amounts = [25000, 45000, 12000, 2000, 1500, 1000, 2500, 1500, 1000, 1500, 3000, 2000]
        set({
          ingredients: [
            item('Espresso Coffee Beans', 'Sample Coffee Supplier', 900, 1000, 80, 'g'),
            item('Fresh Milk', 'Local Grocery Supplier', 105, 1000, 20, 'mL'),
            item('Vanilla Syrup', 'Beverage Supplier', 420, 750, 60, 'mL'),
            item('Chocolate Sauce', 'Beverage Supplier', 350, 1000, 60, 'mL'),
            item('Matcha Powder', 'Beverage Supplier', 650, 500, 80, 'g'),
            item('White Sugar', 'Grocery Supplier', 90, 1000, 20, 'g'),
            item('Bread Loaf', 'Bakery Supplier', 95, 20, 20, 'slice'),
          ],
          packaging: [
            item('16 oz PET Cup', 'Packaging Supplier', 220, 50, 40, 'piece'),
            item('16 oz Flat Lid', 'Packaging Supplier', 120, 50, 30, 'piece'),
            item('Paper Straw', 'Packaging Supplier', 95, 100, 25, 'piece'),
            item('12 oz Paper Hot Cup', 'Packaging Supplier', 180, 50, 40, 'piece'),
            item('12 oz Hot Cup Lid', 'Packaging Supplier', 130, 50, 30, 'piece'),
            item('Paper Food Box', 'Packaging Supplier', 250, 50, 40, 'piece'),
            item('Paper Napkin', 'Packaging Supplier', 120, 200, 20, 'piece'),
            item('Paper Bag', 'Packaging Supplier', 180, 100, 30, 'piece'),
          ],
          expenses: DEFAULT_EXPENSES.map((name, i) => ({ id: newId(), name, amount: amounts[i] })),
        })
      },
    }),
    { name: 'food-costing-calculator', version: 1 },
  ),
)
