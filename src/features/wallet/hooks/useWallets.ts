import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { walletRepo } from '@/repositories'
import { queryKeys } from '@/lib/queryKeys'
import type { CreateWalletDTO } from '@/types'

// ─────────────────────────────────────────────
// useWallets
// ─────────────────────────────────────────────

/**
 * Fetch all active (non-archived, non-deleted) wallets from IndexedDB.
 *
 * @example
 * const { data: wallets = [], isLoading } = useWallets()
 */
export function useWallets() {
  return useQuery({
    queryKey: queryKeys.wallets.active(),
    queryFn: () => walletRepo.findActive(),
  })
}

// ─────────────────────────────────────────────
// useCreateWallet
// ─────────────────────────────────────────────

/**
 * Mutation to create a new Wallet.
 * On success, invalidates all wallet queries so the list re-renders.
 *
 * @example
 * const { mutate: createWallet, isPending } = useCreateWallet()
 *
 * createWallet({
 *   name: 'BCA Tabungan',
 *   type: 'bank',
 *   currency: 'IDR',
 *   balance: 5_000_000,
 *   color: '#1A73E8',
 *   icon: '🏦',
 * })
 */
export function useCreateWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateWalletDTO) => walletRepo.create(dto),

    onSuccess: async () => {
      // Invalidate the root prefix — clears active list + any detail queries
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wallets.all(),
      })
    },
  })
}

// ─────────────────────────────────────────────
// useDeleteWallet
// ─────────────────────────────────────────────

/**
 * Mutation to soft-delete a Wallet.
 * On success, invalidates wallet and transaction queries and triggers cloud sync.
 *
 * @example
 * const { mutate: deleteWallet, isPending } = useDeleteWallet()
 * deleteWallet(walletId)
 */
export function useDeleteWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (walletId: string) => {
      await walletRepo.delete(walletId)
      // Trigger background sync if online and configured
      import('@/repositories/google-sheets/GoogleSheetsRepository')
        .then(({ GoogleSheetsRepository }) => {
          GoogleSheetsRepository.sync()
        })
        .catch(() => {})
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
      ])
    },
  })
}

