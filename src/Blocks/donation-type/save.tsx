import { useBlockProps } from '@wordpress/block-editor'
import React from 'react'
import { DEFAULT_DONATION_TYPE, DonationType } from '../common/donation-type.ts'
import { SaveProps } from '../common/types.ts'

type Attributes = {
	types?: DonationType[]
	value?: string
}

/**
 * The save function defines the way in which the different attributes should
 * be combined into the final markup, which is then serialized by the block
 * editor into `post_content`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 */
export default function save({ attributes }: SaveProps<Attributes>): React.JSX.Element {
	const { types, value: defaultValue } = attributes

	if (!Array.isArray(types) || types.length <= 1) {
		return (
			<input
				{...useBlockProps.save({ className: 'donation-type' })}
				type="hidden"
				name="type"
				value={types?.[0]?.value ?? DEFAULT_DONATION_TYPE.value}
			/>
		)
	}

	return (
		<fieldset {...useBlockProps.save({ className: 'donation-type' })}>
			{/* todo: add legend here */}
			<div className="donation-type__controls">
				{types.map(({ value, label }) => (
					<label
						key={value}
						htmlFor={`donation-type-${value}`}
						className="donation-type__label"
					>
						<input
							id={`donation-type-${value}`}
							className="donation-type__input"
							checked={value === defaultValue}
							type="radio"
							name="type"
							value={value}
						/>
						{label}
					</label>
				))}
			</div>
		</fieldset>
	)
}
