import React, { FC } from 'react'
import { AmountSetting, DEFAULT_AMOUNT } from '../common/donation-amount.ts'
import { RichText } from '@wordpress/block-editor'
import { __ } from '@wordpress/i18n'

type Props = {
	current?: AmountSetting
	showLegend?: boolean
	other?: boolean
	otherLabel?: string
	setAttributes: (attributes: any) => void
}

const EditContent: FC<Props> = ({ current, other, otherLabel, setAttributes }) => {
	if (!current) return null

	if (!other && !current?.amounts?.length) {
		return `Amount: ${current?.defaultAmount} (hidden)`
	}

	return (
		<div className={`donation-amounts donaton-amounts--${current.type}`}>
			{current.amounts
				?.filter(({ value }) => value)
				?.map(({ value }) => (
					<div className="fame-form__group" key={`${current.type}-${value}`}>
						<div
							className={
								'fame-form__label' +
								(+(current.defaultAmount ?? DEFAULT_AMOUNT) === +value!
									? ' fame-form__label--default'
									: '')
							}
						>
							{value} <span className="donation-amounts__unit">{current.unit}</span>
						</div>
					</div>
				))}

			{other && (
				<div className="donation-amounts__other-edit">
					<RichText
						multiline={false}
						tagName="div"
						aria-label={__('Other amount text', 'fame_lahjoitukset')}
						allowedFormats={['core/bold', 'core/italic']}
						onChange={value => setAttributes({ otherLabel: value })}
						placeholder={__('Other amount', 'fame_lahjoitukset')}
						value={otherLabel ?? __('Other amount', 'fame_lahjoitukset')}
					/>
					{/* Placeholder mimics input field in Gutenberg UI. */}
					<div className="donation-amounts__other__placeholder">
						{current.defaultAmount} {current.unit}
					</div>
				</div>
			)}
		</div>
	)
}

export default EditContent
