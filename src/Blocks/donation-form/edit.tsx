import { __ } from '@wordpress/i18n'
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor'
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components'
import React, { useEffect } from 'react'
import { DEFAULT_DONATION_TYPE } from '../common/DonationType.ts'
import TypeControl from './TypeControl.tsx'

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */
export default function Edit({ attributes, setAttributes }): React.JSX.Element {
	const { types, returnAddress, campaign, token } = attributes as {
		types?: string[]
		returnAddress?: string
		campaign?: string
		token?: boolean
	}

	// Having a type is always required. Set a default
	// value if the list is uninitialized or empty.
	useEffect(() => {
		if (!types) {
			setAttributes({ types: [DEFAULT_DONATION_TYPE.value] })
		}
	}, [types, setAttributes])

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'fame_lahjoitukset')}>
					<TypeControl
						types={types}
						onChange={(types) => setAttributes({ types })}
					/>
					<TextControl
						label={__('Return address', 'fame_lahjoitukset')}
						help={__(
							'Page that is displayed after donation is submitted.',
							'fame_lahjoitukset'
						)}
						value={returnAddress ?? ''}
						onChange={(returnAddress) =>
							setAttributes({ returnAddress })
						}
					/>
					<TextControl
						label={__('Campaign', 'fame_lahjoitukset')}
						help={__(
							'Label that can be used to segment donations coming from this form.',
							'fame_lahjoitukset'
						)}
						value={campaign ?? ''}
						onChange={(campaign) => setAttributes({ campaign })}
					/>
					<ToggleControl
						label={__('Return userinfo token', 'fame_lahjoitukset')}
						help={__(
							'This option includes userinfo token in the return address. This is not generally useful and requires custom logic to handle the token.',
							'fame_lahjoitukset'
						)}
						checked={token}
						onChange={(token) => setAttributes({ token })}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...useBlockProps()}>
				<div
					{...useInnerBlocksProps(
						{
							className: 'donation-form__inner-blocks',
						},
						{
							// prevents inserting or removing blocks,
							// but allows moving existing ones.
							templateLock: 'insert',
							template: [
								['famehelsinki/donation-type'],
								['famehelsinki/donation-amounts'],
								['famehelsinki/form-controls'],
							],
						}
					)}
				/>
			</div>
		</>
	)
}
