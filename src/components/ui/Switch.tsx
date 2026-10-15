import { Switch as BaseSwitch } from '@base-ui/react/switch'

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <BaseSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-line transition-colors duration-150 ease-out data-checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <BaseSwitch.Thumb className="m-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out data-checked:translate-x-4" />
      </BaseSwitch.Root>
    </label>
  )
}
