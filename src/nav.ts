import { create } from 'zustand'

export type Tab = 'recipes' | 'ingredients' | 'packaging' | 'units' | 'opex' | 'summary'

type Nav = {
  tab: Tab
  recipeId: string | null
  /** Id of the row the user just added, so only that row animates in and gets focus. */
  justAdded: string | null
  go: (tab: Tab, recipeId?: string | null) => void
  selectRecipe: (id: string | null) => void
  markAdded: (id: string) => void
}

export const useNav = create<Nav>()((set) => ({
  tab: 'recipes',
  recipeId: null,
  justAdded: null,
  go: (tab, recipeId) => set((s) => ({ tab, recipeId: recipeId === undefined ? s.recipeId : recipeId })),
  selectRecipe: (recipeId) => set({ recipeId }),
  markAdded: (justAdded) => set({ justAdded }),
}))
