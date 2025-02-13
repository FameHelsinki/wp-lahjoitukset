import React, { useEffect } from 'react'
import { __ } from '@wordpress/i18n'
import { PanelBody, PanelRow, ToggleControl } from '@wordpress/components'
import { InspectorControls, useBlockProps } from '@wordpress/block-editor'
import { getDonationLabel, useCurrentDonationType } from '../common/donation-type.ts'
import { EditProps } from '../common/types.ts'
import {
	Amount,
	AmountSetting,
	spliceSettings,
	useDerivedAmounts,
} from '../common/donation-amount.ts'
import AmountControl from './AmountControl.tsx'
import AmountSettingsControl from './AmountSettingsControl.tsx'
import EditContent from './EditContent.tsx'

export type Attributes = {
	amounts?: Amount[]
	settings?: AmountSetting[]
	showLegend?: boolean
	type?: string
	other?: boolean
	otherLabel?: string
}

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */
export default function Edit({
	context,
	attributes,
	setAttributes,
	clientId,
}: EditProps<Attributes>): React.JSX.Element {
	const { 'famehelsinki/donation-types': types } = context
	const { other, showLegend, otherLabel } = attributes
	const currentType = useCurrentDonationType(clientId)
	const derived = useDerivedAmounts(types, attributes)
	const current = derived.find(({ type }) => type === currentType)

	// Filter invalid values from amounts.
	useEffect(() => {
		if (attributes.amounts?.some(({ type }) => !types?.includes(type))) {
			setAttributes({
				amounts: attributes.amounts.filter(({ type }) => types.includes(type)),
			})
		}
	}, [types, attributes, setAttributes])

	useEffect(() => {
		if (currentType && attributes.type !== currentType) {
			setAttributes({ type: currentType })
		}
	}, [currentType, attributes, setAttributes])

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'fame_lahjoitukset')}>
					<ToggleControl
						label={__('Show other amount', 'fame_lahjoitukset')}
						help={__('Show other amount input field', 'fame_lahjoitukset')}
						checked={other}
						onChange={value => setAttributes({ other: value })}
					/>
					<ToggleControl
						label={__('Show legend', 'fame_lahjoitukset')}
						help={__(
							'If disabled, the legend is marked visually hidden.',
							'fame_lahjoitukset'
						)}
						checked={showLegend}
						onChange={value => setAttributes({ showLegend: value })}
					/>
				</PanelBody>
				{derived.map(({ type, amounts, ...settings }) => (
					<PanelBody title={getDonationLabel(type)} key={type}>
						<AmountSettingsControl
							type={type}
							other={other}
							amounts={amounts}
							settings={settings}
							showLegend={showLegend}
							onChange={value => {
								setAttributes({
									settings: spliceSettings(attributes.settings, value),
								})
							}}
						/>
						<PanelRow>
							<AmountControl
								type={type}
								amounts={amounts}
								onChange={value =>
									setAttributes({
										amounts: (attributes.amounts ?? [])
											// Filter out all amounts with given type.
											.filter(item => item.type !== type)
											// Concatenate with new amounts.
											.concat(value),
									})
								}
							/>
						</PanelRow>
					</PanelBody>
				))}
			</InspectorControls>
			<div {...useBlockProps({ className: 'donation-amounts' })}>
				<EditContent
					current={current}
					other={other}
					otherLabel={otherLabel}
					showLegend={showLegend}
					setAttributes={setAttributes}
				/>
			</div>
		</>
	)
}
