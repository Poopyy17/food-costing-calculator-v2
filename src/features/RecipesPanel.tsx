import clsx from 'clsx'
import type { ReactNode } from 'react'
import { ItemPicker } from '../components/ItemPicker'
import { Button } from '../components/ui/Button'
import { Card, IconButton, Row, TrashIcon } from '../components/ui/Card'
import { NumberInput } from '../components/ui/NumberInput'
import { Switch } from '../components/ui/Switch'
import { TextInput } from '../components/ui/TextInput'
import type { PriceBreakdown, PricingMethod } from '../lib/calc'
import { money, percent, percentShort, toneOf, unitMoney } from '../lib/format'
import { type EvaluatedLine, evaluateRecipe, METHOD_LABELS } from '../lib/recipe'
import { withUndo } from '../lib/undo'
import { type Tab, useNav } from '../nav'
import { type ItemKind, type Line, newId, type Recipe, useStore } from '../store'

export function RecipesPanel() {
  const recipes = useStore((s) => s.recipes)
  const recipeId = useNav((s) => s.recipeId)
  const selectRecipe = useNav((s) => s.selectRecipe)
  const selected = recipes.find((r) => r.id === recipeId) ?? recipes[0]
  const create = () => selectRecipe(useStore.getState().addRecipe())

  if (!selected) return <GettingStarted onCreate={create} />

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label="Recipes"
        className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] sm:mx-0 sm:px-0"
      >
        {recipes.map((r) => (
          <button
            key={r.id}
            type="button"
            title={r.name}
            aria-current={r.id === selected.id ? 'page' : undefined}
            onClick={() => selectRecipe(r.id)}
            className={clsx(
              'h-8 max-w-56 shrink-0 truncate rounded-full border px-3 text-sm transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.97]',
              r.id === selected.id ? 'border-accent bg-accent-soft font-medium text-accent-strong' : 'border-line bg-surface hover-fine:bg-canvas',
            )}
          >
            {r.name || 'Untitled'}
          </button>
        ))}
        <Button size="sm" intent="ghost" className="mr-10 shrink-0" onClick={create}>
          + New recipe
        </Button>
      </nav>
      <RecipeEditor key={selected.id} recipe={selected} />
    </div>
  )
}

function GettingStarted({ onCreate }: { onCreate: () => void }) {
  const ingredients = useStore((s) => s.ingredients.length)
  const packaging = useStore((s) => s.packaging.length)
  const opex = useStore((s) => s.expenses.some((e) => (e.amount ?? 0) > 0))
  const { loadSample } = useStore.getState()
  const go = useNav((s) => s.go)
  const steps: { done: boolean; title: string; body: string; tab?: Tab; cta: string }[] = [
    { done: ingredients > 0, title: 'Add your ingredients', body: 'What you buy, the pack price, size, and shipping.', tab: 'ingredients', cta: 'Open Ingredients' },
    { done: packaging > 0, title: 'Add packaging', body: 'Cups, lids, boxes, and other items sold with the product.', tab: 'packaging', cta: 'Open Packaging' },
    { done: opex, title: 'Enter monthly expenses', body: 'Rent, salaries, utilities. Used for the profit projection.', tab: 'opex', cta: 'Open OPEX' },
    { done: false, title: 'Build your first recipe', body: 'Pick ingredients, set quantities, and compare prices.', cta: 'New recipe' },
  ]

  return (
    <Card className="mx-auto max-w-xl">
      <h2 className="text-lg font-semibold tracking-tight">Cost your first product</h2>
      <p className="mt-1 text-sm text-ink-muted">Four steps. You can come back to any of them later.</p>
      <ol className="mt-5 flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <span
              aria-hidden
              className={clsx(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                s.done ? 'bg-accent text-white' : 'border border-line text-ink-muted',
              )}
            >
              {s.done ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={clsx('text-sm font-medium', s.done && 'text-ink-muted line-through decoration-ink-muted/40')}>
                {s.title}
                {s.done && <span className="sr-only"> (done)</span>}
              </p>
              <p className="text-sm text-ink-muted">{s.body}</p>
            </div>
            {!s.done && (
              <Button size="sm" intent={s.tab ? 'secondary' : 'primary'} className="shrink-0" onClick={() => (s.tab ? go(s.tab) : onCreate())}>
                {s.cta}
              </Button>
            )}
          </li>
        ))}
      </ol>
      {ingredients === 0 && packaging === 0 && (
        <p className="mt-5 border-t border-line pt-4 text-sm text-ink-muted">
          Just exploring?{' '}
          <button type="button" className="font-medium text-accent underline-offset-2 hover-fine:underline" onClick={loadSample}>
            Load sample data
          </button>{' '}
          from the guide.
        </p>
      )}
    </Card>
  )
}

function RecipeEditor({ recipe: r }: { recipe: Recipe }) {
  const ingredients = useStore((s) => s.ingredients)
  const packaging = useStore((s) => s.packaging)
  const selectRecipe = useNav((s) => s.selectRecipe)
  const { updateRecipe, duplicateRecipe, removeRecipe } = useStore.getState()
  const update = (patch: Partial<Recipe>) => updateRecipe(r.id, patch)
  const result = evaluateRecipe(r, ingredients, packaging)
  const servings = r.servings ?? 0
  const chosen = result.prices[r.pricingMethod]

  return (
    // Phones: name, result, cost & settings, then lines and pricing. Desktop: the sidebar sits on the right.
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-1 basis-60 flex-col gap-1 text-sm">
            <span className="text-ink-muted">Recipe name</span>
            <TextInput value={r.name} placeholder="Like Iced Americano" onChange={(e) => update({ name: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <Button intent="secondary" onClick={() => selectRecipe(duplicateRecipe(r.id) ?? null)}>
              Duplicate
            </Button>
            <Button
              intent="danger"
              onClick={() =>
                withUndo(`Deleted ${r.name || 'recipe'}`, () => {
                  removeRecipe(r.id)
                  selectRecipe(null)
                })
              }
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <div className="order-last flex min-w-0 flex-col gap-4 lg:order-none">
        <LinesCard
          kind="ingredients"
          title="Ingredients"
          lines={result.ingredientLines}
          onChange={(ingredients) => update({ ingredients })}
          note={servings > 1 ? `Enter amounts for the whole batch of ${servings} servings.` : undefined}
        />
        <LinesCard
          kind="packaging"
          title="Packaging & other items"
          lines={result.packagingLines}
          onChange={(packaging) => update({ packaging })}
          note={servings > 1 ? `Enter packaging for all ${servings} servings, like ${servings} cups.` : undefined}
        />
        <PricingCard recipe={r} prices={result.prices} cost={result.serving?.total} onChange={update} />
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
        <ResultCard method={r.pricingMethod} price={chosen} cost={result.serving?.total} />

        <Card title="Cost">
          {result.batch && (
            <div className="flex justify-end gap-3 pb-1 text-xs font-medium tracking-wide text-ink-muted uppercase">
              <span className="w-24 text-right">Batch</span>
              <span className="w-24 text-right">Serving</span>
            </div>
          )}
          <CostRow label="Ingredients" batch={result.batch?.ingredients} serving={result.serving?.ingredients} />
          <CostRow label="Packaging" batch={result.batch?.packaging} serving={result.serving?.packaging} />
          <div className="mt-1 border-t border-line pt-1">
            <CostRow label="Total cost" batch={result.batch?.total} serving={result.serving?.total} strong />
          </div>
          {r.includeWastage && result.serving && (
            <p className="mt-2 text-xs text-ink-muted">Includes {percentShort(r.wastageRate)} wastage.</p>
          )}
          {!result.serving && <p className="mt-2 text-sm text-danger">Enter at least 1 serving.</p>}
        </Card>

        <Card title="Settings">
          <div className="flex flex-col gap-2">
            <SettingRow label="Number of servings">
              <NumberInput aria-label="Number of servings" className="w-24" value={r.servings} onChange={(servings) => update({ servings })} />
            </SettingRow>
            <div className="my-1 border-t border-line" />
            <Switch label="Include VAT" checked={r.includeVat} onChange={(includeVat) => update({ includeVat })} />
            {r.includeVat && (
              <SettingRow label="VAT %">
                <NumberInput aria-label="VAT percent" suffix="%" scale={100} className="w-24" value={r.vatRate} onChange={(v) => update({ vatRate: v ?? 0 })} />
              </SettingRow>
            )}
            <SettingRow label="PWD/senior discount %">
              <NumberInput aria-label="PWD or senior discount percent" suffix="%" scale={100} className="w-24" value={r.discountRate} onChange={(v) => update({ discountRate: v ?? 0 })} />
            </SettingRow>
            <div className="my-1 border-t border-line" />
            <Switch label="Include wastage" checked={r.includeWastage} onChange={(includeWastage) => update({ includeWastage })} />
            {r.includeWastage && (
              <SettingRow label="Wastage %">
                <NumberInput aria-label="Wastage percent" suffix="%" scale={100} className="w-24" value={r.wastageRate} onChange={(v) => update({ wastageRate: v ?? 0 })} />
              </SettingRow>
            )}
            {r.includeWastage && r.wastageRate >= 1 && <p className="text-sm text-danger">Wastage must be below 100%.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

/** The answer the user came for, so it is the most prominent thing on the page. */
function ResultCard({ method, price, cost }: { method: PricingMethod; price: PriceBreakdown | null; cost?: number }) {
  return (
    <Card>
      <p className="text-sm text-ink-muted">Selling price · {METHOD_LABELS[method]}</p>
      {price ? (
        <>
          <p className="tabular mt-1 text-3xl font-semibold tracking-tight">{money(price.sellingPrice)}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-sm">
            <Stat label="Cost" value={money(cost)} />
            <Stat label="Profit" value={money(price.profit)} tone={toneOf(price.profit)} />
            <Stat label="Margin" value={percent(price.impliedMargin)} tone={toneOf(price.profit)} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            With PWD/senior discount: {money(price.discountedPrice)}, profit{' '}
            <span className={clsx('tabular', price.profitAfterDiscount < 0 && 'text-loss')}>{money(price.profitAfterDiscount)}</span>
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm">
          {cost == null ? 'Enter at least 1 serving to see a price.' : `Enter a ${METHOD_LABELS[method].toLowerCase()} under Pricing.`}
        </p>
      )}
    </Card>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'profit' | 'loss' }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={clsx('tabular font-medium whitespace-nowrap', tone === 'profit' && 'text-profit', tone === 'loss' && 'text-loss')}>{value}</p>
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      {children}
    </div>
  )
}

function CostRow({ label, batch, serving, strong }: { label: string; batch?: number; serving?: number; strong?: boolean }) {
  return (
    <div className={clsx('flex items-baseline gap-3 py-1 text-sm', strong && 'font-semibold')}>
      <span className={clsx('flex-1', !strong && 'text-ink-muted')}>{label}</span>
      {batch != null && <span className="tabular w-24 text-right">{money(batch)}</span>}
      <span className="tabular w-24 text-right">{money(serving)}</span>
    </div>
  )
}

function LinesCard({
  kind,
  title,
  lines,
  onChange,
  note,
}: {
  kind: ItemKind
  title: string
  lines: EvaluatedLine[]
  onChange: (lines: Line[]) => void
  note?: string
}) {
  const items = useStore((s) => s[kind])
  const justAdded = useNav((s) => s.justAdded)
  const markAdded = useNav((s) => s.markAdded)
  const go = useNav((s) => s.go)
  const raw = lines.map((l) => l.line)
  const set = (id: string, patch: Partial<Line>) => onChange(raw.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const noun = kind === 'ingredients' ? 'ingredient' : 'item'
  const add = () => {
    const id = newId()
    markAdded(id)
    onChange([...raw, { id, itemId: '', qty: null }])
  }

  return (
    <Card
      title={title}
      action={
        items.length > 0 && (
          <Button size="sm" intent="secondary" onClick={add}>
            Add {noun}
          </Button>
        )
      }
    >
      {note && <p className="mb-3 text-sm text-ink-muted">{note}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Your {kind === 'ingredients' ? 'ingredient' : 'packaging'} list is empty.{' '}
          <button type="button" className="font-medium text-accent underline-offset-2 hover-fine:underline" onClick={() => go(kind)}>
            Add {kind === 'ingredients' ? 'ingredients' : 'packaging'}
          </button>
        </p>
      ) : lines.length === 0 ? (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-lg border border-dashed border-line py-6 text-sm text-ink-muted transition-colors duration-150 hover-fine:border-accent hover-fine:text-accent"
        >
          + Add the first {noun}
        </button>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,1fr)_7rem_3rem_6rem_6rem_2rem] gap-2 pb-2 text-xs font-medium tracking-wide text-ink-muted uppercase sm:grid">
            <span>{kind === 'ingredients' ? 'Ingredient' : 'Item'}</span>
            <span className="text-right">Qty</span>
            <span>Unit</span>
            <span className="text-right">Unit cost</span>
            <span className="text-right">Cost</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {lines.map(({ line, item, unitCost, cost }) => (
              <li
                key={line.id}
                className={clsx(
                  // Phones: picker on its own row, then qty · unit · cost · delete. Wider: one row.
                  'grid grid-cols-[6rem_minmax(0,1fr)_auto_2rem] items-center gap-x-2 gap-y-1.5 py-2 sm:grid-cols-[minmax(0,1fr)_7rem_3rem_6rem_6rem_2rem] sm:gap-y-0',
                  line.id === justAdded && 'enter',
                )}
              >
                <div className="col-span-4 min-w-0 sm:col-span-1">
                  <ItemPicker
                    label={noun}
                    items={items}
                    value={item ?? null}
                    placeholder={line.itemId && !item ? 'Deleted, choose again' : `Search ${noun}s`}
                    autoFocus={line.id === justAdded}
                    onChange={(picked) => set(line.id, { itemId: picked.id })}
                  />
                </div>
                <NumberInput aria-label="Quantity" placeholder="Qty" value={line.qty} onChange={(qty) => set(line.id, { qty })} />
                <span className="truncate text-sm text-ink-muted">{item?.unit || '—'}</span>
                <span className="tabular hidden text-right text-sm text-ink-muted sm:block">{unitMoney(unitCost)}</span>
                <span className="tabular text-right text-sm font-medium max-sm:col-start-3">{money(cost)}</span>
                <IconButton label={`Remove ${item?.name || noun}`} onClick={() => onChange(raw.filter((l) => l.id !== line.id))}>
                  <TrashIcon />
                </IconButton>
                {item && unitCost == null && (
                  <p className="col-span-full text-xs text-danger">
                    {item.name} has no qty per pack, so it can't be costed.{' '}
                    <button type="button" className="underline underline-offset-2" onClick={() => go(kind)}>
                      Fix it
                    </button>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

const METHOD_HINTS: Record<PricingMethod, string> = {
  fixed: 'Add a fixed peso amount to cost',
  markup: 'Add a percentage of cost',
  margin: 'Keep a percentage of the price',
  manual: 'Your own price, VAT included',
}

function PricingCard({
  recipe: r,
  prices,
  cost,
  onChange,
}: {
  recipe: Recipe
  prices: Record<PricingMethod, PriceBreakdown | null>
  cost?: number
  onChange: (patch: Partial<Recipe>) => void
}) {
  const inputs: Record<PricingMethod, ReactNode> = {
    fixed: <NumberInput aria-label="Fixed markup" prefix="₱" value={r.fixedMarkup} onChange={(v) => onChange({ fixedMarkup: v })} />,
    markup: <NumberInput aria-label="Markup percent" suffix="%" scale={100} value={r.markupRate} onChange={(v) => onChange({ markupRate: v })} />,
    margin: <NumberInput aria-label="Margin percent" suffix="%" scale={100} value={r.marginRate} onChange={(v) => onChange({ marginRate: v })} />,
    manual: <NumberInput aria-label="Selling price" prefix="₱" value={r.manualPrice} onChange={(v) => onChange({ manualPrice: v })} />,
  }
  const active = prices[r.pricingMethod]

  return (
    <Card title="Pricing">
      <p className="mb-3 text-sm text-ink-muted">Fill in any method to compare. The selected one is used in the Summary.</p>
      <div role="radiogroup" aria-label="Pricing method used in Summary" className="flex flex-col gap-1.5">
        {(Object.keys(METHOD_LABELS) as PricingMethod[]).map((m) => {
          const p = prices[m]
          const selected = r.pricingMethod === m
          return (
            <div
              key={m}
              className={clsx(
                'grid grid-cols-[1.25rem_minmax(0,1fr)_8rem] items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 transition-colors duration-150 sm:grid-cols-[1.25rem_minmax(0,1fr)_8rem_6.5rem_6.5rem]',
                selected ? 'border-accent bg-accent-soft/50' : 'border-line',
              )}
            >
              <input
                type="radio"
                name={`method-${r.id}`}
                id={`method-${r.id}-${m}`}
                checked={selected}
                onChange={() => onChange({ pricingMethod: m })}
                className="size-4 accent-(--color-accent)"
              />
              <label htmlFor={`method-${r.id}-${m}`} className="min-w-0 cursor-pointer">
                <span className="block text-sm font-medium">{METHOD_LABELS[m]}</span>
                <span className="block text-xs text-ink-muted">{METHOD_HINTS[m]}</span>
              </label>
              {inputs[m]}
              <div className="col-span-3 col-start-2 flex justify-between gap-3 text-sm sm:col-span-1 sm:col-start-auto sm:block sm:text-right">
                <span className="text-xs text-ink-muted sm:block">Price</span>
                <span className="tabular font-medium">{money(p?.sellingPrice)}</span>
              </div>
              <div className="col-span-3 col-start-2 flex justify-between gap-3 text-sm sm:col-span-1 sm:col-start-auto sm:block sm:text-right">
                <span className="text-xs text-ink-muted sm:block">Profit</span>
                <span className={clsx('tabular font-medium', p && p.profit < 0 && 'text-loss', p && p.profit >= 0 && 'text-profit')}>{money(p?.profit)}</span>
              </div>
              {m === 'margin' && r.marginRate != null && r.marginRate >= 1 && (
                <p className="col-span-full text-xs text-danger">Margin must be below 100%.</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-lg bg-canvas p-3">
        <p className="mb-1 text-xs font-medium tracking-wide text-ink-muted uppercase">{METHOD_LABELS[r.pricingMethod]} breakdown</p>
        {active ? (
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <Row label="Price before VAT" value={money(active.priceBeforeVat)} />
              <Row label={r.includeVat ? `VAT (${percentShort(r.vatRate)})` : 'VAT (off)'} value={money(active.vat)} />
              <Row label="Selling price" value={money(active.sellingPrice)} strong />
              <Row label="Cost per order" value={money(cost)} />
              <Row label="Profit" value={money(active.profit)} tone={toneOf(active.profit)} strong />
            </div>
            <div className="mt-2 border-t border-line pt-2 sm:mt-0 sm:border-0 sm:pt-0">
              <Row label="Margin" value={percent(active.impliedMargin)} />
              <Row label="Markup" value={percent(active.impliedMarkup)} />
              <Row label={`PWD/senior discount (${percentShort(r.discountRate)})`} value={money(-active.discountAmount)} />
              <Row label="Discounted price" value={money(active.discountedPrice)} />
              <Row label="Profit after discount" value={money(active.profitAfterDiscount)} tone={toneOf(active.profitAfterDiscount)} />
            </div>
          </div>
        ) : (
          <p className="py-2 text-sm text-ink-muted">Enter a value for {METHOD_LABELS[r.pricingMethod].toLowerCase()} to see its breakdown.</p>
        )}
      </div>
    </Card>
  )
}
