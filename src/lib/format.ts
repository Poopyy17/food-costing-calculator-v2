const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const pesoPrecise = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 3, maximumFractionDigits: 3 })
const pctShort = new Intl.NumberFormat('en-PH', { style: 'percent', maximumFractionDigits: 2 })
const pct = new Intl.NumberFormat('en-PH', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const blank = '—'

export const toneOf = (n: number | null | undefined) => (n == null ? undefined : n < 0 ? 'loss' : 'profit')

export const money = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? blank : peso.format(n))
/** Unit costs show three decimals, like the sheet. */
export const unitMoney = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? blank : pesoPrecise.format(n))
/** For labels and settings echoes: 12%, 5%, 12.5%. */
export const percentShort = (n: number) => pctShort.format(n)
export const percent = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? blank : pct.format(n))
