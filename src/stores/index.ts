/**
 * stores/index.ts — Barrel export for all global Zustand stores.
 *
 * Import pattern:
 *   import { useUIStore, getPeriodDateRange } from '@/stores'
 *
 * Feature-specific stores live in: src/features/<feature>/stores/
 */

// ── UI Store ──────────────────────────────────────────────────────────────
export {
  useUIStore,
  getPeriodDateRange,
  getPreviousPeriod,
  getNextPeriod,
} from './uiStore'
export type { UIState, ActiveTab } from './uiStore'

// ── Auth Store ────────────────────────────────────────────────────────────
export {
  useAuthStore,
} from './authStore'
export type { AuthState } from './authStore'

