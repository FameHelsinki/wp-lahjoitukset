import { __ } from '@wordpress/i18n'

export const DEFAULT_AMOUNT = 10
export const DEFAULT_UNIT = '€'
export const DEFAULT_LEGEND = __('Amount', 'fame_lahjoitukset')

export type Amount = {
	value?: number | string
}

export type AmountSetting = {
	type?: string
	unit?: string
	default?: boolean
	defaultAmount?: number | string
	amounts?: Amount[]
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

export const isVisible = (other?: boolean, settings?: AmountSetting[]) =>
	!!(other || settings?.some(type => type?.amounts?.length))

export type DerivedAmount = Required<AmountSetting> & { amounts: Amount[] }

export function spliceSettings(settings: AmountSetting[] | undefined, value: AmountSetting) {
	const idx = settings?.findIndex(type => type?.type === value.type) ?? -1

	return (
		(settings ?? [])
			// Add new settings at the end.
			.toSpliced(idx, 1, value)
	)
}
