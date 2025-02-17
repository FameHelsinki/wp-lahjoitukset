import React, { FC } from 'react'
import { __ } from '@wordpress/i18n'
import { RadioControl, TextControl } from '@wordpress/components'
import {
	DEFAULT_AMOUNT,
	DEFAULT_UNIT,
	AmountSetting,
	formatAmount,
	Amount,
} from '../common/donation-amount.ts'

type Props = {
	type: string
	other?: boolean
	amounts: Amount[]
	settings: AmountSetting
	showLegend?: boolean
	onChange: (value: AmountSetting) => void
}

const AmountSettingsControl: FC<Props> = ({ settings, other, amounts, type, onChange }) => (
	<>
		<TextControl
			label={__('Currency unit', 'fame_lahjoitukset')}
			help={__('Unit that is shown next to amounts.', 'fame_lahjoitukset')}
			value={settings.unit ?? DEFAULT_UNIT}
			onChange={value => onChange({ ...settings, type, unit: value })}
		/>
		{other || !amounts.length ? (
			<TextControl
				label={__('Default amount', 'fame_lahjoitukset')}
				help={__('Amount that is preselected.', 'fame_lahjoitukset')}
				value={settings.amount ?? DEFAULT_AMOUNT}
				onChange={value => onChange({ ...settings, type, amount: formatAmount(value, 0) })}
			/>
		) : (
			<RadioControl
				label={__('Default amount', 'fame_lahjoitukset')}
				help={__('Amount that is preselected.', 'fame_lahjoitukset')}
				selected={(settings.amount ?? amounts?.[0]?.amount ?? DEFAULT_AMOUNT).toString()}
				options={amounts?.map(({ amount = DEFAULT_AMOUNT }) => ({
					label: `${amount} ${settings.unit ?? DEFAULT_UNIT}`,
					value: amount.toString(),
				}))}
				onChange={value => onChange({ ...settings, type, amount: formatAmount(value, 0) })}
			/>
		)}
	</>
)

export default AmountSettingsControl
