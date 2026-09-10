import React, { CSSProperties, useEffect } from 'react'
import { __ } from '@wordpress/i18n'
import {
	Button,
	Flex,
	PanelBody,
	RangeControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components'
import {
	InspectorControls,
	RichText,
	useBlockProps,
	AlignmentToolbar,
	BlockControls,
} from '@wordpress/block-editor'
import {
	getDonationLabel,
	useCurrentDonationType,
	useEnabledDonationTypes,
} from '../common/donation-type.ts'
import { EditProps } from '../common/types.ts'
import { localizedDefault } from '../common/localized-default.ts'
import { captionStrings } from '../common/strings.ts'
import {
	AmountSetting,
	DEFAULT_AMOUNT,
	DEFAULT_LEGEND,
	DEFAULT_UNIT,
	isVisible,
	MAX_AMOUNT,
	MIN_AMOUNT,
	nextAmount,
	spliceSettings,
} from '../common/donation-amount.ts'
import AmountControl from './AmountControl.tsx'
import AmountSettingsControl from './AmountSettingsControl.tsx'
import EditContent from './EditContent.tsx'

export type Attributes = {
	settings?: AmountSetting[]
	showLegend?: boolean
	legend?: string
	other?: boolean
	otherLabel?: string
	legendAlign?: string
	colsAmounts?: number
}

/**
 * Adds new amount to amount settings.
 *
 * @param setting Setting to modify.
 */
function addNewAmount(setting: AmountSetting) {
	const copy = Object.assign(setting, {})

	copy.amounts = copy.amounts || []
	copy.amounts.push({
		value: nextAmount(copy.amounts),
	})

	return copy
}

/**
 * Removes last amount from amount settings.
 *
 * @param setting Setting to modify.
 */
function removeLastAmount(setting: AmountSetting) {
	const copy = Object.assign(setting, {})
	const defaultAmount = setting.defaultAmount

	if (defaultAmount && setting.amounts) {
		const idx = setting.amounts.findIndex(amount => amount.value === +defaultAmount)

		// Check if default amount needs to be updated.
		if (idx === setting.amounts.length - 1) {
			copy.defaultAmount =
				setting.amounts.length > 1 ? setting.amounts[0].value : DEFAULT_AMOUNT
		}
	}

	copy.amounts?.splice(-1)

	return copy
}

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */
export default function Edit({
	attributes,
	setAttributes,
	clientId,
}: EditProps<Attributes>): React.JSX.Element {
	const types = useEnabledDonationTypes(clientId)
	const {
		settings,
		other,
		legend,
		showLegend,
		otherLabel,
		legendAlign = 'left',
		colsAmounts: colsAmountsAttr,
	} = attributes
	const currentType = useCurrentDonationType(clientId)
	const current = settings?.find(({ type }) => type === currentType)
	const strings = captionStrings('legend')
	const localizedLegend = localizedDefault(
		localizedDefault(legend, 'Amount', DEFAULT_LEGEND),
		'Donation amount',
		DEFAULT_LEGEND
	)

	useEffect(() => {
		if (!currentType) {
			return
		}

		if (!types) {
			return
		}

		const enabled = new Set(types)

		const exists = !!settings?.find(({ type }) => type === currentType)
		const needsUpdate = settings?.some(
			value =>
				!enabled.has(value.type ?? '') || value.default !== (value.type === currentType)
		)
		const missingTypes: any[] =
			types?.filter((type: any) => !settings?.find(setting => setting.type === type)) ?? []

		if (exists && !needsUpdate && !missingTypes.length) {
			return
		}

		const newSettings =
			settings
				// Remove invalid types.
				?.filter(({ type }) => enabled.has(type ?? ''))
				// Update default attribute.
				?.map(setting => {
					setting.default = setting.type === currentType
					if (setting.minAmount === null) setting.minAmount = MIN_AMOUNT
					if (setting.maxAmount === null) setting.maxAmount = MAX_AMOUNT
					if (setting.unit === null) setting.unit = DEFAULT_UNIT
					return setting
				}) ?? []

		// Initialize missing types with default values.
		for (const type of missingTypes) {
			newSettings.push({
				type,
				// Copy existing amounts from first available.
				amounts: settings?.find(setting => setting?.amounts?.length)?.amounts ?? [],
				default: type === currentType,
				defaultAmount: DEFAULT_AMOUNT,
				unit: DEFAULT_UNIT,
				minAmount: MIN_AMOUNT,
				maxAmount: MAX_AMOUNT,
				helpText: '',
			})
		}

		setAttributes({
			settings: newSettings,
		})
	}, [types, currentType, settings, setAttributes])

	const colsAmounts = Math.max(1, Math.min(3, colsAmountsAttr ?? 3))

	const blockProps = useBlockProps({
		className: 'fame-form__fieldset--amounts',
		style: { ['--amount-cols' as any]: String(colsAmounts) },
	})

	// Use effect hook should ensure that settings will be set to an array.
	if (!settings) return <div {...blockProps}>Loading...</div>

	// Visible if other amount is shown or amount buttons is not empty.
	const visible = isVisible(other, settings)

	return (
		<>
			<BlockControls group="block">
				<AlignmentToolbar
					value={legendAlign}
					onChange={next => setAttributes({ legendAlign: next || 'left' })}
				/>
			</BlockControls>
			<InspectorControls>
				<PanelBody title={__('Settings', 'fame_lahjoitukset')}>
					<ToggleControl
						label={__('Show other amount', 'fame_lahjoitukset')}
						help={__('Show other amount input field', 'fame_lahjoitukset')}
						checked={other}
						onChange={value => setAttributes({ other: value })}
					/>
					<ToggleControl
						label={strings.visibilityLabel}
						help={strings.visibilityHelp}
						disabled={!visible}
						checked={visible && showLegend}
						onChange={value => setAttributes({ showLegend: value })}
					/>
					<TextControl
						label={strings.captionLabel}
						help={strings.captionHelp}
						value={localizedLegend}
						disabled={!visible}
						onChange={value => setAttributes({ legend: value })}
					/>
					{settings.some(({ amounts }) => amounts?.length) && (
						<RangeControl
							label={__('Amount columns', 'fame_lahjoitukset')}
							help={__(
								'Choose 1–3 columns for the form layout.',
								'fame_lahjoitukset'
							)}
							min={1}
							max={3}
							value={colsAmounts}
							onChange={(v?: number) => setAttributes({ colsAmounts: v ?? 3 })}
						/>
					)}
					<Flex justify="initial">
						<Button
							variant="primary"
							onClick={() =>
								setAttributes({
									settings: settings.map(type => addNewAmount(type)),
								})
							}
						>
							{__('Add button', 'fame_lahjoitukset')}
						</Button>
						<Button
							variant="primary"
							disabled={settings.every(({ amounts }) => !amounts?.length)}
							onClick={() =>
								setAttributes({
									settings: settings.map(type => removeLastAmount(type)),
								})
							}
						>
							{__('Remove button', 'fame_lahjoitukset')}
						</Button>
					</Flex>
				</PanelBody>
				{settings.map(type => (
					<PanelBody title={getDonationLabel(type.type ?? '')} key={type.type}>
						<AmountSettingsControl
							other={other}
							visible={visible}
							settings={type}
							onChange={value => {
								setAttributes({ settings: spliceSettings(settings, value) })
							}}
						/>
						<AmountControl
							settings={type}
							onChange={value =>
								setAttributes({ settings: spliceSettings(settings, value) })
							}
						/>
					</PanelBody>
				))}
			</InspectorControls>
			<div {...blockProps}>
				{visible && showLegend && (
					<RichText
						multiline={false}
						tagName="legend"
						className="fame-form__legend"
						aria-label={strings.captionLabel}
						placeholder={DEFAULT_LEGEND}
						allowedFormats={[]}
						value={localizedLegend}
						onChange={value => setAttributes({ legend: value })}
						style={{
							textAlign: legendAlign as CSSProperties['textAlign'],
						}}
					/>
				)}
				<EditContent
					current={current}
					other={other}
					otherLabel={otherLabel}
					setAttributes={setAttributes}
					onChangeSetting={value =>
						setAttributes({ settings: spliceSettings(settings, value) })
					}
				/>
			</div>
		</>
	)
}
