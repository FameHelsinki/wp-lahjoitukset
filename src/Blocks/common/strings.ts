import { __ } from '@wordpress/i18n'

/**
 * Whether a block captions a single control or a fieldset.
 */
export type CaptionKind = 'label' | 'legend'

export type CaptionStrings = {
	/** ToggleControl label. */
	visibilityLabel: string
	/** ToggleControl help text. */
	visibilityHelp: string
	/** TextControl label, and the aria-label of the canvas RichText. */
	captionLabel: string
	/** TextControl help text. */
	captionHelp: string
}

/**
 * Wording for a block's label or legend controls.
 *
 * Resolve this once per block rather than per control, so a block cannot end up
 * mixing the two kinds.
 *
 * @param kind Whether the block captions a single control or a fieldset.
 */
export function captionStrings(kind: CaptionKind): CaptionStrings {
	return {
		visibilityLabel:
			kind === 'legend'
				? __('Show legend', 'fame_lahjoitukset')
				: __('Show label', 'fame_lahjoitukset'),
		visibilityHelp:
			kind === 'legend'
				? __('If disabled, the legend is marked visually hidden.', 'fame_lahjoitukset')
				: __('If disabled, the label is marked visually hidden.', 'fame_lahjoitukset'),
		captionLabel:
			kind === 'legend'
				? __('Legend', 'fame_lahjoitukset')
				: __('Label', 'fame_lahjoitukset'),
		captionHelp: __('Description for screen readers (for accessibility).', 'fame_lahjoitukset'),
	}
}
