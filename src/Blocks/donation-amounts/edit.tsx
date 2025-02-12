/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n'

/**
 * Imports the InspectorControls component, which is used to wrap
 * the block's custom controls that will appear in the Settings
 * Sidebar when the block is selected.
 *
 * Also imports the React hook that is used to mark the block wrapper
 * element. It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#inspectorcontrols
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import {
	InspectorControls,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor'

/**
 * Imports the necessary components that will be used to create
 * the user interface for the block's settings.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/components/
 */
import {
	PanelBody,
	PanelRow,
	TextControl,
	ToggleControl,
} from '@wordpress/components'

/**
 * Imports the useEffect React Hook. This is used to set an attribute when the
 * block is loaded in the Editor.
 *
 * @see https://react.dev/reference/react/useEffect
 */
import React from 'react'
import AmountControl from './AmountControl.tsx'
import { formatAmount } from '../common/utils.ts'
import { getDonationLabel } from '../common/DonationType.ts'

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
}): React.JSX.Element {
	const { 'famehelsinki/donation-form/types': types } = context
	const { amounts, otherAmount, otherAmountLabel } = attributes

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'fame_lahjoitukset')}>
					<PanelRow>
						<ToggleControl
							label={__('Show other amount', 'fame_lahjoitukset')}
							help={__(
								'Enable other amount option',
								'fame_lahjoitukset'
							)}
							checked={otherAmount}
							onChange={(value) =>
								setAttributes({
									otherAmount: value,
								})
							}
						/>
					</PanelRow>
				</PanelBody>
				{types?.map((type: string) => (
					<PanelBody title={getDonationLabel(type)} key={type}>
						<TextControl
							label={__('Default amount', 'fame_lahjoitukset')}
							help={__(
								'Amount that is preselected.',
								'fame_lahjoitukset'
							)}
							value={0}
							onChange={(value) =>
								setAttributes({
									defaultAmount: formatAmount(value),
								})
							}
						/>
						<TextControl
							label={__('Currency unit', 'fame_lahjoitukset')}
							help={__(
								'Label that is shown next to amounts.',
								'fame_lahjoitukset'
							)}
							value={'€'}
							onChange={(value) =>
								setAttributes({
									defaultAmount: formatAmount(value),
								})
							}
						/>
						<PanelRow>
							<div>
								<AmountControl
									amounts={amounts}
									onChange={(amounts) =>
										setAttributes({ amounts })
									}
								/>
							</div>
						</PanelRow>
					</PanelBody>
				))}
			</InspectorControls>
			<div {...useBlockProps({ className: 'donation-amounts' })}>
				{amounts.map(({ amount }, idx: number) => (
					<div className="donation-amounts__amount" key={idx}>
						{amount} €
					</div>
				))}
				{(otherAmount === true || otherAmount === 'true') && (
					<div className="donation-amounts__other">
						<RichText
							multiline={false}
							tagName="div"
							aria-label={__(
								'Other amount text',
								'fame_lahjoitukset'
							)}
							allowedFormats={['core/bold', 'core/italic']}
							onChange={(otherAmountLabel) =>
								setAttributes({ otherAmountLabel })
							}
							placeholder={__('Other amount')}
							value={otherAmountLabel}
						/>
						<div className="donation-amounts__other__placeholder" />
					</div>
				)}
			</div>
		</>
	)
}
