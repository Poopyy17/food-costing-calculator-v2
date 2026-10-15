import { Tabs } from '@base-ui/react/tabs'
import { Toaster } from 'sonner'
import { ItemsPanel } from './features/ItemsPanel'
import { OpexPanel } from './features/OpexPanel'
import { RecipesPanel } from './features/RecipesPanel'
import { SummaryPanel } from './features/SummaryPanel'
import { UnitsPanel } from './features/UnitsPanel'
import { type Tab, useNav } from './nav'

const sections: { value: Tab; label: string; panel: React.ReactNode }[] = [
  { value: 'recipes', label: 'Recipes', panel: <RecipesPanel /> },
  { value: 'ingredients', label: 'Ingredients', panel: <ItemsPanel kind="ingredients" /> },
  { value: 'packaging', label: 'Packaging', panel: <ItemsPanel kind="packaging" /> },
  { value: 'units', label: 'Units', panel: <UnitsPanel /> },
  { value: 'opex', label: 'OPEX', panel: <OpexPanel /> },
  { value: 'summary', label: 'Summary', panel: <SummaryPanel /> },
]

export default function App() {
  const tab = useNav((s) => s.tab)
  const go = useNav((s) => s.go)

  return (
    <div className="min-h-dvh">
      <Tabs.Root value={tab} onValueChange={(v) => go(v as Tab)}>
        <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pt-4 sm:px-6">
            <h1 className="text-base font-semibold tracking-tight">Food Costing Calculator</h1>
            <Tabs.List className="relative -mb-px flex gap-1 overflow-x-auto">
              {sections.map((s) => (
                <Tabs.Tab
                  key={s.value}
                  value={s.value}
                  className="shrink-0 px-3 pb-3 pt-1 text-sm font-medium text-ink-muted transition-colors duration-150 hover-fine:text-ink data-active:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {s.label}
                </Tabs.Tab>
              ))}
              <Tabs.Indicator className="absolute bottom-0 left-(--active-tab-left) h-0.5 w-(--active-tab-width) rounded-full bg-accent transition-[left,width] duration-200 ease-out" />
            </Tabs.List>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {sections.map((s) => (
            <Tabs.Panel key={s.value} value={s.value}>
              {s.panel}
            </Tabs.Panel>
          ))}
        </main>
      </Tabs.Root>

      <Toaster position="bottom-right" theme="dark" />
    </div>
  )
}
