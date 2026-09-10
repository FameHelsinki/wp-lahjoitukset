import { __ } from '@wordpress/i18n'

export const DEFAULT_AMOUNT = 10
export const DEFAULT_UNIT = '€'
export const DEFAULT_LEGEND = __('Donation amount', 'fame_lahjoitukset')
export const MIN_AMOUNT = 10
export const MAX_AMOUNT = 10000

export type Amount = {
	value?: number | string
}

export type AmountSetting = {
	type?: string
	unit?: string
	default?: boolean
	defaultAmount?: number | string
	amounts?: Amount[]
	minAmount?: number | string
	maxAmount?: number | string
	helpText?: string
}

export const formatAmount = (amount?: string | number, def = DEFAULT_AMOUNT) =>
	typeof amount === 'number' ? amount : (amount && parseInt(amount, 10)) || def

/**
 * Get default value for new amount.
 */
export function nextAmount(amounts?: Amount[]): number {
	const previous = amounts?.at(-1)?.value
	return formatAmount(previous, 0) + DEFAULT_AMOUNT
}

/**
 * Whether the block renders a visible field instead of a lone hidden input.
 */
export const isVisible = (other?: boolean, settings?: AmountSetting[]) =>
	!!(other || settings?.some(type => type?.amounts?.some(amount => !!amount?.value)))

export type DerivedAmount = Required<AmountSetting> & { amounts: Amount[] }

export function spliceSettings(settings: AmountSetting[] | undefined, value: AmountSetting) {
	const idx = settings?.findIndex(type => type?.type === value.type) ?? -1

	return (
		(settings ?? [])
			// Add new settings at the end.
			.toSpliced(idx, 1, value)
	)
}
