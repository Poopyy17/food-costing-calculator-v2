import clsx from 'clsx'
import { Card, Row } from '../components/ui/Card'
import { NumberInput } from '../components/ui/NumberInput'
import { Select } from '../components/ui/TextInput'
import { monthlyProjection, type PricingMethod, type SummaryRow } from '../lib/calc'
import { money, percent, toneOf } from '../lib/format'
import { evaluateRecipe, METHOD_LABELS } from '../lib/recipe'
import { useNav } from '../nav'
import { useStore } from '../store'
import { useOpexTotals } from '../lib/useOpexTotals'

export function SummaryPanel() {
  const recipes = useStore((s) => s.recipes)
  const ingredients = useStore((s) => s.ingredients)
  const packaging = useStore((s) => s.packaging)
  const { updateRecipe } = useStore.getState()
  const opex = useOpexTotals()
  const go = useNav((s) => s.go)

  const rows = recipes.map((r) => {
    const { serving, prices } = evaluateRecipe(r, ingredients, packaging)
    const price = prices[r.pricingMethod]
    const orders = r.ordersPerMonth ?? 0
    const row: SummaryRow | null =
      price && serving
        ? { sellingPrice: price.sellingPrice, costPerOrder: serving.total, profitPerOrder: price.profit, vatPerOrder: price.vat, ordersPerMonth: orders }
        : null
    return { recipe: r, row }
  })
  const projection = monthlyProjection(
    rows.flatMap((x) => (x.row ? [x.row] : [])),
    opex.estimated,
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card title="Recipes">
        {recipes.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Every recipe appears here automatically.{' '}
            <button type="button" className="font-medium text-accent underline-offset-2 hover-fine:underline" onClick={() => go('recipes')}>
              Build your first recipe
            </button>
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  <th className="pb-2 pr-2 font-medium">Recipe</th>
                  <th className="w-36 pb-2 pr-2 font-medium">Pricing method</th>
                  <th className="pb-2 pr-2 text-right font-medium">Selling price</th>
                  <th className="pb-2 pr-2 text-right font-medium">Cost/order</th>
                  <th className="pb-2 pr-2 text-right font-medium">Gross profit/order</th>
                  <th className="w-28 pb-2 pr-2 text-right font-medium">Orders/month</th>
                  <th className="pb-2 pr-2 text-right font-medium">Gross sales/month</th>
                  <th className="pb-2 text-right font-medium">Gross profit/month</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ recipe: r, row }) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="max-w-56 py-1.5 pr-2">
                      <button
                        type="button"
                        title={`Open ${r.name || 'recipe'}`}
                        onClick={() => go('recipes', r.id)}
                        className="max-w-full truncate text-left font-medium underline-offset-2 hover-fine:text-accent hover-fine:underline"
                      >
                        {r.name || 'Untitled'}
                      </button>
                    </td>
                    <td className="py-1.5 pr-2">
                      <Select aria-label="Pricing method" className="min-w-36" value={r.pricingMethod} onChange={(e) => updateRecipe(r.id, { pricingMethod: e.target.value as PricingMethod })}>
                        {Object.entries(METHOD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    {row ? (
                      <>
                        <td className="tabular py-1.5 pr-2 text-right">{money(row.sellingPrice)}</td>
                        <td className="tabular py-1.5 pr-2 text-right">{money(row.costPerOrder)}</td>
                        <td className={clsx('tabular py-1.5 pr-2 text-right', row.profitPerOrder < 0 && 'text-loss')}>{money(row.profitPerOrder)}</td>
                      </>
                    ) : (
                      <td colSpan={3} className="py-1.5 pr-2 text-right">
                        <button type="button" onClick={() => go('recipes', r.id)} className="text-accent underline-offset-2 hover-fine:underline">
                          Set a {METHOD_LABELS[r.pricingMethod].toLowerCase()}
                        </button>
                      </td>
                    )}
                    <td className="py-1.5 pr-2">
                      <NumberInput aria-label="Orders per month" value={r.ordersPerMonth} onChange={(v) => updateRecipe(r.id, { ordersPerMonth: v })} />
                    </td>
                    <td className="tabular py-1.5 pr-2 text-right">{money(row ? row.sellingPrice * row.ordersPerMonth : 0)}</td>
                    <td className={clsx('tabular py-1.5 text-right', row && row.profitPerOrder < 0 && row.ordersPerMonth > 0 && 'text-loss')}>
                      {money(row ? row.profitPerOrder * row.ordersPerMonth : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Monthly profit projection" className="self-start max-lg:order-first lg:sticky lg:top-28">
        <Row label="Gross sales" value={money(projection.grossSales)} strong />
        <Row label="Less: VAT" value={money(-projection.vat)} />
        <div className="mt-1 border-t border-line pt-1">
          <Row label="Net sales" value={money(projection.netSales)} strong />
          <Row label="Less: Cost of goods sold" value={money(-projection.cogs)} />
        </div>
        <div className="mt-1 border-t border-line pt-1">
          <Row label="Gross profit" value={money(projection.grossProfit)} strong />
          <Row label="Less: Monthly OPEX" value={money(-projection.opex)} />
        </div>
        <div className="mt-1 border-t-2 border-ink pt-1">
          <Row label="Net profit" value={money(projection.netProfit)} strong tone={toneOf(projection.netProfit)} />
          <Row label="Net profit margin" value={percent(projection.netProfitMargin)} tone={toneOf(projection.netProfit)} />
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          For planning only. This projection uses your recipes, selling prices, expected orders, and OPEX. It does not represent actual business results.
        </p>
      </Card>
    </div>
  )
}
