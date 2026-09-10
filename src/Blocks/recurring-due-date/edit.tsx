import React from 'react'
import { InspectorControls, RichText, useBlockProps } from '@wordpress/block-editor'
import {
	Button,
	CheckboxControl,
	PanelBody,
	TextControl,
	ToggleControl,
} from '@wordpress/components'
import { __, sprintf } from '@wordpress/i18n'
import { EditProps } from '../common/types.ts'
import { useEnabledDonationTypes } from '../common/donation-type.ts'
import { localizedDefault } from '../common/localized-default.ts'
import { captionStrings } from '../common/strings.ts'
import { DEFAULT_DUE_DATE_DAY, DUE_DATE_DAYS, normalizeDueDateDays } from '../common/due-date.ts'
import './edit.css'

type Attributes = {
	label?: string
	showLabel?: boolean
	days?: number[]
}

export default function Edit({
	attributes,
	setAttributes,
	clientId,
}: EditProps<Attributes>): React.JSX.Element {
	const enabledTypes = useEnabledDonationTypes(clientId)
	// Keep the block visible while the enabled types are still unknown.
	const recurringEnabled = enabledTypes === null || enabledTypes.includes('recurring')
	const strings = captionStrings('label')
	const translatedLabel = __('Charge day', 'fame_lahjoitukset')
	const label = localizedDefault(attributes.label, 'Charge day', translatedLabel)
	const days = normalizeDueDateDays(attributes.days)

	// Donors only get to choose when there is something to choose from.
	// Otherwise the day is submitted with a hidden input.
	const visible = days.length > 1
	const submittedDay = days[0] ?? DEFAULT_DUE_DATE_DAY
	const showLabel = attributes.showLabel ?? true
	const helpId = `recurring-due-date-help-${clientId}`

	const toggleDay = (day: number, checked: boolean) =>
		setAttributes({
			days: normalizeDueDateDays(checked ? [...days, day] : days.filter(d => d !== day)),
		})

	let preview: React.JSX.Element

	if (!recurringEnabled) {
		preview = (
			<div>
				<div>
					{label} ({__('hidden', 'fame_lahjoitukset')})
				</div>
				<p className="fame-form__hidden-help">
					{__('Hidden because recurring donations are not enabled.', 'fame_lahjoitukset')}
				</p>
			</div>
		)
	} else if (visible) {
		preview = (
			<>
				{showLabel && (
					<RichText
						tagName="label"
						className="fame-form__label"
						aria-label={strings.captionLabel}
						placeholder={translatedLabel}
						value={label}
						allowedFormats={[]}
						onChange={nextLabel => setAttributes({ label: nextLabel })}
					/>
				)}
				<select
					className="fame-form__input"
					aria-label={showLabel ? undefined : label}
					aria-describedby={helpId}
					value={String(submittedDay)}
					disabled
					onChange={() => {}}
				>
					{days.map(day => (
						<option key={day} value={String(day)}>
							{day}
						</option>
					))}
				</select>
				<p className="fame-form__help" id={helpId}>
					{__(
						'The donation will be charged on this day each month.',
						'fame_lahjoitukset'
					)}
				</p>
			</>
		)
	} else {
		preview = (
			<div>
				<div>
					{label}: {submittedDay} ({__('hidden', 'fame_lahjoitukset')})
				</div>
				<p className="fame-form__hidden-help">
					{days.length === 1
						? __(
								'Hidden because only one charge day is configured.',
								'fame_lahjoitukset'
							)
						: __('Hidden because no charge days are configured.', 'fame_lahjoitukset')}
				</p>
			</div>
		)
	}

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'fame_lahjoitukset')}>
					<ToggleControl
						label={strings.visibilityLabel}
						help={strings.visibilityHelp}
						checked={showLabel}
						disabled={!visible}
						onChange={nextShowLabel => setAttributes({ showLabel: nextShowLabel })}
					/>

					<TextControl
						label={strings.captionLabel}
						help={strings.captionHelp}
						value={label}
						disabled={!visible}
						onChange={nextLabel => setAttributes({ label: nextLabel })}
					/>

					<div>
						<p style={{ marginBottom: 4 }}>{__('Charge days', 'fame_lahjoitukset')}</p>
						<p style={{ color: '#757575', fontSize: 12, margin: '0 0 8px' }}>
							{sprintf(
								/* translators: %d: charge day used when no days are selected. */
								__(
									'Select at least two days to let donors choose. With fewer, the first selected day (or day %d) is submitted without showing the field.',
									'fame_lahjoitukset'
								),
								DEFAULT_DUE_DATE_DAY
							)}
						</p>

						<div
							style={{
								display: 'grid',
								// Narrow sidebars fit fewer columns; auto-fill keeps the
								// checkboxes from overflowing the panel.
								gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))',
								gap: 4,
							}}
						>
							{DUE_DATE_DAYS.map(day => (
								<CheckboxControl
									key={day}
									__nextHasNoMarginBottom
									label={String(day)}
									// The visible label is just the number to keep the
									// grid compact; the accessible name spells it out.
									aria-label={sprintf(
										/* translators: %d: day of month. */
										__('Day %d', 'fame_lahjoitukset'),
										day
									)}
									checked={days.includes(day)}
									onChange={checked => toggleDay(day, checked)}
								/>
							))}
						</div>

						<div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
							<Button
								variant="secondary"
								size="small"
								onClick={() => setAttributes({ days: [...DUE_DATE_DAYS] })}
							>
								{__('Select all', 'fame_lahjoitukset')}
							</Button>
							<Button
								variant="secondary"
								size="small"
								disabled={days.length === 0}
								onClick={() => setAttributes({ days: [] })}
							>
								{__('Clear', 'fame_lahjoitukset')}
							</Button>
						</div>
					</div>
				</PanelBody>
			</InspectorControls>

			<div {...useBlockProps({ className: 'recurring-due-date' })}>{preview}</div>
		</>
	)
}
