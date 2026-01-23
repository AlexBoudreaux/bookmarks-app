import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays dropzone on home page', async ({ page }) => {
    // Verify dropzone is visible
    await expect(page.getByText('Drop your Chrome bookmarks.html here')).toBeVisible()
    await expect(page.getByText('or click to browse')).toBeVisible()

    // Verify Chrome export instructions are visible
    await expect(page.getByText('How to export from Chrome:')).toBeVisible()
    await expect(page.getByText('Open Chrome')).toBeVisible()
    await expect(page.getByText('Export bookmarks')).toBeVisible()
  })

  test('shows import summary modal after dropping valid bookmarks file', async ({ page }) => {
    // Get the file input (hidden but functional)
    const fileInput = page.locator('input[type="file"]')

    // Set the file using the fixture
    const fixturePath = path.join(__dirname, 'fixtures', 'sample-bookmarks.html')
    await fileInput.setInputFiles(fixturePath)

    // Wait for the import summary modal to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })

    // Verify modal title
    await expect(page.getByText('Import Summary')).toBeVisible()

    // Verify boundary found message (green alert)
    await expect(page.getByText('Found boundary: Tools / byebyepaywall.com')).toBeVisible()

    // Verify keeper count (5 bookmarks before and including byebyepaywall)
    // GitHub, Google, Notion, Figma, Bye Bye Paywall = 5 keepers
    const keeperSection = page.locator(':has-text("bookmarks to keep")').first()
    await expect(keeperSection).toBeVisible()

    // Verify to-categorize count (5 bookmarks after boundary)
    // Naval tweet, Karpathy tweet, OpenAI Blog, Vercel, Rauchg tweet = 5 to categorize
    const categorizeSection = page.locator(':has-text("bookmarks to categorize")').first()
    await expect(categorizeSection).toBeVisible()

    // Verify tweet breakdown (3 tweets in to-categorize: Naval, Karpathy, Rauchg)
    await expect(page.getByText('3 tweets')).toBeVisible()
    await expect(page.getByText('2 other links')).toBeVisible()

    // Verify Start Categorizing button is visible
    await expect(page.getByRole('button', { name: /Start Categorizing/i })).toBeVisible()
  })

  test('navigates to /categorize when clicking Start Categorizing', async ({ page }) => {
    // Set the file
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = path.join(__dirname, 'fixtures', 'sample-bookmarks.html')
    await fileInput.setInputFiles(fixturePath)

    // Wait for modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })

    // Click Start Categorizing
    await page.getByRole('button', { name: /Start Categorizing/i }).click()

    // Verify navigation to /categorize
    await expect(page).toHaveURL('/categorize')
  })

  test('shows boundary not found alert for bookmarks without Tools folder', async ({ page }) => {
    // Create a bookmarks file without the Tools/byebyepaywall boundary
    const noBoundaryHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>
    <DL><p>
        <DT><A HREF="https://github.com" ADD_DATE="1700000000">GitHub</A>
        <DT><A HREF="https://twitter.com/naval/status/123" ADD_DATE="1700000100">Tweet</A>
    </DL><p>
</DL><p>`

    // Create a blob and set it as file
    const fileInput = page.locator('input[type="file"]')

    // Use page.evaluate to create the file in the browser
    await page.evaluate(async (html) => {
      const dataTransfer = new DataTransfer()
      const file = new File([html], 'bookmarks.html', { type: 'text/html' })
      dataTransfer.items.add(file)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      if (input) {
        // Need to use Object.defineProperty to set files
        Object.defineProperty(input, 'files', {
          value: dataTransfer.files,
          writable: false,
        })
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }, noBoundaryHtml)

    // Wait for modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })

    // Verify boundary NOT found message (yellow alert)
    await expect(page.getByText('Boundary not found')).toBeVisible()
    await expect(page.getByText(/Could not find the Tools folder/i)).toBeVisible()
  })
})
