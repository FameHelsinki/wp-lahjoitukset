import AmountHandler, { AmountMessages } from './AmountHandler.ts'
import Validation, { ErrorTranslations, getErrorType } from './Validation.ts'
import { FormResultEvent, FormSubmitEvent } from './Events.ts'

/**
 * All translatable strings used by the donation form, bundled into a single
 * object. The caller passes one bundle; FormHandler distributes the pieces to
 * the sub-components that render them.
 */
export type Translations = {
	errors?: ErrorTranslations
	amount?: AmountMessages
}

type FormControlElement =
	| HTMLInputElement
	| HTMLTextAreaElement
	| HTMLSelectElement
	| HTMLButtonElement

function isFormControl(element: any): element is FormControlElement {
	return (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLButtonElement
	)
}

export default class FormHandler {
	readonly #url: string
	readonly #slug: string
	readonly #form: HTMLFormElement
	readonly #submit: NodeListOf<HTMLButtonElement | HTMLInputElement>
	readonly #amount: AmountHandler
	readonly #translations: ErrorTranslations

	#providerField: HTMLInputElement | null
	#providerRadios: NodeListOf<HTMLInputElement>
	#providerHiddens: NodeListOf<HTMLInputElement>
	#providerSections: NodeListOf<HTMLElement>
	#typeRadios: NodeListOf<HTMLInputElement>
	#dueDateSections: NodeListOf<HTMLElement>
	#dueDateInputs: NodeListOf<HTMLSelectElement | HTMLInputElement>

	get form() {
		return this.#form
	}

	get amount() {
		return this.#amount
	}

	constructor(url: string, slug: string, form: HTMLFormElement, translations: Translations = {}) {
		this.#url = url
		this.#slug = slug
		this.#form = form

		this.#submit = this.#form.querySelectorAll('[type="submit"]')
		this.#amount = new AmountHandler(this.#form, translations.amount)
		this.#translations = translations.errors ?? {}

		// Initialize form elements.
		this.#providerField = this.#form.querySelector<HTMLInputElement>(
			'input[name="provider"][data-selected-provider]'
		)
		this.#providerRadios = this.#form.querySelectorAll<HTMLInputElement>(
			'input[type="radio"][name="provider"]'
		)
		this.#providerHiddens = this.#form.querySelectorAll<HTMLInputElement>(
			'input[type="hidden"][name="provider"][data-type]'
		)
		this.#providerSections = this.#form.querySelectorAll<HTMLElement>(
			'fieldset.payment-method-selector[data-type]'
		)
		this.#typeRadios = this.#form.querySelectorAll<HTMLInputElement>('input[name="type"]')
		this.#dueDateSections = this.#form.querySelectorAll<HTMLElement>(
			'[data-recurring-due-date]'
		)
		// The day is a <select> when several days are configured and a hidden
		// input otherwise.
		this.#dueDateInputs = this.#form.querySelectorAll<HTMLSelectElement | HTMLInputElement>(
			'[data-recurring-due-date-input]'
		)

		this.#form.addEventListener('submit', this.#onSubmit.bind(this))
		this.#form.addEventListener('fame-lahjoitukset-amount-validity', () => {
			this.#allowSubmit(this.#canSubmit())
		})

		// Bind events to provider radios and type radios.
		this.#bindProviderEvents()

		Array.prototype.forEach.call(this.#form.elements, element =>
			element.addEventListener('change', (event: Event) => {
				const target = event.target

				// Clear any custom errors on change.
				if (
					isFormControl(target) &&
					target.dataset['custom-validator'] === undefined &&
					target.validity.customError
				) {
					target.setCustomValidity('')
				}
			})
		)

		// Form submit requires JavaScript and an available payment provider, so all
		// submit buttons are disabled by default.
		this.#allowSubmit(this.#canSubmit())
	}

	/**
	 * This method binds events to provider radios and type
	 */
	#bindProviderEvents() {
		this.#filterProvidersByType()
		this.#filterDueDateByType()
		this.#updateProvider()
		this.#updateSubmitLabel()

		this.#providerRadios.forEach(r =>
			r.addEventListener('change', () => {
				this.#updateProvider()
				this.#allowSubmit(this.#canSubmit())
			})
		)

		this.#typeRadios.forEach(r =>
			r.addEventListener('change', () => {
				this.#filterProvidersByType()
				this.#filterDueDateByType()
				this.#updateProvider()
				this.#updateSubmitLabel()
				this.#allowSubmit(this.#canSubmit())
			})
		)
	}

	/**
	 * Only recurring donations submit a due_date. Disabled controls are omitted
	 * from FormData and ignored by native constraint validation.
	 */
	#filterDueDateByType() {
		let selectedType = Array.from(this.#typeRadios).find(r => r.checked)?.value
		if (!selectedType && this.#typeRadios.length === 1) {
			selectedType = this.#typeRadios[0].value
		}

		const active = selectedType === 'recurring'
		this.#dueDateSections.forEach(section => {
			section.hidden = !active
			section.setAttribute('aria-hidden', String(!active))
		})
		this.#dueDateInputs.forEach(input => {
			input.disabled = !active
		})
	}

	/**
	 * Show only the provider-fieldset of the selected type.
	 * If there is one option, it is automatically selected.
	 */
	#filterProvidersByType() {
		let selectedType = Array.from(this.#typeRadios).find(r => r.checked)?.value
		if (!selectedType && this.#typeRadios.length === 1) {
			selectedType = this.#typeRadios[0].value
			this.#typeRadios[0].checked = true
		}
		if (!selectedType) return

		this.#providerHiddens.forEach(h => {
			h.disabled = h.dataset.type !== selectedType
		})

		this.#providerSections.forEach(section => {
			const active = section.dataset.type === selectedType
			section.hidden = !active
			section.setAttribute('aria-hidden', String(!active))
			section.classList.remove('payment-method-selector--single')
			if (active) {
				const radios = section.querySelectorAll<HTMLInputElement>('input[type="radio"]')
				section.classList.toggle('payment-method-selector--single', radios.length === 1)
				if (radios.length === 1 && !radios[0].checked) {
					radios[0].checked = true
				}
			}
		})
		this.#updateSubmitLabel()
	}

	#hasAvailableProvider(): boolean {
		return !!this.#providerField?.value && this.#providerField.value.trim() !== ''
	}

	#canSubmit(): boolean {
		return this.#hasAvailableProvider() && !this.#amount.invalid
	}

	/**
	 * Update providerField value.
	 */
	#updateProvider() {
		if (!this.#providerField) return

		const selectedType = Array.from(this.#typeRadios).find(r => r.checked)?.value
		if (!selectedType) {
			this.#providerField.value = ''
			return
		}

		const activeSection = Array.from(this.#providerSections).find(
			fs => fs.dataset.type === selectedType && !fs.hidden
		)

		const checkedRadio =
			activeSection?.querySelector<HTMLInputElement>('input[type="radio"]:checked') || null

		if (checkedRadio) {
			this.#providerField.value = checkedRadio.value
			return
		}

		const singleHidden = activeSection?.querySelector<HTMLInputElement>(
			'input[type="hidden"][name="provider"]'
		)
		this.#providerField.value = singleHidden?.value ?? ''
	}

	/**
	 * Update submit button text based on selected donation type.
	 */
	#updateSubmitLabel() {
		const selectedType = Array.from(this.#typeRadios).find(r => r.checked)?.value
		if (!selectedType) return

		this.#submit.forEach(btn => {
			const el = btn as HTMLButtonElement | HTMLInputElement

			// Button
			if (el instanceof HTMLButtonElement) {
				const singleLabel = el.dataset.labelSingle
				const recurringLabel = el.dataset.labelRecurring

				// fallback to old pages: current button text
				const fallback = el.textContent?.trim() || ''

				el.textContent =
					selectedType === 'recurring'
						? (recurringLabel ?? fallback)
						: (singleLabel ?? fallback)

				return
			}

			// <input type="submit">
			if (el instanceof HTMLInputElement) {
				const singleLabel = el.dataset.labelSingle
				const recurringLabel = el.dataset.labelRecurring

				// fallback to old pages: current value
				const fallback = el.value

				el.value =
					selectedType === 'recurring'
						? (recurringLabel ?? fallback)
						: (singleLabel ?? fallback)
			}
		})
	}

	async #onSubmit(event: SubmitEvent) {
		event.preventDefault()

		this.#filterProvidersByType()
		this.#filterDueDateByType()
		this.#updateProvider()

		// Checks provider field value.
		if (!this.#hasAvailableProvider()) {
			this.#form.classList.add('was-validated')
			this.#allowSubmit(false)
			return
		}

		// Disable form submit.
		this.#allowSubmit(false)
		this.#form.classList.add('fame-form--submitting')

		const formData = new FormData(this.#form)
		const data = Object.fromEntries(formData)
		this.#removeEmptyOptionalFields(data)
		const url = this.getSubmitUrl()

		// Allow plugins to alter form data.
		const alterFormDataEvent: FormSubmitEvent = new CustomEvent('fame-lahjoitukset-submit', {
			cancelable: true,
			detail: {
				url,
				data,
				handler: this,
				errors: {},
			},
		})

		window.dispatchEvent(alterFormDataEvent)

		Object.entries(alterFormDataEvent.detail.errors).forEach(([key, error]) => {
			this.addError(key, error)
		})

		try {
			// Run built-in validators. This should fail if
			// any validation errors were added by the event.
			if (!this.validate()) {
				return
			}

			// Events can cancel form submit by calling
			if (!alterFormDataEvent.defaultPrevented) {
				await this.#submitForm(
					alterFormDataEvent.detail.url,
					alterFormDataEvent.detail.data
				)
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('Submit failed', error)

			if (error instanceof Validation) {
				Object.entries(error.errors).forEach(([key, message]) => {
					this.addError(key, message)
				})
				return
			}

			throw error
		} finally {
			this.#allowSubmit(this.#canSubmit())
			this.#form.classList.remove('fame-form--submitting')
		}
	}

	async #submitForm(url: URL, data: any) {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})

		if (!response.ok) {
			await this.#throwErrorResponse(response)
		}

		const result = await response.json()

		// Allow plugins to alter form result.
		const formResultEvent: FormResultEvent = new CustomEvent('fame-lahjoitukset-result', {
			cancelable: true,
			detail: {
				result,
				handler: this,
			},
		})

		this.#form.classList.add('fame-form--submitted')

		window.dispatchEvent(formResultEvent)

		// Redirect to success URL.
		if (!formResultEvent.defaultPrevented) {
			window.location.href = formResultEvent.detail.result.redirect_url
		}
	}

	/**
	 * Parses backend failure and throws appropriate exception.
	 *
	 * @param response
	 * @private
	 */
	async #throwErrorResponse(response: Response): Promise<never> {
		const body = await response.json()
		const message = body.message || response.statusText

		// If API returned validation errors.
		if (body.error) {
			throw new Validation(message, body.error)
		}

		throw new Error(response.statusText)
	}

	validate(): boolean {
		// The resolved provider value lives in the hidden selected-provider field,
		// so the browser's constraint validation on the provider inputs can be
		// overridden when a provider has been selected. Every other field is still
		// validated normally.
		const hasValidProvider = this.#hasAvailableProvider()

		let valid = true

		Array.prototype.forEach.call(this.#form.elements, element => {
			if (element.validity.valid) {
				return
			}

			// Provider inputs are validated via hasValidProvider above.
			if (element.name === 'provider' && hasValidProvider) {
				return
			}

			valid = false

			// Custom errors already carry their own message, only render messages
			// for built-in validation failures.
			if (!element.validity.customError) {
				this.#addErrorToElement(
					element,
					this.#getErrorMessage(element.name, element.validity)
				)
			}
		})

		this.#form.classList.add('was-validated')

		return valid
	}

	/**
	 * Adds custom error message to given form element.
	 *
	 * @param name
	 * @param error
	 */
	addError(name: string, error: string) {
		const element = this.#form.elements.namedItem(name)

		if (element instanceof RadioNodeList) {
			Array.prototype.forEach.call(element, (item, idx) => {
				if (item instanceof HTMLInputElement) {
					item.setCustomValidity(error)

					// For the first element only.
					if (idx === 0) {
						this.#addErrorToElement(item, error)
					}
				}
			})
		} else if (isFormControl(element)) {
			if (element.type === 'hidden') {
				throw new Error(`Trying to set validation message to hidden element ${name}`)
			}

			element.setCustomValidity(error)

			this.#addErrorToElement(element, error)
		} else {
			throw new Error(`Trying to set validation message to unknown element ${name}`)
		}
	}

	#addErrorToElement(element: FormControlElement, message: string) {
		const parent = element.closest('.fame-form__fieldset') || element.parentElement
		if (parent) {
			const feedback =
				parent.querySelector('.fame-form__feedback') ??
				parent.appendChild(document.createElement('span'))
			feedback.className = 'fame-form__feedback fame-form__feedback--invalid'
			feedback.setAttribute('aria-live', 'polite')
			feedback.textContent = message
		}
	}

	#getErrorMessage(name: string, validity: ValidityState) {
		if (validity.valid) {
			throw new Error(`Element ${name} is valid`)
		}

		return this.#translations[name]?.[getErrorType(validity)] ?? 'Invalid value'
	}

	#removeEmptyOptionalFields(data: Record<string, FormDataEntryValue>) {
		if (data.campaign === '') {
			delete data.campaign
		}
	}

	/**
	 * Allow form submit.
	 */
	#allowSubmit(allow: boolean) {
		this.#submit.forEach(submit => (submit.disabled = !allow))
	}

	/**
	 * Get submit URL.
	 *
	 * @private
	 */
	getSubmitUrl() {
		const url = new URL(`${this.#url}/donation/${encodeURIComponent(this.#slug)}`)

		// @todo move contact parameter to form.
		// Check if contact form should be required.
		const contact = this.#form.querySelector('[data-contact]')
		if (contact instanceof HTMLElement && !!contact.dataset.contact) {
			url.searchParams.append('contact', '1')
		}

		return url
	}
}
