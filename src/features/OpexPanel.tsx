import clsx from 'clsx'
import { Button } from '../components/ui/Button'
import { Card, IconButton, Row, TrashIcon } from '../components/ui/Card'
import { NumberInput } from '../components/ui/NumberInput'
import { TextInput } from '../components/ui/TextInput'
import { money } from '../lib/format'
import { withUndo } from '../lib/undo'
import { useOpexTotals } from '../lib/useOpexTotals'
import { useNav } from '../nav'
import { useStore } from '../store'

export function OpexPanel() {
  const expenses = useStore((s) => s.expenses)
  const contingencyRate = useStore((s) => s.contingencyRate)
  const { updateExpense, removeExpense, setContingencyRate } = useStore.getState()
  const justAdded = useNav((s) => s.justAdded)
  const markAdded = useNav((s) => s.markAdded)
  const addExpense = () => markAdded(useStore.getState().addExpense())
  const totals = useOpexTotals()

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card
        title="Operating expenses"
        action={
          <Button size="sm" onClick={addExpense}>
            Add expense
          </Button>
        }
      >
        <p className="mb-4 text-sm text-ink-muted">Monthly costs of running the business. For yearly costs, enter the amount divided by 12.</p>
        <ul className="divide-y divide-line">
          {expenses.map((e) => (
            <li key={e.id} className={clsx('flex items-center gap-2 py-1.5', e.id === justAdded && 'enter')}>
              <TextInput aria-label="Expense" value={e.name} placeholder="Expense" autoFocus={e.id === justAdded} onChange={(ev) => updateExpense(e.id, { name: ev.target.value })} />
              <NumberInput aria-label="Amount per month" prefix="₱" className="w-32 shrink-0 sm:w-40" value={e.amount} onChange={(v) => updateExpense(e.id, { amount: v })} />
              <IconButton label={`Delete ${e.name || 'expense'}`} onClick={() => withUndo(`Deleted ${e.name || 'expense'}`, () => removeExpense(e.id))}>
                <TrashIcon />
              </IconButton>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Monthly total" className="self-start lg:sticky lg:top-28">
        <Row label="Total monthly OPEX" value={money(totals.total)} />
        <div className="flex items-center justify-between gap-3 py-1 text-sm">
          <span className="text-ink-muted">Contingency</span>
          <NumberInput aria-label="Contingency percent" suffix="%" scale={100} className="w-24" value={contingencyRate} onChange={(v) => setContingencyRate(v ?? 0)} />
        </div>
        <Row label="Contingency amount" value={money(totals.contingency)} indent />
        <div className="mt-2 border-t border-line pt-2">
          <Row label="Estimated monthly OPEX" value={money(totals.estimated)} strong />
        </div>
      </Card>
    </div>
  )
}
