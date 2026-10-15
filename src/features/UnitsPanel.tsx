import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextInput } from '../components/ui/TextInput'
import { DEFAULT_UNITS, useStore } from '../store'

export function UnitsPanel() {
  const customUnits = useStore((s) => s.customUnits)
  const { addUnit, removeUnit } = useStore.getState()
  const [draft, setDraft] = useState('')

  const submit = () => {
    const unit = draft.trim()
    if (unit) addUnit(unit)
    setDraft('')
  }

  return (
    <Card title="Units">
      <p className="mb-4 text-sm text-ink-muted">
        Units are labels only and are not converted. Use the same unit for an item and the recipes that use it.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_UNITS.map((u) => (
          <span key={u} className="rounded-md bg-canvas px-2 py-1 text-sm">
            {u}
          </span>
        ))}
        {customUnits.map((u) => (
          <span key={u} className="inline-flex items-center gap-1 rounded-md bg-accent-soft py-1 pl-2 pr-1 text-sm text-accent-strong">
            {u}
            <button
              type="button"
              aria-label={`Remove ${u}`}
              onClick={() => removeUnit(u)}
              className="rounded px-1 transition-colors duration-150 hover-fine:bg-accent/15"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-4 flex max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <TextInput aria-label="Custom unit" placeholder="Custom unit, like sachet" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" intent="secondary" disabled={!draft.trim()}>
          Add
        </Button>
      </form>
    </Card>
  )
}
