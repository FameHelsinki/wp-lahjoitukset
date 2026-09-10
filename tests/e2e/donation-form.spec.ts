import { test, expect } from '@wordpress/e2e-test-utils-playwright'

/**
 * End-to-end flow for the donation form.
 *
 * The lahjoitin backend is simulated by the fame-e2e-backend-mock mu-plugin:
 * organization slug "e2e-ok" has providers enabled, "e2e-fail" simulates an
 * unreachable backend. The browser-side donation POST is mocked per test with
 * page.route(), so no external network is involved.
 */

async function setOrganizationSlug(requestUtils: any, slug: string) {
	await requestUtils.rest({
		path: '/wp/v2/settings',
		method: 'POST',
		data: { slug },
	})
}

test.describe('donation form', () => {
	test.describe.configure({ mode: 'serial' })

	let postId: number

	test.beforeAll(async ({ requestUtils }) => {
		await setOrganizationSlug(requestUtils, 'e2e-ok')
	})

	test('is scaffolded in the editor and publishes', async ({ admin, editor, page }) => {
		await admin.createNewPost({ title: 'Donation form e2e' })
		await editor.insertBlock({ name: 'famehelsinki/donation-form' })

		// The block builds its inner layout on insert.
		const canvas = editor.canvas
		await expect(canvas.locator('[data-type="famehelsinki/donation-type"]')).toBeVisible()
		await expect(canvas.locator('[data-type="famehelsinki/donation-amounts"]')).toBeVisible()
		await expect(canvas.locator('[data-type="famehelsinki/recurring-due-date"]')).toBeVisible()
		await expect(canvas.locator('[data-type="famehelsinki/donation-providers"]')).toBeVisible()
		await expect(canvas.locator('[data-type="famehelsinki/form-controls"]')).toBeVisible()

		await editor.selectBlocks(canvas.locator('[data-type="famehelsinki/donation-type"]'))
		await editor.openDocumentSettingsSidebar()
		await page.getByRole('checkbox', { name: 'Recurring' }).check()

		// The charge-day block hides itself until at least two days are
		// configured, so pick the days this suite selects from later.
		await editor.selectBlocks(canvas.locator('[data-type="famehelsinki/recurring-due-date"]'))
		await page.getByRole('checkbox', { name: 'Day 5', exact: true }).check()
		await page.getByRole('checkbox', { name: 'Day 21', exact: true }).check()
		await editor.selectBlocks(canvas.locator('[data-type="famehelsinki/donation-form"]'))

		// The providers block seeds its attributes from the (mocked) backend;
		// wait for that before saving so the frontend has providers to render.
		await expect
			.poll(async () => {
				const blocks = await editor.getBlocks({ full: true })
				const providers = findBlock(blocks, 'famehelsinki/donation-providers')
				return providers?.attributes?.providers?.length ?? 0
			})
			.toBeGreaterThan(0)
		await expect(
			canvas.getByText('Payment provider: Paytrail (hidden)', { exact: true })
		).toBeVisible()

		// The serialized markup is the save() output of every block in the
		// tree. A snapshot catches unintended save() changes, which would
		// invalidate already-published donation forms.
		expect(await editor.getEditedPostContent()).toMatchSnapshot('donation-form-content.txt')

		postId = await editor.publishPost()
		expect(postId).toBeTruthy()
	})

	test('accepts a donation on the frontend', async ({ page }) => {
		const submissions: Record<string, unknown>[] = []

		// Simulate the lahjoitin donation endpoint the browser posts to.
		await page.route('**/donation/e2e-ok*', async route => {
			submissions.push(route.request().postDataJSON())
			await route.fulfill({
				json: { redirect_url: `${process.env.WP_BASE_URL}/?donation=success` },
			})
		})

		await page.goto(`/?p=${postId}`)

		const form = page.locator('form.fame-form--donations')
		await expect(form).toBeVisible()
		await expect(page.locator('.fame-form__notice--warning')).toHaveCount(0)
		// A single provider is selected implicitly and has no visible frontend control.
		await expect(form.getByText('Paytrail', { exact: true })).toHaveCount(0)
		await expect(form.getByText('Checkout', { exact: true })).toHaveCount(0)

		// The seeded default provider is auto-selected for the default type.
		await expect(form.locator('input[data-selected-provider]')).toHaveValue('checkout')

		// Choose a preset amount. The radio is visually hidden behind its
		// styled label, so click the label.
		const amountRadio = form.locator('input[name="amount-radio-single"][value="20"]')
		await form.locator('label:has(input[name="amount-radio-single"][value="20"])').click()
		await expect(amountRadio).toBeChecked()

		const submit = form.locator('button[type="submit"]')
		await expect(submit).toBeEnabled()
		await submit.click()

		// The mocked backend redirects to the return address.
		await page.waitForURL('**/?donation=success')

		expect(submissions).toHaveLength(1)
		expect(submissions[0]).toMatchObject({
			type: 'single',
			provider: 'checkout',
			amount: '2000', // cents
		})
	})

	test('submits the selected charge day for a recurring donation', async ({ page }) => {
		const submissions: Record<string, unknown>[] = []

		await page.route('**/donation/e2e-ok*', async route => {
			submissions.push(route.request().postDataJSON())
			await route.fulfill({
				json: { redirect_url: `${process.env.WP_BASE_URL}/?donation=recurring-success` },
			})
		})

		await page.goto(`/?p=${postId}`)
		const form = page.locator('form.fame-form--donations')

		const recurringType = form.locator('input[name="type"][value="recurring"]')
		await form.locator('label:has(input[name="type"][value="recurring"])').click()
		await expect(recurringType).toBeChecked()

		const dueDate = form.locator('select[name="due_date"]')
		await expect(dueDate).toBeVisible()
		await dueDate.selectOption('21')

		const amountRadio = form.locator('input[name="amount-radio-recurring"][value="20"]')
		await form.locator('label:has(input[name="amount-radio-recurring"][value="20"])').click()
		await expect(amountRadio).toBeChecked()

		await form.locator('button[type="submit"]').click()
		await page.waitForURL('**/?donation=recurring-success')

		expect(submissions).toHaveLength(1)
		expect(submissions[0]).toMatchObject({
			type: 'recurring',
			provider: 'checkout',
			amount: '2000',
			due_date: '21',
		})
	})

	test('repacks columns from the sidebar without losing content', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({ title: 'Donation form columns e2e' })
		await editor.insertBlock({ name: 'famehelsinki/donation-form' })

		const canvas = editor.canvas
		await expect(canvas.locator('[data-type="famehelsinki/donation-type"]')).toBeVisible()

		// Default layout is a single column (block.json colsDesktop default).
		await expect.poll(() => getFormColumnCount(editor)).toBe(1)

		await editor.selectBlocks(canvas.locator('[data-type="famehelsinki/donation-form"]'))
		await editor.openDocumentSettingsSidebar()
		await page.getByRole('spinbutton', { name: 'Desktop columns' }).fill('3')

		// The edit() effect rebuilds core/columns but must keep the same
		// group blocks, so every form section survives the repack.
		await expect.poll(() => getFormColumnCount(editor)).toBe(3)
		const blocks = await editor.getBlocks({ full: true })
		for (const name of [
			'famehelsinki/donation-type',
			'famehelsinki/donation-amounts',
			'famehelsinki/recurring-due-date',
			'famehelsinki/contact-form',
			'famehelsinki/donation-providers',
			'famehelsinki/form-controls',
		]) {
			expect(findBlock(blocks, name), `${name} survives repack`).toBeTruthy()
		}

		expect(await editor.getEditedPostContent()).toContain('"colsDesktop":3')
	})

	test('disables submission when providers are unavailable', async ({ page, requestUtils }) => {
		await setOrganizationSlug(requestUtils, 'e2e-fail')

		try {
			await page.goto(`/?p=${postId}`)

			await expect(page.locator('.fame-form__notice--warning')).toBeVisible()
			await expect(
				page.locator('form.fame-form--donations input[name="provider"][type="radio"]')
			).toHaveCount(0)
			await expect(
				page.locator('form.fame-form--donations button[type="submit"]')
			).toBeDisabled()
		} finally {
			await setOrganizationSlug(requestUtils, 'e2e-ok')
		}
	})
})

/**
 * Number of core/column blocks inside the donation form's top core/columns.
 */
async function getFormColumnCount(editor: any): Promise<number> {
	const blocks = await editor.getBlocks({ full: true })
	const columns = findBlock(blocks, 'core/columns')
	return columns?.innerBlocks?.length ?? 0
}

/**
 * Depth-first search for a block by name in the editor block tree.
 */
function findBlock(blocks: any[], name: string): any | undefined {
	for (const block of blocks) {
		if (block.name === name) return block
		const found = findBlock(block.innerBlocks ?? [], name)
		if (found) return found
	}
	return undefined
}
