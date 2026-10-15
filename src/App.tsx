import { Tabs } from '@base-ui/react/tabs'
import { Toaster } from 'sonner'

const sections = [
  { value: 'recipes', label: 'Recipes' },
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'opex', label: 'OPEX' },
  { value: 'summary', label: 'Summary' },
] as const

export default function App() {
  return (
    <div className="min-h-dvh">
      <Tabs.Root defaultValue="recipes">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-4 sm:px-6">
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

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {sections.map((s) => (
            <Tabs.Panel key={s.value} value={s.value}>
              <div className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-muted">
                {s.label} coming soon.
              </div>
            </Tabs.Panel>
          ))}
        </main>
      </Tabs.Root>

      <Toaster position="bottom-right" />
    </div>
  )
}
