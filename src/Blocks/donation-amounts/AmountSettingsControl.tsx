import React, { FC } from 'react'
import { __ } from '@wordpress/i18n'
import { RadioControl, TextControl } from '@wordpress/components'
import {
	DEFAULT_AMOUNT,
	DEFAULT_UNIT,
	MIN_AMOUNT,
	MAX_AMOUNT,
	AmountSetting,
	formatAmount,
} from '../common/donation-amount.ts'

type Props = {
	other?: boolean
	visible: boolean
	settings: AmountSetting
	onChange: (value: AmountSetting) => void
}

const AmountSettingsControl: FC<Props> = ({ settings, other, visible, onChange }) => (
	<>
		{visible && (
			<TextControl
				label={__('Currency label', 'fame_lahjoitukset')}
				help={__(
					'Label that is shown next to amounts. This does not control actual donation currency. Currently only euros are supported.',
					'fame_lahjoitukset'
				)}
				value={settings.unit ?? DEFAULT_UNIT}
				onChange={value => onChange({ ...settings, unit: value })}
			/>
		)}
		{other || !settings.amounts?.length ? (
			<>
				<TextControl
					label={__('Default amount', 'fame_lahjoitukset')}
					help={__('Amount that is preselected.', 'fame_lahjoitukset')}
					value={settings.defaultAmount ?? DEFAULT_AMOUNT}
					onChange={value =>
						onChange({ ...settings, defaultAmount: formatAmount(value, 0) })
					}
				/>
				{other && (
					<>
						<TextControl
							label={__('Min Amount', 'fame_lahjoitukset')}
							help={__('Minimum amount for other amount field.', 'fame_lahjoitukset')}
							value={(settings.minAmount ?? MIN_AMOUNT).toString()}
							onChange={value =>
								onChange({ ...settings, minAmount: formatAmount(value, 0) })
							}
						/>
						<TextControl
							label={__('Max Amount', 'fame_lahjoitukset')}
							help={__('Maximum amount for other amount field.', 'fame_lahjoitukset')}
							value={(settings.maxAmount ?? MAX_AMOUNT).toString()}
							onChange={value =>
								onChange({ ...settings, maxAmount: formatAmount(value, 0) })
							}
						/>
					</>
				)}
			</>
		) : (
			<RadioControl
				label={__('Default amount', 'fame_lahjoitukset')}
				help={__('Amount that is preselected.', 'fame_lahjoitukset')}
				selected={(
					settings.defaultAmount ??
					settings.amounts?.[0]?.value ??
					DEFAULT_AMOUNT
				).toString()}
				options={settings.amounts?.map(({ value }) => ({
					label: `${value} ${settings.unit ?? DEFAULT_UNIT}`,
					value: (value ?? DEFAULT_AMOUNT).toString(),
				}))}
				onChange={value => onChange({ ...settings, defaultAmount: formatAmount(value, 0) })}
			/>
		)}
	</>
)

export default AmountSettingsControl
