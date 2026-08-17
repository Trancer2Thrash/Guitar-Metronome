import { chromium } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const svg = await readFile('public/icons/favicon.svg', 'utf8')
await mkdir('public/icons', { recursive: true })
const browser = await chromium.launch({ headless: true })
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#17211d}svg{display:block;width:100%;height:100%}</style>${svg}`)
  await page.screenshot({ path: path.join('public/icons', name), type: 'png' })
  await page.close()
}
await browser.close()
console.log('Rendered PWA icons from public/icons/favicon.svg')
