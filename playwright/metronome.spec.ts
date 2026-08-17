import { expect, test } from '@playwright/test'
import { appPath } from '../playwright.config'

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title === 'keeps Jam Loop playable when drum samples are unavailable') return
  await page.goto(appPath)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('edits rhythm settings and restores them after reload', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '六弦练习室' })).toBeVisible()
  await expect(page.getByText('六根琴弦构成练习标尺，强弱拍在同一条时间线上推进。')).toBeVisible()
  await expect(page.getByText('看见每一拍，听清每一次落点')).toHaveCount(0)
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
  await expect(page.getByText('六根琴弦构成练习标尺，强弱拍在同一条时间线上推进。')).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasHorizontalOverflow).toBe(false)

  await page.getByRole('button', { name: '进入专注模式' }).click()
  await expect(page.getByRole('dialog', { name: '专注练习模式' })).toBeVisible()
  await expect(page.getByText('96', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '退出专注模式' }).click()
  await expect(page.getByRole('dialog', { name: '专注练习模式' })).toBeHidden()
})

test('configures tempo training and starts it where Web Audio is available', async ({ page, browserName }) => {
  await page.getByRole('button', { name: '打开设置' }).click()
  await page.getByRole('button', { name: '训练', exact: true }).click()
  await page.getByRole('button', { name: '速度训练' }).click()
  await page.getByLabel('起始 BPM').fill('72')
  await page.getByLabel('目标 BPM').fill('84')
  await page.getByRole('button', { name: '关闭设置' }).click()

  await expect(page.getByRole('button', { name: /训练/ })).toContainText('速度训练')
  if (browserName === 'webkit') return

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

test('uses the dark palette when the system requests dark mode', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  await page.goto(appPath)
  const background = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(background).toBe('rgb(30, 35, 32)')
  await context.close()
})

test('navigates to chord atlas and filters the catalog', async ({ page, browserName }) => {
  await page.getByRole('link', { name: /Chord/ }).click()
  await expect(page).toHaveURL(/#\/chords$/)
  await expect(page.getByText('搜索常用指法，确认每根弦的位置，然后听一次完整扫弦。')).toBeVisible()
  await expect(page.getByText('把和弦放在指尖，也放进耳朵')).toHaveCount(0)
  await page.getByPlaceholder('例如 Cmaj7、F♯m').fill('Cmaj7')
  await page.getByRole('button', { name: /Cmaj7/ }).click()
  await expect(page.getByRole('img', { name: /Cmaj7 和弦指板图/ })).toBeVisible()
  if (browserName === 'webkit') return

  await page.getByRole('button', { name: '试听 Cmaj7 和弦' }).click()
  await expect(page.getByRole('button', { name: '试听 Cmaj7 和弦' })).toContainText('正在扫弦')
})

test('edits and persists a jam loop on a phone viewport', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.getByRole('link', { name: /Jam Loop/ }).click()
  await expect(page.getByText('排好和弦，选择律动，让鼓、贝斯与扫弦持续循环。')).toBeVisible()
  await expect(page.getByText('留一段稳定的伴奏，把空间交给独奏')).toHaveCount(0)
  const tempoLayout = await page.getByRole('button', { name: 'Tap' }).locator('..').evaluate((element) => {
    const tap = element.querySelector('button:last-child')?.getBoundingClientRect()
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      tapRight: tap?.right ?? Number.POSITIVE_INFINITY,
      viewportWidth: window.innerWidth,
    }
  })
  expect(tempoLayout.scrollWidth).toBeLessThanOrEqual(tempoLayout.clientWidth)
  expect(tempoLayout.tapRight).toBeLessThanOrEqual(tempoLayout.viewportWidth)
  await page.getByRole('button', { name: '第 1 小节 C' }).click()
  await page.getByRole('button', { name: 'Dm', exact: true }).click()
  await page.getByRole('button', { name: '第 2 小节 G' }).click()
  await page.getByRole('button', { name: '复制上一小节' }).click()
  await page.getByRole('slider', { name: 'Jam 速度滑块' }).fill('120')
  await expect(page.getByRole('spinbutton', { name: 'Jam BPM' })).toHaveValue('120')
  await page.reload()
  await expect(page.getByRole('button', { name: '第 1 小节 Dm' })).toBeVisible()
  await expect(page.getByRole('button', { name: '第 2 小节 Dm' })).toBeVisible()
  if (browserName !== 'webkit') {
    const sampleResponses: number[] = []
    page.on('response', (response) => { if (response.url().includes('/audio/')) sampleResponses.push(response.status()) })
    await page.getByRole('button', { name: /播放/ }).click()
    await expect(page.getByRole('button', { name: /暂停/ })).toBeVisible()
    await expect.poll(() => sampleResponses.length).toBe(4)
    expect(sampleResponses.every((status) => status === 200)).toBe(true)
    await page.getByRole('button', { name: /停止/ }).click()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('does not trigger the metronome keyboard shortcuts outside its module', async ({ page }) => {
  await page.getByRole('link', { name: /Jam Loop/ }).click()
  await page.keyboard.press('Space')
  await page.getByRole('link', { name: /Metronome/ }).click()
  await expect(page.getByRole('button', { name: '开始节拍' })).toBeVisible()
})
test('resets metronome progress from the transport', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit on Windows does not expose Web Audio')
  await page.getByRole('button', { name: '开始节拍' }).click()
  await page.getByRole('button', { name: /重置节拍进度/ }).click()
  await expect(page.getByText('当前小节').locator('strong')).toHaveText('01')
  await expect(page.getByRole('button', { name: '暂停节拍' })).toBeVisible()
})

test('keeps Jam Loop playable when drum samples are unavailable', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit on Windows does not expose Web Audio')
  await page.route('**/audio/*.wav', (route) => route.fulfill({ status: 404, body: '' }))
  await page.goto(appPath)
  await page.evaluate(() => localStorage.clear())
  await page.getByRole('link', { name: /Jam Loop/ }).click()
  await page.getByRole('button', { name: /播放/ }).click()
  await expect(page.getByRole('button', { name: /暂停/ })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('publishes an installable app shell that reloads when the network is unavailable', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Offline service-worker smoke test runs once in Chromium')
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifestResponse = await page.request.get(new URL(manifestHref!, page.url()).toString())
  expect(manifestResponse.ok()).toBe(true)
  expect((await manifestResponse.json()).display).toBe('standalone')

  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await page.route('**/*', (route) => route.abort('internetdisconnected'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '六弦练习室' })).toBeVisible()
})
