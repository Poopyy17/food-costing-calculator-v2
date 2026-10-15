import { Combobox } from '@base-ui/react/combobox'
import { unitMoney } from '../lib/format'
import { itemUnitCost } from '../lib/recipe'
import type { Item } from '../store'

type Props = {
  items: Item[]
  value: Item | null
  onChange: (item: Item) => void
  placeholder: string
  label: string
  autoFocus?: boolean
}

/** Searchable picker for recipe lines. Shows supplier and unit cost so same-named items can be told apart. */
export function ItemPicker({ items, value, onChange, placeholder, label, autoFocus }: Props) {
  return (
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={(item) => item && onChange(item)}
      itemToStringLabel={(i: Item) => i.name || 'Untitled'}
      isItemEqualToValue={(a: Item, b: Item) => a.id === b.id}
    >
      <Combobox.InputGroup className="relative flex h-9 w-full min-w-0 items-center rounded-md border border-line bg-surface text-sm transition-colors duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <Combobox.Input
          aria-label={label}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-full w-full min-w-0 truncate bg-transparent pr-8 pl-2.5 outline-none placeholder:text-ink-muted/80"
        />
        <Combobox.Trigger aria-label={`Show all ${label}s`} className="absolute right-0 flex h-full w-8 items-center justify-center text-ink-muted">
          <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M12 6H4l4 4.5z" />
          </svg>
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
          <Combobox.Popup className="w-(--anchor-width) min-w-64 max-w-(--available-width) origin-(--transform-origin) rounded-lg border border-line bg-surface shadow-lg shadow-black/10 transition-[scale,opacity] duration-150 ease-(--ease-out) data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
            <Combobox.Empty>
              <div className="px-3 py-3 text-sm text-ink-muted">No matches. Add it in its tab first.</div>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(20rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-0 data-empty:p-0">
              {(item: Item) => (
                <Combobox.Item
                  key={item.id}
                  value={item}
                  className="flex cursor-default items-baseline gap-3 rounded-md px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent-soft"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.name || 'Untitled'}</span>
                    {item.supplier && <span className="block truncate text-xs text-ink-muted">{item.supplier}</span>}
                  </span>
                  <span className="tabular shrink-0 text-xs text-ink-muted">
                    {unitMoney(itemUnitCost(item))}
                    {item.unit && ` / ${item.unit}`}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
