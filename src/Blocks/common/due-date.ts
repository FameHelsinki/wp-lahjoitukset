/**
 * Shared definitions for the recurring charge day (due_date).
 *
 * The charge day is limited to 1-28 so that every month has the day. Editors
 * curate which days donors may pick; the frontend renders a selector only when
 * at least two days are configured.
 */

export const MIN_DUE_DATE_DAY = 1
export const MAX_DUE_DATE_DAY = 28
export const DEFAULT_DUE_DATE_DAY = 5

export const DUE_DATE_DAYS: number[] = Array.from(
	{ length: MAX_DUE_DATE_DAY - MIN_DUE_DATE_DAY + 1 },
	(_, index) => MIN_DUE_DATE_DAY + index
)

/**
 * Normalize a saved day list: integers only, clamped to 1-28, without
 * duplicates and sorted ascending. Sorting here makes the first entry the
 * lowest day, so the editor preview and render.php always agree on which day
 * is used as the default.
 */
export function normalizeDueDateDays(value: unknown): number[] {
	if (!Array.isArray(value)) return []

	const days = value
		.map(day => Math.trunc(Number(day)))
		.filter(day => Number.isFinite(day) && day >= MIN_DUE_DATE_DAY && day <= MAX_DUE_DATE_DAY)

	return [...new Set(days)].sort((a, b) => a - b)
}
