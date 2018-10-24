/* global describe, test, expect, beforeAll, jest, afterAll, process */
import Puppeteer from 'puppeteer'

describe('Icon picker and divider edit form controls', () => {
  const DOMAIN = process.env.DOMAIN || 'https://www.visualcomposer.io'
  const WP_USERNAME = process.env.WP_USERNAME || 'admin'
  const WP_PASSWORD = process.env.WP_PASSWORD || 'admin'
  const isHeadless = false
  const withDevTools = false
  let browser
  let page

  jest.setTimeout(100000)

  beforeAll(async () => {
    browser = await Puppeteer.launch({ headless: isHeadless, devtools: withDevTools })
    page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 720 })
    await page.goto(`${DOMAIN}/wp-login.php`, { timeout: 0, waitUntil: 'networkidle2' })
    await expect(page).toFillForm('#loginform', {
      log: WP_USERNAME,
      pwd: WP_PASSWORD
    })
    await page.click('#wp-submit')
    await page.waitForNavigation()
    await page.goto(`${DOMAIN}/wp-admin/post-new.php?post_type=page&vcv-action=frontend`, { timeout: 0, waitUntil: 'networkidle2' })

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight)
    })
    await page.mainFrame().waitForSelector('[title="Add Element"].vcv-ui-navbar-control')
  })
  test('Add icon and check iconPicker control', async () => {
    await expect(page).toClick('[title="Add Element"].vcv-ui-navbar-control', { timeout: 30000 })
    await expect(page).toClick('[title="Icon"].vcv-ui-item-element', { timeout: 30000 })
    await page.mainFrame().waitForSelector('.vcv-ui-form-dropdown.vcv-ui-form-dropdown-style--inline.vcv-ui-iconpicker-picker-dropdown')
    const controlSize = await page.evaluate(() => {
      return document.querySelector('.vcv-ui-form-dropdown.vcv-ui-form-dropdown-style--inline.vcv-ui-iconpicker-picker-dropdown i').clientHeight
    })
    expect(controlSize).not.toBe(0)
  })
  afterAll(async () => {
    await browser.close()
  })
})
