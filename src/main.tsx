import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AppInitializer } from '@/components/ui/AppInitializer'

/**
 * QueryClient configuration for wllt.z — optimized for local-first offline app.
 *
 * Key decisions:
 * - staleTime: 60s   → data from IndexedDB is not "stale" until 60s pass,
 *                       since it only changes via our own mutations.
 * - gcTime: 5min     → default; keeps cached data around for fast tab switching.
 * - retry: 1         → IndexedDB failures are usually immediate; don't retry endlessly.
 * - refetchOnWindowFocus: false → no need to refetch local DB on window focus.
 * - refetchOnReconnect: false   → sync engine handles reconnect, not TanStack Query.
 *
 * NOTE: Database seeding is now handled inside <AppInitializer> which:
 *   1. Awaits all seeders sequentially (no race condition)
 *   2. Invalidates all caches after seeding completes
 *   3. Only then renders <App /> — guaranteed fresh data on first render
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,        // 1 minute
      gcTime: 1000 * 60 * 5,       // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/*
        AppInitializer gates <App /> render until:
          1. seedDefaultCategories() completes
          2. seedDefaultWallet() completes
          3. queryClient.invalidateQueries() flushes stale cache
        This eliminates the race condition where React Query cached empty
        arrays before async seeding had a chance to write to IndexedDB.
      */}
      <AppInitializer>
        <App />
      </AppInitializer>
    </QueryClientProvider>
  </StrictMode>,
)
