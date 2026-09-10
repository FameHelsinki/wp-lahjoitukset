import React from 'react'
import { __ } from '@wordpress/i18n'
import {
	InspectorControls,
	RichText,
	useBlockProps,
	AlignmentToolbar,
	BlockControls,
} from '@wordpress/block-editor'
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components'
import ContactInputControl from './ContactInputControl.tsx'
import ContactInputGroup from './ContactInputGroup.tsx'
import { EditProps } from '../common/types.ts'
import { localizedDefault } from '../common/localized-default.ts'
import { captionStrings } from '../common/strings.ts'

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */
export default function Edit({ attributes, setAttributes }: EditProps): React.JSX.Element {
	const { contact, showAddress, showPhone, showLegend, legend, legendAlign = 'left' } = attributes
	const { show = true } = attributes as { show?: boolean }
	const strings = captionStrings('legend')
	const translatedLegend = __('Contacts', 'fame_lahjoitukset')
	const localizedLegend = localizedDefault(legend, 'Contacts', translatedLegend)

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
						label={__('Enable contact fields', 'fame_lahjoitukset')}
						checked={attributes.show}
						onChange={value => setAttributes({ show: value })}
					/>

					{show && (
						<>
							<ToggleControl
								label={__('Require contact', 'fame_lahjoitukset')}
								help={__(
									'Contact details are required if enabled',
									'fame_lahjoitukset'
								)}
								checked={contact}
								onChange={value => setAttributes({ contact: value })}
							/>
							<ToggleControl
								label={__('Show address', 'fame_lahjoitukset')}
								help={__('Show address fields', 'fame_lahjoitukset')}
								checked={showAddress}
								onChange={value => setAttributes({ showAddress: value })}
							/>
							<ToggleControl
								label={__('Show phone', 'fame_lahjoitukset')}
								help={__('Show phone number fields', 'fame_lahjoitukset')}
								checked={showPhone}
								onChange={value => setAttributes({ showPhone: value })}
							/>
							<ToggleControl
								label={strings.visibilityLabel}
								checked={showLegend}
								onChange={checked => setAttributes({ showLegend: checked })}
								help={strings.visibilityHelp}
							/>
							<TextControl
								label={strings.captionLabel}
								help={strings.captionHelp}
								value={localizedLegend}
								onChange={value => setAttributes({ legend: value })}
							/>
						</>
					)}
				</PanelBody>
			</InspectorControls>

			<div {...useBlockProps({ className: 'contact-form' })}>
				{show ? (
					<>
						{showLegend && (
							<RichText
								multiline={false}
								tagName="legend"
								className={[
									'fame-form__legend',
									!showLegend ? 'screen-reader-text' : '',
									legendAlign ? `has-text-align-${legendAlign}` : '',
								]
									.filter(Boolean)
									.join(' ')}
								aria-label={strings.captionLabel}
								placeholder={translatedLegend}
								allowedFormats={[]}
								value={localizedLegend}
								onChange={value => setAttributes({ legend: value })}
								style={{
									textAlign: legendAlign as React.CSSProperties['textAlign'],
								}}
							/>
						)}
						<ContactInputGroup
							name="name"
							controls={[
								{
									name: 'first_name',
									required: contact,
								},
								{
									name: 'last_name',
									required: contact,
								},
							]}
							attributes={attributes}
							setAttributes={setAttributes}
						/>
						<ContactInputControl
							name="email"
							required={contact}
							attributes={attributes}
							setAttributes={setAttributes}
						/>
						{showAddress && (
							<>
								<ContactInputControl
									name="address"
									attributes={attributes}
									setAttributes={setAttributes}
								/>
								<ContactInputGroup
									name="city_postal_code"
									controls={[{ name: 'city' }, { name: 'postal_code' }]}
									attributes={attributes}
									setAttributes={setAttributes}
								/>
							</>
						)}
						{showPhone && (
							<ContactInputControl
								name="phone"
								attributes={attributes}
								setAttributes={setAttributes}
							/>
						)}
					</>
				) : (
					<div
						className="fame-form__hidden-placeholder"
						style={{ padding: 12, border: '1px dashed #ccc' }}
					>
						{__(
							'The contact form is not in use. Use the toggle in the sidebar to enable it.',
							'fame_lahjoitukset'
						)}
					</div>
				)}
			</div>
		</>
	)
}
