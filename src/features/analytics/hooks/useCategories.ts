import { useQuery } from '@tanstack/react-query'
import { categoryRepo } from '@/repositories'
import { queryKeys } from '@/lib/queryKeys'

// ─────────────────────────────────────────────
// useCategories — top-level (main) categories
// ─────────────────────────────────────────────

/**
 * Fetch TOP-LEVEL categories (parent_id = null), optionally filtered by type.
 *
 * Used in AddTransactionModal to render the category circle grid.
 * Filtered to top-level only so sub-categories do not appear in the circles row.
 *
 * @param type - Optional filter: 'income' | 'expense'. Omit for all types.
 *
 * @example
 * // Expense main categories (for transaction form)
 * const { data: categories = [] } = useCategories('expense')
 */
export function useCategories(type?: 'income' | 'expense') {
  return useQuery({
    queryKey: type
      ? queryKeys.categories.byType(type)
      : queryKeys.categories.all(),

    queryFn: () =>
      type
        ? categoryRepo.findTopLevelByType(type)
        : categoryRepo.findAllSorted().then(all => all.filter(c => c.parent_id == null)),

    staleTime: Infinity,
  })
}

// ─────────────────────────────────────────────
// useCategoryChildren — sub-categories of a parent
// ─────────────────────────────────────────────

/**
 * Fetch sub-categories (children) of a given parent category ID.
 *
 * Used in AddTransactionModal to render the sub-category chip row
 * when a main category is selected.
 *
 * Returns an empty array when `parentId` is null/undefined (no parent selected).
 * The query is disabled automatically when parentId is falsy.
 *
 * @example
 * const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
 * const { data: subCategories = [] } = useCategoryChildren(selectedCategoryId)
 */
export function useCategoryChildren(parentId: string | null | undefined) {
  return useQuery({
    queryKey: ['categories', 'children', parentId],
    queryFn: () => categoryRepo.findByParent(parentId!),
    enabled: !!parentId,   // disabled when no parent selected
    staleTime: Infinity,
  })
}
