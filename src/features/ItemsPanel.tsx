import clsx from 'clsx'
import { Button } from '../components/ui/Button'
import { Card, IconButton, TrashIcon } from '../components/ui/Card'
import { NumberInput } from '../components/ui/NumberInput'
import { Select, TextInput } from '../components/ui/TextInput'
import { unitMoney } from '../lib/format'
import { itemUnitCost } from '../lib/recipe'
import { withUndo } from '../lib/undo'
import { useNav } from '../nav'
import { DEFAULT_UNITS, type ItemKind, useStore } from '../store'

const copy: Record<ItemKind, { title: string; noun: string; help: string }> = {
  ingredients: {
    title: 'Ingredients',
    noun: 'ingredient',
    help: 'Your master ingredient list. Enter Qty per pack in the same unit your recipes use (2 kg of beans → 2000 g).',
  },
  packaging: {
    title: 'Packaging & other items',
    noun: 'item',
    help: 'Cups, lids, boxes, and anything used to sell the product that is not part of the recipe.',
  },
}

export function ItemsPanel({ kind }: { kind: ItemKind }) {
  const items = useStore((s) => s[kind])
  const customUnits = useStore((s) => s.customUnits)
  const recipes = useStore((s) => s.recipes)
  const { updateItem, removeItem, loadSample } = useStore.getState()
  const justAdded = useNav((s) => s.justAdded)
  const markAdded = useNav((s) => s.markAdded)
  const addItem = (k: ItemKind) => markAdded(useStore.getState().addItem(k))
  const units = [...DEFAULT_UNITS, ...customUnits]
  const { title, noun, help } = copy[kind]

  const usedIn = (id: string) => recipes.filter((r) => r[kind].some((l) => l.itemId === id)).length

  return (
    <Card
      title={title}
      action={
        <Button size="sm" onClick={() => addItem(kind)}>
          Add {noun}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-ink-muted">{help}</p>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line py-10 text-center text-sm text-ink-muted">
          <p>No {noun}s yet.</p>
          <div className="flex gap-2">
            <Button size="sm" intent="secondary" onClick={() => addItem(kind)}>
              Add your first {noun}
            </Button>
            <Button size="sm" intent="ghost" onClick={loadSample}>
              Load sample data
            </Button>
          </div>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                <th className="pb-2 pr-2 font-medium">{kind === 'ingredients' ? 'Ingredient' : 'Item'}</th>
                <th className="pb-2 pr-2 font-medium">Supplier</th>
                <th className="w-32 pb-2 pr-2 text-right font-medium">Package price</th>
                <th className="w-28 pb-2 pr-2 text-right font-medium">Qty per pack</th>
                <th className="w-28 pb-2 pr-2 text-right font-medium">Shipping fee</th>
                <th className="w-28 pb-2 pr-2 font-medium">Unit</th>
                <th className="w-28 pb-2 pr-2 text-right font-medium">Unit cost</th>
                <th className="w-8 pb-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={clsx('border-t border-line', item.id === justAdded && 'enter')}>
                  <td className="py-1.5 pr-2">
                    <TextInput aria-label="Name" value={item.name} placeholder="Name" autoFocus={item.id === justAdded} onChange={(e) => updateItem(kind, item.id, { name: e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <TextInput aria-label="Supplier" value={item.supplier} placeholder="Supplier" onChange={(e) => updateItem(kind, item.id, { supplier: e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <NumberInput aria-label="Package price" prefix="₱" value={item.packagePrice} onChange={(v) => updateItem(kind, item.id, { packagePrice: v })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <NumberInput aria-label="Qty per pack" value={item.qtyPerPack} onChange={(v) => updateItem(kind, item.id, { qtyPerPack: v })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <NumberInput aria-label="Shipping fee" prefix="₱" value={item.shippingFee} onChange={(v) => updateItem(kind, item.id, { shippingFee: v })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Select aria-label="Unit" value={item.unit} onChange={(e) => updateItem(kind, item.id, { unit: e.target.value })}>
                      <option value="">—</option>
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="tabular py-1.5 pr-2 text-right">
                    {item.qtyPerPack ? unitMoney(itemUnitCost(item)) : <span className="text-xs text-ink-muted">Needs qty</span>}
                  </td>
                  <td className="py-1.5">
                    <IconButton
                      label={`Delete ${item.name || noun}`}
                      onClick={() => {
                        const n = usedIn(item.id)
                        withUndo(
                          n ? `Deleted ${item.name || noun}. It was used in ${n} recipe${n > 1 ? 's' : ''}.` : `Deleted ${item.name || noun}`,
                          () => removeItem(kind, item.id),
                        )
                      }}
                    >
                      <TrashIcon />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
