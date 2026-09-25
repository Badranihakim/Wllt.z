import { useState, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { bootstrapLocalDB } from '@/lib/seedDefaultData'

// ─────────────────────────────────────────────
// SplashScreen — shown while DB initializes
// ─────────────────────────────────────────────

interface SplashScreenProps {
  error: string | null
}

function SplashScreen({ error }: SplashScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6"
      style={{
        background: 'var(--surface-1)',
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.88 0.04 240 / 60%), transparent)',
      }}
    >
      {/* Logo mark */}
      <div
        className="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-xl"
        style={{
          background: 'oklch(0.975 0.004 240)',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 8px 32px oklch(0 0 0 / 10%), 0 0 0 1px oklch(1 0 0 / 70%)',
        }}
      >
        💎
      </div>

      {/* App name */}
      <div className="text-center">
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          wllt.z
        </p>
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: 'var(--text-faint)' }}
        >
          {error
            ? '⚠️ Inisialisasi gagal — ketuk untuk mencoba lagi'
            : 'Menyiapkan database lokal...'}
        </p>
      </div>

      {/* Animated progress dots */}
      {!error && (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: 'var(--accent)',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}

      {/* Error detail */}
      {error && (
        <p
          className="mx-8 rounded-2xl px-4 py-2 text-center text-xs"
          style={{
            background: 'var(--expense-dim)',
            color: 'var(--expense)',
            maxWidth: '280px',
          }}
        >
          {error}
        </p>
      )}

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1);   opacity: 0.4; }
          50%       { transform: scale(1.4); opacity: 1;   }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────
// AppInitializer — sequential bootstrap gate
// ─────────────────────────────────────────────

interface AppInitializerProps {
  children: ReactNode
}

/**
 * AppInitializer — Wraps the entire app tree and gates rendering until the
 * local IndexedDB is fully bootstrapped (seeded + cache invalidated).
 *
 * Motivation:
 *   The old pattern called seeders fire-and-forget BEFORE React mounted.
 *   This created a race condition: React Query would fetch empty data,
 *   cache it with `staleTime: Infinity`, and never refetch — even after
 *   seeding completed asynchronously.
 *
 * Fix:
 *   1. Show a splash screen until bootstrap is done.
 *   2. Await `bootstrapLocalDB()` (all seeders run sequentially).
 *   3. Call `queryClient.invalidateQueries()` to bust ALL stale caches.
 *   4. Flip `isReady = true` → children render with fresh data guaranteed.
 *
 * Fail-open: if bootstrap throws, the error is shown and the app renders
 * anyway after a short delay so the user is never permanently blocked.
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const queryClient = useQueryClient()

  const [isReady,   setIsReady]   = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        // ── Step 1: Run all seeders (each is idempotent) ────────────────
        await bootstrapLocalDB()

        // ── Step 2: Bust all React Query caches ─────────────────────────
        // This forces every query to re-fetch from IndexedDB now that the
        // seeded data exists, regardless of staleTime settings.
        await queryClient.invalidateQueries()

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[wllt.z] AppInitializer bootstrap error:', err)

        if (!cancelled) {
          setInitError(msg)
          // Fail open after 1.5s so the user isn't permanently blocked
          await new Promise<void>(res => setTimeout(res, 1500))
        }
      } finally {
        if (!cancelled) {
          setIsReady(true)
        }
      }
    }

    bootstrap()

    return () => { cancelled = true }
  }, [queryClient])

  // Show splash while booting, render children once ready
  if (!isReady) {
    return <SplashScreen error={initError} />
  }

  return <>{children}</>
}
