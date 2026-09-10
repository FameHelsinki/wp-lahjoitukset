import React, { useMemo, useEffect, CSSProperties } from 'react'
import { __ } from '@wordpress/i18n'
import { useDispatch, useSelect } from '@wordpress/data'
import {
	useBlockProps,
	InspectorControls,
	RichText,
	AlignmentToolbar,
	BlockControls,
	InnerBlocks,
} from '@wordpress/block-editor'
import {
	PanelBody,
	Flex,
	CheckboxControl,
	TextControl,
	ToggleControl,
	Notice,
	Spinner,
} from '@wordpress/components'
import { EditProps } from '../common/types.ts'
import { Provider, providerDisplayLabel } from '../common/Providers.ts'
import { useProviders } from '../common/useProviders.ts'
import {
	getDonationLabel,
	useCurrentDonationType,
	useEnabledDonationTypes,
} from '../common/donation-type.ts'
import { localizedDefault } from '../common/localized-default.ts'
import { captionStrings } from '../common/strings.ts'

export type FlatProvider = Provider & { type: string }

const DEFAULT_TERMS_PLACEHOLDERS = new Set([
	'Terms text…',
	'Add privacy policy and terms text here…',
	'Lisää tietosuojaselosteen ja käyttöehtojen teksti tähän…',
	'Lägg till text för integritetspolicy och villkor här…',
])

export type Attributes = {
	legend?: string
	providers?: FlatProvider[]
	showLegend?: boolean
	legendAlign?: string
}

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 */
export default function Edit({ attributes, setAttributes, clientId }: EditProps<Attributes>) {
	const {
		providers = [],
		legend: savedLegend,
		showLegend = true,
		legendAlign = 'left',
	} = attributes
	const strings = captionStrings('legend')
	const translatedLegend = __('Payment provider', 'fame_lahjoitukset')
	const legend = localizedDefault(
		localizedDefault(savedLegend, 'Provider type', translatedLegend),
		'Payment provider',
		translatedLegend
	)

	const donationTypes = useEnabledDonationTypes(clientId)
	const currentType = useCurrentDonationType(clientId)
	const blockProps = useBlockProps()
	const termsPlaceholder = __('Add privacy policy and terms text here…', 'fame_lahjoitukset')
	const innerBlocks = useSelect(
		select => {
			const blockEditor = select('core/block-editor') as any
			return blockEditor.getBlocks(clientId) as any[]
		},
		[clientId]
	)
	const { updateBlockAttributes } = useDispatch('core/block-editor') as any

	useEffect(() => {
		for (const innerBlock of innerBlocks) {
			if (innerBlock.name !== 'core/paragraph') continue
			if (!String(innerBlock.attributes?.className ?? '').includes('fame-form__terms')) {
				continue
			}

			const savedPlaceholder = String(innerBlock.attributes?.placeholder ?? '')
			if (
				DEFAULT_TERMS_PLACEHOLDERS.has(savedPlaceholder) &&
				savedPlaceholder !== termsPlaceholder
			) {
				updateBlockAttributes(innerBlock.clientId, { placeholder: termsPlaceholder })
			}
		}
	}, [innerBlocks, termsPlaceholder, updateBlockAttributes])

	const [rawAvailable, loading, error] = useProviders()
	const available = useMemo(() => {
		const paytrail = rawAvailable.find(p => p.value.toLowerCase() === 'paytrail')
		if (!paytrail) return rawAvailable

		return rawAvailable.flatMap(provider => {
			if (provider.value.toLowerCase() !== 'checkout') return [provider]

			const remainingTypes = provider.types.filter(type => !paytrail.types.includes(type))
			return remainingTypes.length ? [{ ...provider, types: remainingTypes }] : []
		})
	}, [rawAvailable])

	useEffect(() => {
		// Wait until the available providers have loaded so we don't seed
		// defaults from an empty list before the API responds.
		if (!available.length) return
		// Enabled donation types are not known yet.
		if (!donationTypes) return

		const missing = donationTypes.filter(type => !providers.some(p => p.type === type))
		if (!missing.length) return

		const defaults = missing
			.map(type => {
				const match = available.find(p => p.types.includes(type))
				return match ? ({ ...match, type } as FlatProvider) : null
			})
			.filter(Boolean) as FlatProvider[]

		if (defaults.length) setAttributes({ providers: [...providers, ...defaults] })
	}, [donationTypes, providers, available, setAttributes])

	useEffect(() => {
		// Keep saved selections while the provider request is pending or has
		// failed. Once the request succeeds, the backend list is authoritative:
		// providers disabled for the organization must not remain visible in the
		// preview without a corresponding checkbox in the inspector.
		if (loading || error) return
		// Without the enabled donation types every saved provider would be
		// filtered out below, so leave the selections alone.
		if (!donationTypes) return

		const paytrail = available.find(p => p.value.toLowerCase() === 'paytrail')
		const normalized: FlatProvider[] = []

		for (const provider of providers.filter(p => donationTypes.includes(p.type))) {
			const isNativePaytrail = provider.value.toLowerCase() === 'paytrail'
			const shouldMigrate =
				provider.value.toLowerCase() === 'checkout' &&
				paytrail !== undefined &&
				paytrail.types.includes(provider.type)
			const next =
				shouldMigrate && paytrail
					? {
							...provider,
							value: paytrail.value,
							label: providerDisplayLabel(paytrail.value, provider.label),
						}
					: provider
			const isAvailable = available.some(
				item =>
					item.value.toLowerCase() === next.value.toLowerCase() &&
					item.types.includes(next.type)
			)

			if (!isAvailable) continue

			const duplicateIndex = normalized.findIndex(
				item =>
					item.type === next.type && item.value.toLowerCase() === next.value.toLowerCase()
			)

			if (duplicateIndex === -1) {
				normalized.push(next)
			} else if (isNativePaytrail) {
				normalized[duplicateIndex] = next
			}
		}

		if (JSON.stringify(normalized) !== JSON.stringify(providers)) {
			setAttributes({ providers: normalized })
		}
	}, [available, donationTypes, error, loading, providers, setAttributes])

	const grouped = providers.reduce<Record<string, FlatProvider[]>>((acc, p) => {
		if (!acc[p.type]) acc[p.type] = []
		acc[p.type].push(p)
		return acc
	}, {})

	// A donation type with a single provider submits it with a hidden input and
	// renders no legend at all.
	const groups = Object.values(grouped)
	const legendNeverRendered = groups.length > 0 && groups.every(list => list.length === 1)

	const updateProvider = (donationType: string, value: string, checked: boolean) => {
		const current = grouped[donationType] ?? []
		const exists = current.find(p => p.value === value)

		let updated: FlatProvider[]
		if (checked) {
			if (exists) {
				updated = current
			} else {
				const data = available.find(p => p.value === value)
				if (!data) return
				updated = [...current, { ...data, type: donationType }]
			}
		} else {
			updated = current.filter(p => p.value !== value)
		}

		const newGrouped = { ...grouped, [donationType]: updated }
		setAttributes({
			providers: Object.entries(newGrouped).flatMap(([t, list]) =>
				list.map(p => ({ ...p, type: t }))
			),
		})
	}

	const updateLabel = (donationType: string, value: string, label: string) => {
		const current = grouped[donationType] ?? []
		const updated = current.map(p => (p.value === value ? { ...p, label } : p))
		const newGrouped = { ...grouped, [donationType]: updated }

		setAttributes({
			providers: Object.entries(newGrouped).flatMap(([t, list]) =>
				list.map(p => ({ ...p, type: t }))
			),
		})
	}

	return (
		<>
			<BlockControls group="block">
				<AlignmentToolbar
					value={legendAlign}
					onChange={next => setAttributes({ legendAlign: next || 'left' })}
				/>
			</BlockControls>
			<InspectorControls>
				<PanelBody title={__('General settings', 'fame_lahjoitukset')}>
					<ToggleControl
						label={strings.visibilityLabel}
						help={strings.visibilityHelp}
						checked={showLegend}
						disabled={legendNeverRendered}
						onChange={value => setAttributes({ showLegend: value })}
					/>
					<TextControl
						label={strings.captionLabel}
						value={legend}
						disabled={legendNeverRendered}
						onChange={value => setAttributes({ legend: value })}
						help={strings.captionHelp}
					/>
				</PanelBody>
				{loading && (
					<PanelBody>
						<Flex justify="flex-start" gap={2}>
							<Spinner />
							<span>{__('Loading providers…', 'fame_lahjoitukset')}</span>
						</Flex>
					</PanelBody>
				)}
				{!loading && error && (
					<PanelBody>
						<Notice status="error" isDismissible={false}>
							{__(
								'Could not load payment providers from lahjoitin.fi. Existing selections are kept; the live list will be used when the connection is restored.',
								'fame_lahjoitukset'
							)}
						</Notice>
					</PanelBody>
				)}
				{!loading && !error && !available.length && (
					<PanelBody>
						<Notice status="warning" isDismissible={false}>
							{__(
								'No payment providers are enabled for this organization. Check the slug in the Lahjoitukset settings.',
								'fame_lahjoitukset'
							)}
						</Notice>
					</PanelBody>
				)}
				{(donationTypes ?? []).map(type => {
					const selected = new Set((grouped[type] ?? []).map(p => p.value))

					return (
						<PanelBody title={getDonationLabel(type)} key={type}>
							<Flex direction="column" gap={2}>
								{available
									.filter(p => p.types.includes(type))
									.map(p => (
										<CheckboxControl
											key={p.value}
											label={providerDisplayLabel(p.value, p.label)}
											checked={selected.has(p.value)}
											onChange={checked =>
												updateProvider(type, p.value, checked)
											}
										/>
									))}

								{(grouped[type] ?? []).map(p => (
									<TextControl
										key={p.value}
										label={`${providerDisplayLabel(p.value, p.label)} ${__('label', 'fame_lahjoitukset')}`}
										value={providerDisplayLabel(p.value, p.label)}
										onChange={val => updateLabel(type, p.value, val)}
									/>
								))}
							</Flex>
						</PanelBody>
					)
				})}
			</InspectorControls>

			<div {...blockProps}>
				{Object.entries(grouped).map(([type, list]) => {
					if (currentType && type !== currentType) return null

					const isSingle = list.length === 1

					return (
						<fieldset
							key={type}
							className="payment-method-selector fame-form__fieldset"
							style={{ width: '100%', boxSizing: 'border-box' }}
							data-type={type}
						>
							{showLegend && !isSingle && (
								<RichText
									tagName="legend"
									multiline={false}
									className="fame-form__legend"
									aria-label={strings.captionLabel}
									placeholder={translatedLegend}
									allowedFormats={[]}
									value={legend}
									onChange={le => setAttributes({ legend: le })}
									style={{
										textAlign: legendAlign as CSSProperties['textAlign'],
										fontFamily: 'inherit',
									}}
								/>
							)}

							{isSingle ? (
								<div>
									<div>
										{legend}:{' '}
										{providerDisplayLabel(list[0].value, list[0].label)} (
										{__('hidden', 'fame_lahjoitukset')})
									</div>
									<p className="fame-form__hidden-help">
										{__(
											'Hidden because only one payment provider is configured.',
											'fame_lahjoitukset'
										)}
									</p>
								</div>
							) : (
								list.map(p => (
									<div
										className="fame-form__group"
										key={`${type}-${p.value}`}
										data-type={type}
									>
										{/* Placeholder mimics the radio button in Gutenberg UI. */}
										<div className="fame-form__label">
											<RichText
												tagName="span"
												value={providerDisplayLabel(p.value, p.label)}
												onChange={val => updateLabel(type, p.value, val)}
												allowedFormats={[]}
												placeholder={__('Label', 'fame_lahjoitukset')}
											/>
										</div>
									</div>
								))
							)}
						</fieldset>
					)
				})}
				<InnerBlocks
					allowedBlocks={['core/paragraph']}
					template={[
						[
							'core/paragraph',
							{
								className: 'fame-form__terms',
								placeholder: termsPlaceholder,
							},
						],
					]}
					templateLock="all"
				/>
			</div>
		</>
	)
}
