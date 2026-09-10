import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals'
import FormHandler from './FormHandler'
import { ErrorTranslations } from './Validation.ts'
import { FormResultEvent, FormSubmitEvent } from './Events.ts'

describe('FormHandler', () => {
	let form: HTMLFormElement, mockTranslations: ErrorTranslations

	beforeEach(() => {
		document.body.innerHTML = `
            <form action="/submit">
                <input type="hidden" name="amount" value="1000">
                <button type="submit">Submit</button>
            </form>
        `

		form = document.querySelector('form')!
		mockTranslations = {}
	})

	test('should attach event listener for form submission', () => {
		jest.spyOn(form, 'addEventListener')

		new FormHandler('/submit', 'my-org', form, mockTranslations)
		expect(form.addEventListener).toHaveBeenCalledWith('submit', expect.any(Function))
	})

	test('keeps submit disabled when no payment provider is available', () => {
		new FormHandler('/submit', 'my-org', form, mockTranslations)

		const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
		expect(submit.disabled).toBe(true)
	})

	test('keeps submit disabled when amount changes without an available provider', () => {
		document.body.innerHTML = `
			<form action="/submit">
				<input type="hidden" name="amount" value="1000">
				<div class="donation-amounts">
					<input name="amount-single" type="number" min="1" value="10">
				</div>
				<button type="submit">Submit</button>
			</form>
		`
		form = document.querySelector('form')!
		new FormHandler('/submit', 'my-org', form, mockTranslations)

		const amount = form.querySelector<HTMLInputElement>('input[type="number"]')!
		const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!

		amount.value = '20'
		amount.dispatchEvent(new Event('input', { bubbles: true }))

		expect(submit.disabled).toBe(true)
	})

	test('getSubmitUrl includes the backend host and slug', () => {
		const handler = new FormHandler(
			'https://api.lahjoitin.fi',
			'my-org',
			form,
			mockTranslations
		)
		const url = handler.getSubmitUrl()

		expect(url.toString()).toBe('https://api.lahjoitin.fi/donation/my-org')
	})

	test('getSubmitUrl url-encodes the slug', () => {
		const handler = new FormHandler(
			'https://api.lahjoitin.fi',
			'my org/x',
			form,
			mockTranslations
		)
		const url = handler.getSubmitUrl()

		expect(url.pathname).toBe('/donation/my%20org%2Fx')
	})

	test('getSubmitUrl appends contact query param', () => {
		document.body.innerHTML = `
            <form action="/submit">
                <input type="hidden" name="amount" value="1000">
                <div data-contact="1"></div>
                <button type="submit">Submit</button>
            </form>
        `
		form = document.querySelector('form')!

		const handler = new FormHandler(
			'https://api.lahjoitin.fi',
			'my-org',
			form,
			mockTranslations
		)
		const url = handler.getSubmitUrl()

		expect(url.pathname).toBe('/donation/my-org')
		expect(url.searchParams.get('contact')).toBe('1')
	})
})

describe('FormHandler events', () => {
	let form: HTMLFormElement
	let handler: FormHandler

	// Track listeners so they can be removed after each test — window event
	// listeners are global and would otherwise leak across specs.
	let listeners: Array<[string, EventListener]> = []

	const on = (type: string, listener: EventListener) => {
		window.addEventListener(type, listener)
		listeners.push([type, listener])
	}

	// Submit the form the way a user click would, in a jsdom-friendly way.
	const submit = () =>
		form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

	// Let the async #onSubmit microtask chain (and any awaited fetch) settle.
	const flush = () => new Promise(resolve => setTimeout(resolve, 0))

	beforeEach(() => {
		document.body.innerHTML = `
            <form class="fame-form fame-form--donations" novalidate>
                <input type="hidden" name="amount" value="1000" />
				<input type="radio" name="type" value="single" checked />
				<input type="radio" name="type" value="recurring" />
                <fieldset class="payment-method-selector fame-form__fieldset" data-type="single">
                    <div class="fame-form__group" data-type="single">
                        <label>
                            <input type="radio" name="provider" value="stripe" data-type="single" required />
                        </label>
                    </div>
                </fieldset>
				<fieldset class="payment-method-selector fame-form__fieldset" data-type="recurring">
					<input type="hidden" name="provider" value="mobilepay" data-type="recurring" disabled />
				</fieldset>
				<div data-recurring-due-date hidden aria-hidden="true">
					<select name="due_date" data-recurring-due-date-input required disabled>
						<option value="21" selected>21</option>
					</select>
				</div>
                <div class="fame-form__fieldset">
                    <input type="text" name="email" />
                </div>
                <input type="hidden" name="provider" data-selected-provider />
                <button type="submit">Submit</button>
            </form>
        `

		form = document.querySelector('form')!
		handler = new FormHandler('https://api.lahjoitin.fi', 'my-org', form)
	})

	afterEach(() => {
		listeners.forEach(([type, listener]) => window.removeEventListener(type, listener))
		listeners = []
		jest.restoreAllMocks()
		delete (globalThis as any).fetch
	})

	test('dispatches fame-lahjoitukset-submit with the documented detail', () => {
		let captured: FormSubmitEvent | undefined

		on('fame-lahjoitukset-submit', (event: Event) => {
			captured = event as FormSubmitEvent
			// Cancel so the request is never sent during this assertion-only test.
			event.preventDefault()
		})

		submit()

		expect(captured).toBeDefined()
		expect(captured!.detail.data).toEqual({
			amount: '1000',
			type: 'single',
			provider: 'stripe',
			email: '',
		})
		expect(captured!.detail.handler).toBe(handler)
		expect(captured!.detail.errors).toEqual({})
		expect(captured!.detail.url).toBeInstanceOf(URL)
		expect(captured!.detail.url.toString()).toBe('https://api.lahjoitin.fi/donation/my-org')
	})

	test('submits due_date only when recurring donation is selected', () => {
		let captured: FormSubmitEvent | undefined
		on('fame-lahjoitukset-submit', (event: Event) => {
			captured = event as FormSubmitEvent
			event.preventDefault()
		})

		const recurring = form.querySelector<HTMLInputElement>(
			'input[name="type"][value="recurring"]'
		)!
		recurring.checked = true
		recurring.dispatchEvent(new Event('change', { bubbles: true }))

		const section = form.querySelector<HTMLElement>('[data-recurring-due-date]')!
		const dueDate = form.querySelector<HTMLSelectElement>('[name="due_date"]')!
		expect(section.hidden).toBe(false)
		expect(dueDate.disabled).toBe(false)

		submit()

		expect(captured?.detail.data).toMatchObject({
			type: 'recurring',
			provider: 'mobilepay',
			due_date: '21',
		})
	})

	test('submits the hidden due_date input only for recurring donations', () => {
		// Fewer than two configured days render a bare hidden input instead of
		// the selector, but the recurring-only rule must still hold.
		form.querySelector('[data-recurring-due-date]')!.outerHTML =
			'<input type="hidden" name="due_date" value="5" data-recurring-due-date-input disabled />'
		handler = new FormHandler('https://api.lahjoitin.fi', 'my-org', form)

		let captured: FormSubmitEvent | undefined
		on('fame-lahjoitukset-submit', (event: Event) => {
			captured = event as FormSubmitEvent
			event.preventDefault()
		})

		const dueDate = form.querySelector<HTMLInputElement>('[name="due_date"]')!
		expect(dueDate.disabled).toBe(true)

		submit()
		expect(captured?.detail.data).not.toHaveProperty('due_date')

		const recurring = form.querySelector<HTMLInputElement>(
			'input[name="type"][value="recurring"]'
		)!
		recurring.checked = true
		recurring.dispatchEvent(new Event('change', { bubbles: true }))
		expect(dueDate.disabled).toBe(false)

		submit()

		expect(captured?.detail.data).toMatchObject({
			type: 'recurring',
			due_date: '5',
		})
	})

	test('preventDefault() on the submit event cancels submission', async () => {
		const fetchMock = jest.fn()
		;(globalThis as any).fetch = fetchMock

		on('fame-lahjoitukset-submit', (event: Event) => event.preventDefault())

		submit()
		await flush()

		expect(fetchMock).not.toHaveBeenCalled()
	})

	test('listener-populated detail.errors blocks submission', async () => {
		const fetchMock = jest.fn()
		;(globalThis as any).fetch = fetchMock

		on('fame-lahjoitukset-submit', (event: Event) => {
			;(event as FormSubmitEvent).detail.errors = { email: 'Invalid email' }
		})

		submit()
		await flush()

		expect(fetchMock).not.toHaveBeenCalled()

		const email = form.querySelector<HTMLInputElement>('input[name="email"]')!
		expect(email.validity.customError).toBe(true)
		expect(email.validationMessage).toBe('Invalid email')

		const feedback = form.querySelector('.fame-form__feedback--invalid')
		expect(feedback?.textContent).toBe('Invalid email')
	})

	test('handler.addError() from the listener blocks submission', async () => {
		const fetchMock = jest.fn()
		;(globalThis as any).fetch = fetchMock

		on('fame-lahjoitukset-submit', (event: Event) => {
			;(event as FormSubmitEvent).detail.handler.addError('email', 'Required')
		})

		submit()
		await flush()

		expect(fetchMock).not.toHaveBeenCalled()

		const email = form.querySelector<HTMLInputElement>('input[name="email"]')!
		expect(email.validity.customError).toBe(true)
		expect(email.validationMessage).toBe('Required')
	})

	test('mutated detail.data is sent in the request body', async () => {
		const fetchMock = jest
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({ redirect_url: '/thanks' }) })
		;(globalThis as any).fetch = fetchMock

		on('fame-lahjoitukset-submit', (event: Event) => {
			;(event as FormSubmitEvent).detail.data.campaign = 'spring'
		})
		// Suppress the success redirect so jsdom does not attempt navigation.
		on('fame-lahjoitukset-result', (event: Event) => event.preventDefault())

		submit()
		await flush()

		expect(fetchMock).toHaveBeenCalledTimes(1)

		const [, options] = fetchMock.mock.calls[0] as [URL, RequestInit]
		const body = JSON.parse(options.body as string)
		expect(body).toEqual({
			amount: '1000',
			type: 'single',
			provider: 'stripe',
			email: '',
			campaign: 'spring',
		})
	})

	test('dispatches fame-lahjoitukset-result on success and preventDefault suppresses the redirect', async () => {
		const fetchMock = jest
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({ redirect_url: '/thanks' }) })
		;(globalThis as any).fetch = fetchMock

		const hrefBefore = window.location.href
		let captured: FormResultEvent | undefined

		on('fame-lahjoitukset-result', (event: Event) => {
			captured = event as FormResultEvent
			event.preventDefault()
		})

		submit()
		await flush()

		expect(captured).toBeDefined()
		expect(captured!.detail.result.redirect_url).toBe('/thanks')
		expect(captured!.detail.handler).toBe(handler)
		expect(window.location.href).toBe(hrefBefore)
	})
})
