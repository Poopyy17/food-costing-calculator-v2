import { toast } from 'sonner'
import { snapshot, useStore } from '../store'

/** Runs a destructive change and offers Undo in a toast instead of a confirm dialog. */
export function withUndo(message: string, change: () => void) {
  const before = snapshot(useStore.getState())
  change()
  toast(message, { action: { label: 'Undo', onClick: () => useStore.getState().restore(before) } })
}
