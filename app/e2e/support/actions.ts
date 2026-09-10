import { expect, type Page } from '@playwright/test'

// Signs in through the real opening gate. Auth is mocked, so any credentials pass;
// success is confirmed by the shell chrome (the sign-out button) appearing.
export async function login(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByPlaceholder('name@example.com').fill('owner@example.com')
  await page.locator('input[type="password"]').fill('secret123')
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByRole('button', { name: 'خروج' })).toBeVisible()
}

// Opens the receipt (سند قبض) sheet from the top bar and waits for the dialog.
export async function openReceiptSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'سند قبض', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}
