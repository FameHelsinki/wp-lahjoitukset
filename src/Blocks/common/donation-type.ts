import { useMemo } from 'react'
import { __ } from '@wordpress/i18n'
import { useSelect } from '@wordpress/data'
import { localizedDefault } from './localized-default.ts'

export type DonationType = {
	value: string
	label: string
}

const TYPES = {
	single: __('Single', 'fame_lahjoitukset'),
	recurring: __('Recurring', 'fame_lahjoitukset'),
}

export const DONATION_TYPES: DonationType[] = Object.entries(TYPES).map(([value, label]) => ({
	value,
	label,
}))

export const DEFAULT_DONATION_TYPE = DONATION_TYPES[0]

export function localizedDonationTypeLabel(type: DonationType): string {
	const translated = DONATION_TYPES.find(item => item.value === type.value)?.label ?? type.value
	const legacy = type.value === 'recurring' ? 'Recurring' : 'Single'
	return localizedDefault(type.label, legacy, translated)
}

/**
 * Get donation label from type value.
 *
 * @param type Donation type.
 */
export function getDonationLabel(type: string): string | undefined {
	return TYPES[type] ?? `Unknown type ${type}`
}

/**
 * Reads the attributes of the donation-type block that belongs to the same form.
 *
 * Walk up to the nearest "famehelsinki/donation-form" container and search its descendants.
 * The returned value is the attributes object straight from the block editor
 * store.
 */
function useDonationTypeAttributes(clientId: string): Record<string, any> | null {
	return useSelect(
		select => {
			const be = select('core/block-editor') as any
			const { getBlock, getBlockRootClientId, getClientIdsOfDescendants } = be

			// Find the nearest "famehelsinki/donation-form" container (or the parent).
			let containerId: string | null = clientId
			let lastId: string | null = clientId

			while (containerId) {
				const parentId = getBlockRootClientId(containerId)
				if (!parentId) break

				const parentBlock = getBlock(parentId)
				lastId = parentId
				containerId = parentId

				if (parentBlock?.name === 'famehelsinki/donation-form') {
					break
				}
			}

			const rootId = containerId || lastId
			if (!rootId) return null

			// Find all descendants (also within groups) and search for donation-type.
			const descendantIds: string[] = getClientIdsOfDescendants([rootId]) || []
			const allIds = [rootId, ...descendantIds]

			const typeBlock =
				allIds
					.map(id => getBlock(id))
					.find((b: any) => b?.name === 'famehelsinki/donation-type') || null

			return typeBlock?.attributes ?? null
		},
		[clientId]
	)
}

/**
 * Extracts current donation type with gutenberg magic.
 */
export function useCurrentDonationType(clientId: string): string | null {
	return useDonationTypeAttributes(clientId)?.value ?? null
}

/**
 * Donation types enabled for the form this block belongs to.
 */
export function useEnabledDonationTypes(clientId: string): string[] | null {
	const attributes = useDonationTypeAttributes(clientId)

	return useMemo(() => {
		const values = (Array.isArray(attributes?.types) ? attributes.types : [])
			.map((type: any) => String(type?.value ?? ''))
			.filter(Boolean)

		return values.length ? values : null
	}, [attributes])
}
