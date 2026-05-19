import { expect, test } from '@playwright/test'
import { mockSupabase, seedAuthenticatedSession } from './helpers/mock-supabase'

test('shows the landing screen when no session exists', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  await expect(page.getByText('SurfShadow')).toBeVisible()
})

test('loads the authenticated library and applies search filters', async ({ page }) => {
  await seedAuthenticatedSession(page)
  await mockSupabase(page)

  await page.goto('/')
  await expect(page.getByText('Hello from library')).toBeVisible()

  await page.getByLabel('Open search and filters').click()
  await expect(page).toHaveURL(/\/library\/search$/)
  await page.getByPlaceholder('Search').fill('hello')
  await page.getByRole('button', { name: 'Apply' }).click()

  await expect(page).toHaveURL(/\/\?q=hello$/)
  await expect(page.getByText('Hello from library')).toBeVisible()
})

test('prefills the new snippet form from OCR upload', async ({ page }) => {
  await seedAuthenticatedSession(page)
  await mockSupabase(page)

  await page.goto('/snippets/new')
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles({
    name: 'ocr.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-image'),
  })

  await expect(page.getByLabel('Snippet text')).toHaveValue('OCR imported text')
  await expect(page.getByLabel('Language')).toHaveValue('ja-JP')
})

test('loads the edit page with the existing snippet data', async ({ page }) => {
  await seedAuthenticatedSession(page)
  await mockSupabase(page)

  await page.goto('/snippets/snippet-1/edit')
  await expect(page.getByLabel('Snippet text')).toHaveValue('Hello from library')
})

test('deletes a snippet through the confirmation dialog', async ({ page }) => {
  await seedAuthenticatedSession(page)
  await mockSupabase(page)

  await page.goto('/')
  await expect(page.getByText('Hello from library')).toBeVisible()
  await page.locator('summary').first().click()
  await page.getByText('Delete').first().click()
  await page.getByRole('button', { name: 'Confirm' }).click()

  await expect(page.getByText('No snippets yet')).toBeVisible()
})
