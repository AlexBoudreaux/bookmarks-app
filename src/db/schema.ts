import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

// ── Bookmarks ──────────────────────────────────────────────────────────────────

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull().unique(),
    title: text('title'),
    content: text('content'),
    tweetHtml: text('tweet_html'),
    ogImage: text('og_image'),
    domain: text('domain'),
    notes: text('notes'),
    isTweet: boolean('is_tweet').default(false),
    hasMedia: boolean('has_media').default(false),
    isKeeper: boolean('is_keeper').default(false),
    isSkipped: boolean('is_skipped').default(false),
    isCategorized: boolean('is_categorized').default(false),
    addDate: timestamp('add_date'),
    lastViewedAt: timestamp('last_viewed_at'),
    chromeFolderPath: text('chrome_folder_path'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    // fts tsvector column is GENERATED ALWAYS in SQL, not declared here.
    // Managed via custom migration SQL.
  },
  (t) => [
    index('idx_bookmarks_domain').on(t.domain),
    index('idx_bookmarks_is_tweet').on(t.isTweet),
    index('idx_bookmarks_add_date').on(t.addDate),
    index('idx_bookmarks_is_keeper').on(t.isKeeper),
  ]
)

// ── Categories ─────────────────────────────────────────────────────────────────

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
    sortOrder: integer('sort_order').default(0),
    usageCount: integer('usage_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('idx_categories_parent').on(t.parentId),
    index('idx_categories_usage').on(t.usageCount),
  ]
)

// ── Settings ───────────────────────────────────────────────────────────────────

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ── Bookmark Categories (junction) ─────────────────────────────────────────────

export const bookmarkCategories = pgTable(
  'bookmark_categories',
  {
    bookmarkId: uuid('bookmark_id')
      .notNull()
      .references(() => bookmarks.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.bookmarkId, t.categoryId] })]
)

// ── Exported types ─────────────────────────────────────────────────────────────

export type Bookmark = typeof bookmarks.$inferSelect
export type NewBookmark = typeof bookmarks.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Setting = typeof settings.$inferSelect
export type BookmarkCategory = typeof bookmarkCategories.$inferSelect
