import { useStore } from '../store'
import { opexTotals } from './calc'

export function useOpexTotals() {
  const expenses = useStore((s) => s.expenses)
  const rate = useStore((s) => s.contingencyRate)
  return opexTotals(expenses.map((e) => e.amount ?? 0), rate)
}
