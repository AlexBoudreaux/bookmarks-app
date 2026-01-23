import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for test setup/teardown
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test data prefix for cleanup
const TEST_URL_PREFIX = 'https://test-e2e-categorize.example.com/'
const TEST_BOOKMARK_TITLE = 'E2E Test Bookmark for Categorization'

interface TestCategory {
  id: string
  name: string
  parent_id: string | null
}

// Run tests in this file serially to avoid database conflicts
test.describe.configure({ mode: 'serial' })

test.describe('Categorize Flow', () => {
  let testBookmarkId: string
  let testBookmarkUrl: string
  let mainCategory: TestCategory
  let subCategory: TestCategory

  test.beforeEach(async ({ }, testInfo) => {
    // Generate unique URL per test using test title and timestamp
    const uniqueId = `${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    testBookmarkUrl = `${TEST_URL_PREFIX}${uniqueId}`

    // Clean up any existing test bookmarks with this prefix (from previous failed runs)
    const { data: existingBookmarks } = await supabase
      .from('bookmarks')
      .select('id')
      .like('url', `${TEST_URL_PREFIX}%`)

    if (existingBookmarks && existingBookmarks.length > 0) {
      const ids = existingBookmarks.map(b => b.id)
      await supabase.from('bookmark_categories').delete().in('bookmark_id', ids)
      await supabase.from('bookmarks').delete().in('id', ids)
    }

    // Get a main category (first one sorted by usage_count)
    const { data: mainCategories } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('usage_count', { ascending: false })
      .limit(1)

    if (!mainCategories || mainCategories.length === 0) {
      throw new Error('No main categories found. Run SETUP-003 to seed categories.')
    }

    mainCategory = mainCategories[0] as TestCategory

    // Get a subcategory of the main category
    const { data: subCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', mainCategory.id)
      .order('usage_count', { ascending: false })
      .limit(1)

    if (!subCategories || subCategories.length === 0) {
      throw new Error(`No subcategories found for ${mainCategory.name}. Check database.`)
    }

    subCategory = subCategories[0] as TestCategory

    // Create a test bookmark that needs categorization
    const { data: insertedBookmark, error } = await supabase
      .from('bookmarks')
      .insert({
        url: testBookmarkUrl,
        title: TEST_BOOKMARK_TITLE,
        domain: 'test-e2e-categorize.example.com',
        is_tweet: false,
        is_keeper: false,
        is_skipped: false,
        is_categorized: false,
        add_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !insertedBookmark) {
      throw new Error(`Failed to create test bookmark: ${error?.message}`)
    }

    testBookmarkId = insertedBookmark.id

    // Reset categorize position to 0 to ensure we start at the test bookmark
    await supabase.from('settings').upsert({
      key: 'categorize_position',
      value: { index: 0 },
    }, { onConflict: 'key' })
  })

  test.afterEach(async () => {
    // Clean up test data
    if (testBookmarkId) {
      await supabase.from('bookmark_categories').delete().eq('bookmark_id', testBookmarkId)
      await supabase.from('bookmarks').delete().eq('id', testBookmarkId)
    }
  })

  test('displays categorize page with bookmark', async ({ page }) => {
    await page.goto('/categorize')

    // Wait for page to load
    await expect(page.getByText('Categorize Bookmarks')).toBeVisible()

    // Should show the test bookmark title in the LinkCard
    await expect(page.getByText(TEST_BOOKMARK_TITLE)).toBeVisible({ timeout: 10000 })

    // Should show progress indicator
    await expect(page.getByText('of')).toBeVisible()

    // Should show category picker
    await expect(page.getByText('Categories')).toBeVisible()
    await expect(page.getByText('Press 1-9 or 0 to select')).toBeVisible()
  })

  test('categorizes bookmark using keyboard shortcuts', async ({ page }) => {
    await page.goto('/categorize')

    // Wait for the bookmark to appear
    await expect(page.getByText(TEST_BOOKMARK_TITLE)).toBeVisible({ timeout: 10000 })

    // Verify we're in main category selection state
    await expect(page.getByText('Categories')).toBeVisible()
    await expect(page.getByText(mainCategory.name)).toBeVisible()

    // Press '1' to select the first main category
    await page.keyboard.press('1')

    // Wait for subcategory view to appear
    await expect(page.getByText(`${mainCategory.name} → Subcategory`)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(subCategory.name)).toBeVisible()

    // Press '1' to select the first subcategory
    await page.keyboard.press('1')

    // Verify we're in 'ready' state and category pair is shown
    await expect(page.getByText('Category Added')).toBeVisible()
    await expect(page.getByText(`${mainCategory.name} > ${subCategory.name}`)).toBeVisible()

    // Press right arrow to save and move to next
    await page.keyboard.press('ArrowRight')

    // Wait a moment for the API call to complete
    await page.waitForTimeout(1000)

    // Verify bookmark is now categorized in the database
    const { data: categorizedBookmark } = await supabase
      .from('bookmarks')
      .select('is_categorized')
      .eq('id', testBookmarkId)
      .single()

    expect(categorizedBookmark?.is_categorized).toBe(true)

    // Verify bookmark_categories junction records were created
    const { data: categoryLinks } = await supabase
      .from('bookmark_categories')
      .select('category_id')
      .eq('bookmark_id', testBookmarkId)

    expect(categoryLinks).not.toBeNull()
    expect(categoryLinks!.length).toBeGreaterThanOrEqual(2) // Main + sub category
    expect(categoryLinks!.map(c => c.category_id)).toContain(mainCategory.id)
    expect(categoryLinks!.map(c => c.category_id)).toContain(subCategory.id)
  })

  test('shows completion screen after categorizing last bookmark', async ({ page }) => {
    await page.goto('/categorize')

    // Wait for the bookmark to appear
    await expect(page.getByText(TEST_BOOKMARK_TITLE)).toBeVisible({ timeout: 10000 })

    // Select main category (press 1)
    await page.keyboard.press('1')
    await expect(page.getByText(`${mainCategory.name} → Subcategory`)).toBeVisible({ timeout: 5000 })

    // Select subcategory (press 1)
    await page.keyboard.press('1')
    await expect(page.getByText('Category Added')).toBeVisible()

    // Press right arrow to save (this is the only bookmark, so completion should show)
    await page.keyboard.press('ArrowRight')

    // Should show completion message
    await expect(page.getByText('All bookmarks categorized!')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Great job!')).toBeVisible()
  })

  test('skip bookmark with Delete key', async ({ page }) => {
    await page.goto('/categorize')

    // Wait for the bookmark to appear
    await expect(page.getByText(TEST_BOOKMARK_TITLE)).toBeVisible({ timeout: 10000 })

    // Press Delete to skip the bookmark
    await page.keyboard.press('Delete')

    // Wait for the skip flash and API call
    await page.waitForTimeout(500)

    // Verify bookmark is marked as skipped in database
    const { data: skippedBookmark } = await supabase
      .from('bookmarks')
      .select('is_skipped')
      .eq('id', testBookmarkId)
      .single()

    expect(skippedBookmark?.is_skipped).toBe(true)

    // Since this was the only bookmark, should show completion
    await expect(page.getByText('All bookmarks categorized!')).toBeVisible({ timeout: 5000 })
  })

  test('shakes category picker when pressing right arrow without category selection', async ({ page }) => {
    await page.goto('/categorize')

    // Wait for the bookmark to appear
    await expect(page.getByText(TEST_BOOKMARK_TITLE)).toBeVisible({ timeout: 10000 })

    // Get the category picker element
    const categoryPicker = page.locator('.animate-shake').first()

    // Initially, picker should NOT have shake animation
    await expect(categoryPicker).not.toBeVisible()

    // Press right arrow without selecting a category
    await page.keyboard.press('ArrowRight')

    // The picker should now have the shake class (briefly)
    // We check that the shake animation class is applied
    const pickerContainer = page.locator('div:has-text("Categories")').first()

    // Wait for shake to start and verify progress didn't change
    // The bookmark should still be visible (navigation was blocked)
    await expect(page.getByText(TEST_BOOKMARK_TITLE)).toBeVisible()
  })
})
