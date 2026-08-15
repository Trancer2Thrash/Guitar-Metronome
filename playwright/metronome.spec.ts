import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('edits rhythm settings and restores them after reload', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '六弦节拍器' })).toBeVisible()
  await page.getByRole('spinbutton', { name: 'BPM' }).fill('128')
  await page.getByRole('button', { name: '打开设置' }).click()
  await page.getByLabel('拍号分子').selectOption('3')
  await page.getByRole('button', { name: '关闭设置' }).click()

  await page.reload()

  await expect(page.getByRole('spinbutton', { name: 'BPM' })).toHaveValue('128')
  await expect(page.getByRole('button', { name: '拍号 3/4' })).toBeVisible()
})

test('fits a phone viewport and opens focus mode', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.reload()

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasHorizontalOverflow).toBe(false)

  await page.getByRole('button', { name: '进入专注模式' }).click()
  await expect(page.getByRole('dialog', { name: '专注练习模式' })).toBeVisible()
  await expect(page.getByText('96', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '退出专注模式' }).click()
  await expect(page.getByRole('dialog', { name: '专注练习模式' })).toBeHidden()
})

test('configures and starts a tempo training session', async ({ page }) => {
  await page.getByRole('button', { name: '打开设置' }).click()
  await page.getByRole('button', { name: '训练', exact: true }).click()
  await page.getByRole('button', { name: '速度训练' }).click()
  await page.getByLabel('起始 BPM').fill('72')
  await page.getByLabel('目标 BPM').fill('84')
  await page.getByRole('button', { name: '关闭设置' }).click()

  await expect(page.getByRole('button', { name: /训练/ })).toContainText('速度训练')
  await page.getByRole('button', { name: '开始节拍' }).click()
  await expect(page.getByRole('spinbutton', { name: 'BPM' })).toHaveValue('72')
  await expect(page.getByText(/速度训练 · 72 BPM/)).toBeVisible()
  await page.getByRole('button', { name: '暂停节拍' }).click()
})
test('has no page-level overflow at tablet and desktop sizes', async ({ page }) => {
  for (const viewport of [{ width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.reload()
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(dimensions.scrollWidth, `${viewport.width} px viewport overflowed`).toBeLessThanOrEqual(dimensions.clientWidth)
  }
})
