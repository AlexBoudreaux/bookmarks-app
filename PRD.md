# Bookmarks App PRD

Personal bookmark categorization and search tool. Import Chrome bookmarks, categorize them with keyboard-driven UX, search and filter later.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui (dark mode only)
- **Database**: Supabase (Postgres + pgvector for future semantic search)
- **Tweet Embeds**: react-tweet (no API key needed)
- **Link Previews**: Open Graph metadata fetching for non-tweets
- **Deployment**: Vercel
- **Target**: Desktop-first, mobile-friendly

---

## Infrastructure (Phase 0 Complete)

### URLs
- **Production**: https://bookmarks-app-psi-self.vercel.app
- **GitHub**: https://github.com/AlexBoudreaux/bookmarks-app
- **Supabase Dashboard**: https://supabase.com/dashboard/project/sypyaakbmczqptfoetud

### Supabase Project
- **Project Name**: supabase-bookmarks
- **Project Ref**: sypyaakbmczqptfoetud
- **Region**: (auto-selected by Vercel integration)

### What's Configured
- Next.js 16 with TypeScript, Tailwind v4, ESLint, App Router, src directory
- Supabase integration via Vercel (auto-injects env vars)
- shadcn/ui initialized (slate theme, CSS variables)
- Database schema deployed (bookmarks, categories, settings, bookmark_categories)
- Full-text search index on bookmarks
- Supabase CLI linked for migrations (`supabase/migrations/`)

### Installed Packages
- `@supabase/supabase-js` (database client)
- `react-tweet` (tweet embeds)
- shadcn/ui dependencies (class-variance-authority, clsx, tailwind-merge, etc.)

### Files Created
- `src/lib/supabase.ts` (Supabase client)
- `src/lib/utils.ts` (shadcn cn() helper)
- `supabase/migrations/001_initial_schema.sql` (database schema)
- `components.json` (shadcn config)

---

## Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...
```

**Note:** No authentication required. App is single-user, personal use only. Supabase anon key is fine to expose client-side since data isn't sensitive.

---

## Data Overview

From analysis of the actual bookmarks file:
- **Total bookmarks**: ~2,065
- **Tweet bookmarks**: ~1,558 (75%)
- **Keeper bookmarks**: Everything before and including the "Tools" folder
- **To categorize**: Everything after the "Tools" folder

---

## Chrome Bookmarks HTML Format

Chrome exports bookmarks as Netscape bookmark format HTML.

### Structure

```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="timestamp" LAST_MODIFIED="timestamp" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>
    <DL><p>
        <!-- Folders use H3 -->
        <DT><H3 ADD_DATE="timestamp" LAST_MODIFIED="timestamp">Folder Name</H3>
        <DL><p>
            <!-- Bookmarks use A tags -->
            <DT><A HREF="url" ADD_DATE="timestamp" ICON="data:...">Title</A>
        </DL><p>

        <!-- Top-level bookmarks -->
        <DT><A HREF="url" ADD_DATE="timestamp">Title</A>
    </DL><p>
</DL><p>
```

### Key attributes

- `ADD_DATE`: Unix timestamp in seconds (not milliseconds)
- `LAST_MODIFIED`: Unix timestamp for folders
- `ICON`: Base64 encoded favicon (can be large, often ignored)
- `PERSONAL_TOOLBAR_FOLDER="true"`: Marks the bookmarks bar folder

### Parsing notes

- Folders are `<DT><H3>` elements followed by nested `<DL>`
- Bookmarks are `<DT><A>` elements
- The nesting via `<DL>` tags defines folder hierarchy
- Tweet bookmarks often have the tweet text in the title, e.g., `Naval on X: "How to Get Rich (without getting lucky):" / X`
- Some tweet titles are just "X" with no useful content

---

## Database Schema

### Tables

```sql
-- Main bookmarks table
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,        -- Unique to prevent duplicates on re-import
  title TEXT,
  content TEXT,                    -- Cached tweet text or OG description
  tweet_html TEXT,                 -- Cached react-tweet HTML for tweets
  og_image TEXT,                   -- Open Graph image URL for non-tweets
  domain TEXT,                     -- Extracted domain (twitter.com, github.com, etc.)
  notes TEXT,                      -- User's personal notes about the bookmark
  is_tweet BOOLEAN DEFAULT FALSE,
  has_media BOOLEAN DEFAULT FALSE, -- For tweets: has images/video
  is_keeper BOOLEAN DEFAULT FALSE, -- True = keeper bookmark (before boundary), False = to categorize
  is_skipped BOOLEAN DEFAULT FALSE, -- True = user skipped, exclude from re-import
  is_categorized BOOLEAN DEFAULT FALSE, -- True = has at least one category assigned
  add_date TIMESTAMP,              -- Original bookmark date from Chrome
  last_viewed_at TIMESTAMP,        -- For "Recently viewed" sort
  chrome_folder_path TEXT,         -- For keepers: original folder path for export (e.g., "Bookmarks Bar/Work/Tools")
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories (hierarchical)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id), -- NULL for main categories
  sort_order INT DEFAULT 0,                 -- Manual ordering via drag-and-drop
  usage_count INT DEFAULT 0,                -- Incremented when category is assigned, for "most used" sorting
  created_at TIMESTAMP DEFAULT NOW()
);

-- App settings (boundary config, preferences, etc.)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Boundary config stored as:
-- key: 'import_boundary'
-- value: { "folder": "Tools", "lastUrl": "https://byebyepaywall.com/en/" }

-- Junction table for multi-category support
CREATE TABLE bookmark_categories (
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, category_id)
);

-- Indexes
CREATE INDEX idx_bookmarks_domain ON bookmarks(domain);
CREATE INDEX idx_bookmarks_is_tweet ON bookmarks(is_tweet);
CREATE INDEX idx_bookmarks_add_date ON bookmarks(add_date);
CREATE INDEX idx_bookmarks_is_keeper ON bookmarks(is_keeper);
CREATE INDEX idx_bookmarks_is_categorized ON bookmarks(is_categorized) WHERE is_categorized = FALSE;
CREATE INDEX idx_bookmarks_is_skipped ON bookmarks(is_skipped) WHERE is_skipped = TRUE;
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_usage ON categories(usage_count DESC);

-- Full-text search (Supabase/Postgres)
ALTER TABLE bookmarks ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(notes, ''))
  ) STORED;
CREATE INDEX idx_bookmarks_fts ON bookmarks USING GIN(fts);

-- Vector embeddings for semantic search
ALTER TABLE bookmarks ADD COLUMN embedding vector(1536); -- OpenAI text-embedding-3-small = 1536 dimensions
CREATE INDEX idx_bookmarks_embedding ON bookmarks USING hnsw (embedding vector_cosine_ops);
```

---

## Project Structure

```
/app
  /page.tsx                    # Landing/import page
  /categorize/page.tsx         # Keyboard-driven categorization flow
  /browse/page.tsx             # Filter + search after categorization
  /categories/page.tsx         # Category management (add, edit, delete, reorder)
  /api
    /bookmarks/route.ts        # CRUD for bookmarks
    /categories/route.ts       # CRUD for categories
    /import/route.ts           # Parse and import Chrome HTML
    /export/route.ts           # Export keepers back to Chrome format
    /tweet/[id]/route.ts       # Fetch tweet data via react-tweet
    /og/route.ts               # Fetch Open Graph metadata for non-tweets
    /embed/route.ts            # Generate embeddings via gte-small

/components
  /import
    /dropzone.tsx              # Drag and drop file upload
    /import-summary.tsx        # Shows count of keepers vs to-categorize
    /boundary-picker.tsx       # UI to set new boundary if detection fails
  /categorize
    /bookmark-preview.tsx      # Renders tweet embed or link card
    /category-picker.tsx       # Shows main categories (1-9, 0, -)
    /subcategory-picker.tsx    # Shows subcategories after main selection
    /category-chips.tsx        # Shows selected category pairs as tags
    /progress-bar.tsx          # X of Y categorized
    /new-category-modal.tsx    # Modal for creating new category/subcategory
  /browse
    /sidebar-filters.tsx       # Category tree, collapsible
    /search-bar.tsx            # Search input with filters
    /filter-chips.tsx          # Active filters display
    /bookmark-grid.tsx         # Results display
    /bookmark-card.tsx         # Individual bookmark in results
  /ui                          # shadcn components

/lib
  /parse-bookmarks.ts          # Chrome HTML parser
  /supabase.ts                 # Supabase client
  /tweet-utils.ts              # Tweet ID extraction, react-tweet helpers
  /export-bookmarks.ts         # Generate Chrome HTML from keepers

/types
  /bookmark.ts
  /category.ts
```

---

## User Flows

### Flow 1: Import

1. User lands on home page, sees drag-and-drop zone with instructions
2. User drops Chrome bookmarks HTML file
3. App parses HTML, looks for boundary:
   - Find folder named "Tools"
   - Within Tools, find bookmark with URL `https://byebyepaywall.com/en/`
   - Everything up to and including this = "keepers"
   - Everything after = "to categorize"
4. If boundary not found (no Tools folder, or last item changed):
   - Show alert: "Set new end of bookmarks"
   - Display scrollable list of bookmarks
   - User clicks to mark the boundary
5. Show import summary:
   - "Found X bookmarks to categorize"
   - "Y bookmarks will be preserved as keepers"
6. User clicks "Start Categorizing" → navigate to `/categorize`
7. Behind the scenes:
   - Save all "to categorize" bookmarks to Supabase
   - For tweet URLs, queue fetching tweet data via react-tweet
   - Store keepers separately (or flag them) for later export

### Flow 1b: Re-Import (Merge)

When user has already imported and categorized some bookmarks, then imports again with new bookmarks:

1. User drops new Chrome bookmarks HTML file
2. App parses HTML, uses saved boundary from `settings` table
3. If boundary not found → show boundary picker, save new boundary
4. For each bookmark after boundary, check against existing DB:
   - **URL exists + is_categorized = true** → Skip (already done)
   - **URL exists + is_categorized = false** → Skip (already in queue)
   - **URL exists + is_skipped = true** → Skip (user already rejected)
   - **URL is new** → Add to queue (is_categorized = false)
5. Update keepers: add any new keepers, preserve existing keeper data
6. Show merge summary:
   - "Found X new bookmarks to categorize"
   - "Y bookmarks already categorized (unchanged)"
   - "Z bookmarks already in queue"
7. User clicks "Continue Categorizing" → resume from saved position

**Key behaviors:**
- Never duplicate bookmarks (URL is unique constraint)
- Never re-add skipped bookmarks
- Never touch already-categorized bookmarks
- Preserve user's position in queue

### Flow 2: Categorize

**Screen layout:**
- Top: Progress bar showing "X of Y"
- Center: Large bookmark preview
  - For tweets: Full tweet embed via react-tweet
  - For non-tweets: Link card with title, URL, favicon, OG image if available
- Bottom: Category picker UI

**Keyboard controls:**

| Key | Action |
|-----|--------|
| `1-9` | Select main category 1-9 (most common) |
| `0` | Select main category 10 |
| `-` | Create new main category |
| `1-9, 0` (after main cat) | Select subcategory 1-10 (most common) |
| `-` (after main cat) | Create new subcategory |
| `Enter` | After selecting category+subcategory, go back to main categories to add another pair |
| `→` (Right Arrow) | Save current category selections, move to next bookmark (requires at least 1 category) |
| `←` (Left Arrow) | Go back to previous bookmark to edit its categories |
| `Delete` or `Backspace` | Mark bookmark as skipped, flash red briefly, move to next |

**Category limits:** None. Keys 1-9 and 0 access the first 10 most common categories (sorted by usage). Additional categories accessible via scrolling/clicking. Same applies to subcategories.

**Skip behavior:** Pressing Delete marks the bookmark as `is_skipped = true` in the database. The screen flashes red briefly as visual confirmation. Skipped bookmarks are excluded from the Chrome export. User can press ← to go back and un-skip if needed. Nothing is permanently deleted until the Chrome export replaces their bookmarks.

**Required categories:** Each bookmark must have at least one category+subcategory pair before pressing →. "Misc > Uncategorized" serves as catch-all.

**Notes:** Optional text field to add personal context (e.g., "Could use this for my next app about recipes"). Accessible via `N` key or clicking the notes icon. Opens inline text area below the preview. Press `Escape` or click away to close. Notes auto-save on blur.

**Quick-add categories:** The `-` key opens a modal to create a new category or subcategory. When in main category view, creates main category. When in subcategory view, creates subcategory under the current main category. New category immediately selectable after creation.

**State machine:**

```
MAIN_CATEGORIES → (press 1-9 or 0 or click) → SUBCATEGORIES → (press 1-9, 0 or click) → READY_TO_SUBMIT
                                                                                              ↓
                                                  (press Enter) ←──────────────────────────────
                                                       ↓
                                              MAIN_CATEGORIES (add another pair)

READY_TO_SUBMIT → (press →) → SAVE_TO_DB → NEXT_BOOKMARK
MAIN_CATEGORIES (with 1+ pair selected) → (press →) → SAVE_TO_DB → NEXT_BOOKMARK
MAIN_CATEGORIES (with 0 pairs) → (press →) → SHAKE_CATEGORIES (blocked, must select)
SUBCATEGORIES (no subcat selected) → (press →) → SHAKE_SUBCATEGORIES (blocked, must select)
ANY_STATE → (press ←) → PREVIOUS_BOOKMARK
ANY_STATE → (press Delete) → FLASH_RED → MARK_SKIPPED_IN_DB → NEXT_BOOKMARK
```

**Shake Animation:** When user presses → without completing a category+subcategory selection, the category picker shakes horizontally (~3 quick oscillations, 200ms total) to indicate "you must select first". No toast or modal, just the visual shake.

**Visual feedback:**
- Selected main category is highlighted
- After subcategory selected, show chip/tag with "MainCat > SubCat"
- Multiple category pairs stack as chips
- Current keyboard state shown (e.g., "Press 1-9 for subcategory" or "Press → to continue")
- **Skip feedback**: Entire card/screen flashes red briefly (~200ms) when Delete pressed
- Categories beyond the first 10 shown in scrollable list below the keyboard shortcuts

**Performance:**
- Preload next 3 bookmarks in background (N+1, N+2, N+3)
- Cache tweet embeds after first fetch
- Optimistic UI updates

**Progress Persistence:**
- Auto-save to Supabase after each categorization (when → is pressed)
- Current position stored in `settings` table: `{ key: 'categorize_position', value: { index: 147 } }`
- On return to `/categorize`, resume from saved position
- If all bookmarks categorized, show completion screen with link to Browse

**Skipped Bookmarks:**
- When Delete/Backspace pressed, bookmark is marked `is_skipped = true` in DB
- Skipped bookmarks are NOT shown in Browse (filtered out by default)
- On re-import, skipped URLs are recognized and not re-added to queue
- Minimal data stored: just URL and is_skipped flag, no category data

### Flow 3: Browse

**Screen layout:**
- Left sidebar (collapsible): Category tree
- Top: Search bar + filter dropdowns
- Main area: Bookmark grid/list

**Sidebar behavior:**
- Main categories listed, each expandable
- Click main category → expands to show subcategories, filters to all bookmarks in that main category
- Click subcategory → filters to just that subcategory
- Shift+click → multi-select subcategories (shows union)
- "All Bookmarks" option at top to clear filters

**Search and filters:**

| Filter | Type | Options |
|--------|------|---------|
| Search | Text input + toggle | Keywords (full-text) or Semantic (meaning-based) |
| Sort | Dropdown | Newest first, Oldest first, Recently viewed |
| Type | Toggle/chips | Tweet, Non-tweet |
| Domain | Multi-select dropdown | Auto-populated from bookmarks (twitter.com, github.com, etc.) |
| Date range | Date picker | Filter by when bookmarked |
| Has media | Toggle | Only tweets with images/video |
| Has notes | Toggle | Only bookmarks with personal notes |
| Multi-category | Toggle | Only bookmarks with 2+ category pairs |

**Bookmark interaction:**
- Click bookmark → opens URL in new tab
- Track "last viewed" timestamp for "Recently viewed" sort
- Hover shows quick preview (including notes if present)
- Edit button to modify categories (opens modal or inline edit)
- Notes icon/indicator if bookmark has notes
- Click notes icon to view/edit notes inline

### Flow 4: Export

1. Button in header or settings: "Export Keepers for Chrome"
2. Generates HTML file in Chrome bookmark format
3. Contains only the "keeper" bookmarks (everything before boundary)
4. User downloads file
5. User imports into Chrome (replaces current bookmarks)
6. Result: Chrome has clean bookmarks bar, app has categorized archive

---

## UI Pages

### Page 1: Home/Import (`/`)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Bookmarks                              [Browse →]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│         ┌─────────────────────────────────────┐             │
│         │                                     │             │
│         │      📁 Drop your Chrome            │             │
│         │         bookmarks.html here         │             │
│         │                                     │             │
│         │      or click to browse             │             │
│         │                                     │             │
│         └─────────────────────────────────────┘             │
│                                                             │
│         How to export from Chrome:                          │
│         1. Open Chrome → Bookmarks → Bookmark Manager       │
│         2. Click ⋮ → Export bookmarks                       │
│         3. Drop the file here                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Page 2: Import Summary (modal or inline after drop)

```
┌─────────────────────────────────────────────────────────────┐
│  Import Summary                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ✓ Found boundary: Tools / byebyepaywall.com               │
│                                                             │
│   📌 42 bookmarks to keep (your bookmarks bar)              │
│   📋 1,847 bookmarks to categorize                          │
│      └─ 1,558 tweets                                        │
│      └─ 289 other links                                     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  [Start Categorizing]                               │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Page 3: Categorize (`/categorize`)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                    147 of 1,847                     │
├─────────────────────────────────────────────────────────────┤
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  8%           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  [Tweet embed via react-tweet]                      │    │
│  │                                                     │    │
│  │  @naval                                             │    │
│  │  How to Get Rich (without getting lucky):           │    │
│  │                                                     │    │
│  │  [Full tweet content rendered nicely]               │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Selected: [AI > Prompts] [Learning > Threads]              │
│                                                             │
│  📝 Notes: [Click or press N to add notes...]               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Categories:                     Press → to continue        │
│                                                             │
│  [1] AI          [2] Dev       [3] Design    [4] Business   │
│  [5] Learning    [6] Tools     [7] Inspiration [8] Ideas    │
│  [9] Resources   [0] Personal  [-] New...                   │
│                                                             │
│  ← Previous    Delete    → Next                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**After selecting main category (e.g., pressed "1" for AI):**

```
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AI → Subcategory:               Press Enter to add more    │
│                                                             │
│  [1] Prompts     [2] Agents    [3] Models    [4] Papers     │
│  [5] Tutorials   [6] News      [-] New...                   │
│                                                             │
│  ← Back to categories                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Page 4: Category Management (`/categories`)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Bookmarks    [← Back to Browse]                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Manage Categories                         [+ Add Category] │
│                                                             │
│  Drag to reorder. Most-used categories appear first in      │
│  keyboard shortcuts (1-9, 0).                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ≡  UI                                    [Edit] [×] │    │
│  │    └─ Landing Pages, Components, General UI,        │    │
│  │       Branding/Aesthetic, Fonts, Assets/Resources,  │    │
│  │       Misc                          [+ Add Subcat]  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ ≡  Image Gen                             [Edit] [×] │    │
│  │    └─ Prompting, Styles, Misc       [+ Add Subcat]  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ ≡  General Dev                           [Edit] [×] │    │
│  │    └─ Stack, Infra, Tools, Python,                  │    │
│  │       JS/TS, Open Source            [+ Add Subcat]  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ ≡  AI Dev                                [Edit] [×] │    │
│  │    └─ AI SDK, Agents, LLM Stack, Prompting,         │    │
│  │       Learnings, Fine-Tuning, RAG, MCPs, ML         │    │
│  │                                     [+ Add Subcat]  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ...                                                        │
│                                                             │
│  Note: Deleting a category does not delete bookmarks.       │
│  Bookmarks will become uncategorized and need re-sorting.   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Drag and drop to reorder main categories
- Expand to see/manage subcategories
- Edit category name inline
- Delete category (with warning about affected bookmarks)
- Add new main category
- Add new subcategory under any main category
- Shows bookmark count per category

### Page 5: Browse (`/browse`)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Bookmarks    [Search...........................] 🔍 │
│                      [Sort: Newest ▼] [Type ▼] [More ▼]     │
│                                         [⚙ Categories]      │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  Categories │  Active filters: [Tweet ×] [AI > Prompts ×]   │
│             │                                               │
│  All (1847) │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│             │  │ Tweet   │ │ Tweet   │ │ GitHub  │          │
│  ▼ AI (423) │  │ preview │ │ preview │ │ preview │          │
│    Prompts  │  │         │ │         │ │         │          │
│    Agents   │  │ @naval  │ │ @dan    │ │ repo... │          │
│    Models   │  │ How to..│ │ Thread..│ │ langch..│          │
│    Papers   │  └─────────┘ └─────────┘ └─────────┘          │
│             │                                               │
│  ▶ Dev (312)│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  ▶ Design   │  │ Tweet   │ │ Tweet   │ │ Article │          │
│  ▶ Business │  │ preview │ │ preview │ │ preview │          │
│  ...        │  │         │ │         │ │         │          │
│             │  └─────────┘ └─────────┘ └─────────┘          │
│             │                                               │
│             │  [Load more...]                               │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts Reference

### Categorize Page

| Key | State | Action |
|-----|-------|--------|
| `1-9` | Main categories | Select main category 1-9 (most common by usage) |
| `0` | Main categories | Select main category 10 |
| `-` | Main categories | Open "new category" modal |
| `1-9` | Subcategories | Select subcategory 1-9 (most common by usage) |
| `0` | Subcategories | Select subcategory 10 |
| `-` | Subcategories | Open "new subcategory" modal |
| `Enter` | After subcat selected | Add another category pair |
| `→` | With 1+ category pair | Save and next bookmark |
| `←` | Any | Go to previous bookmark |
| `Delete`/`Backspace` | Any | Mark as skipped, flash red, next bookmark |
| `N` | Any | Open/close notes field |
| `Escape` | Modal/notes open | Close modal or notes |

### Browse Page

| Key | Action |
|-----|--------|
| `/` | Focus search bar |
| `Escape` | Clear search / close modal |

---

## Edge Cases

### Import

- **No Tools folder**: Show boundary picker UI
- **Tools folder but no byebyepaywall.com**: Show boundary picker UI
- **Empty file**: Show error "No bookmarks found"
- **Invalid HTML**: Show error "Could not parse bookmarks file"
- **Duplicate URLs**: Allow duplicates (user may have bookmarked same thing twice intentionally)

### Tweet Fetching

- **Deleted tweet**: Show placeholder "Tweet no longer available" with URL
- **Private account**: Show placeholder "Tweet from private account" with URL
- **Rate limited**: Queue and retry with exponential backoff
- **Failed fetch**: Fall back to title from HTML (often contains tweet text)

### Categorization

- **Going back past first bookmark**: Disable left arrow, show subtle indicator that you're at the start
- **Going forward with no categories selected**: Block it. Must have at least one category+subcategory pair. Show hint "Select at least one category"
- **Category deleted that had bookmarks**: Bookmarks become partially categorized, still searchable
- **Un-skipping a bookmark**: Press ← to go back, bookmark still has `is_skipped = true`. Selecting a category and pressing → clears the skip flag

### Browse

- **No bookmarks match filters**: Show empty state with "No bookmarks found. Try different filters."
- **Search with no results**: Same empty state

---

## Starter Categories

Pre-populated on first launch. User can add, remove, rename, reorder at any time.

Categories are sorted by usage frequency. Most-used categories appear first in the keyboard shortcut positions (1-9, 0).

| Main Category | Subcategories |
|---------------|---------------|
| UI | Landing Pages, Components, General UI, Branding/Aesthetic, Fonts, Assets/Resources, Misc |
| Image Gen | Prompting, Styles, Misc |
| General Dev | Stack, Infra, Tools, Python, JS/TS, Open Source |
| AI Dev | AI SDK, Agents, LLM Stack, Prompting, Learnings, Fine-Tuning, RAG, MCPs, ML |
| Claude Code/Cursor | Skills, CLAUDE.md Prompts, Sub-Agents, MCPs |
| Personal/Growth/Finance | Inspiration, Fitness, Finance, Learnings, Reading, Productivity |
| Business | Ideas, General Business, Marketing |
| Automation/Personal Agent | Prompts, Workflows, Productivity |
| Misc | Uncategorized |

---

## react-tweet Integration

### Installation

```bash
npm install react-tweet
```

### Usage

```tsx
import { Tweet } from 'react-tweet'

// Extract tweet ID from URL
function getTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return match ? match[1] : null
}

// In component
const tweetId = getTweetId(bookmark.url)
if (tweetId) {
  return <Tweet id={tweetId} />
}
```

### Caching Strategy

1. When importing bookmarks, queue tweet IDs for fetching
2. Use react-tweet's API to fetch tweet data server-side
3. Store in Supabase `bookmarks.content` (text) and `bookmarks.tweet_html` (rendered)
4. On display, use cached data first, fall back to live fetch
5. This prevents rate limiting and speeds up categorization

### API Route for Fetching

```ts
// /api/tweet/[id]/route.ts
import { getTweet } from 'react-tweet/api'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tweet = await getTweet(params.id)
  if (!tweet) {
    return Response.json({ error: 'Tweet not found' }, { status: 404 })
  }
  return Response.json(tweet)
}
```

---

## Open Graph Integration (Non-Tweets)

For the ~25% of bookmarks that aren't tweets, fetch Open Graph metadata to show rich previews.

### Library Options

- **open-graph-scraper**: Most popular, Node.js based
- **@vercel/og**: If we need to generate OG images
- **metascraper**: Modular, extracts various metadata

### API Route

```ts
// /api/og/route.ts
import ogs from 'open-graph-scraper'

export async function POST(request: Request) {
  const { url } = await request.json()

  try {
    const { result } = await ogs({ url })
    return Response.json({
      title: result.ogTitle || result.twitterTitle,
      description: result.ogDescription || result.twitterDescription,
      image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url,
      siteName: result.ogSiteName,
      favicon: result.favicon,
    })
  } catch (error) {
    return Response.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
```

### Caching Strategy

1. On import, queue non-tweet URLs for OG fetching
2. Store results in `bookmarks.og_image` and `bookmarks.og_description`
3. Display cached data during categorization
4. Fall back to title/URL from Chrome if OG fetch fails

### Preview Card for Non-Tweets

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────┐                                               │
│  │  [OG     │  Example Article Title                        │
│  │  Image]  │  example.com                                  │
│  │          │                                               │
│  └──────────┘  Description from Open Graph metadata goes    │
│                here, truncated if too long...               │
└─────────────────────────────────────────────────────────────┘
```

---

## Export Back to Chrome

Generate HTML matching Chrome's expected format:

```ts
function exportToChrome(keepers: Bookmark[]): string {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>
    <DL><p>
`

  // Recursively build folder structure from keepers
  // ... implementation details

  html += `    </DL><p>
</DL><p>`

  return html
}
```

The export preserves:
- Original folder structure
- Original ADD_DATE timestamps
- Bookmark order
- Excludes all categorized bookmarks (they live in the app now)

---

## State Management

Use React hooks + URL state for simplicity:

- **Import state**: `useState` for file, parsing status, boundary
- **Categorize state**:
  - Current bookmark index in URL (`/categorize?index=147`)
  - Selected categories in local state
  - Category definitions from Supabase (cached with SWR/React Query)
- **Browse state**:
  - Filters in URL params (`/browse?cat=ai&sub=prompts&type=tweet`)
  - Search query in URL (`/browse?q=langchain`)
  - Enables shareable/bookmarkable filter states

---

## Performance Considerations

1. **Preloading**: When on bookmark N, preload N+1, N+2, N+3
2. **Tweet caching**: Store rendered tweet HTML to avoid re-fetching
3. **Virtual scrolling**: For browse page with 1000+ bookmarks (use `@tanstack/react-virtual`)
4. **Optimistic updates**: When categorizing, update UI immediately, sync to DB in background
5. **Debounced search**: Don't query on every keystroke (300ms debounce)

---

## Loading States

### Import Page

| State | UI |
|-------|-----|
| Idle | Dropzone visible, "Drop your bookmarks.html here" |
| File dropped | "Parsing bookmarks..." with spinner |
| Parsing complete | Import summary modal with counts |
| Boundary not found | Boundary picker UI with scrollable bookmark list |
| Error | Red alert: "Could not parse file. Make sure it's a Chrome bookmarks export." |

### Categorize Page

| State | UI |
|-------|-----|
| Loading bookmark | Skeleton placeholder for preview area |
| Tweet loading | Tweet skeleton (react-tweet has built-in) |
| Tweet failed | "Tweet unavailable" card with URL and "Open in browser" link |
| OG loading | Link card skeleton |
| OG failed | Simple card with just title and URL |
| Saving | Brief "Saving..." indicator (bottom right, non-blocking) |
| Save failed | Toast: "Failed to save. Retrying..." with auto-retry |
| All done | "All bookmarks categorized!" with link to Browse |

### Browse Page

| State | UI |
|-------|-----|
| Loading results | Grid of skeleton cards |
| No results | "No bookmarks found. Try different filters." with clear filters button |
| Loading more | Spinner at bottom of grid |
| Search in progress | Subtle spinner in search bar |

### Category Management

| State | UI |
|-------|-----|
| Loading categories | Skeleton list |
| Saving reorder | Subtle "Saved" toast after drag completes |
| Deleting category | Confirm modal: "Delete [name]? X bookmarks will become uncategorized." |

---

## Embeddings & Semantic Search

Using **OpenAI text-embedding-3-small** via Vercel AI SDK. Simple integration, high quality.

### Model Details

- **Model**: text-embedding-3-small
- **Dimensions**: 1536
- **Provider**: OpenAI via Vercel AI SDK
- **Cost**: ~$0.02 per 1M tokens (pennies for ~2000 bookmarks)

### Generating Embeddings

```ts
// /api/embed/route.ts
import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: Request) {
  const { text } = await request.json()

  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
  })

  return Response.json({ embedding })
}

// Usage: Generate embedding from bookmark content
const text = `${bookmark.title} ${bookmark.content} ${bookmark.notes || ''}`
const response = await fetch('/api/embed', {
  method: 'POST',
  body: JSON.stringify({ text }),
})
const { embedding } = await response.json()
```

### Semantic Search Query

```sql
-- Find similar bookmarks
SELECT id, title, url,
  1 - (embedding <=> query_embedding) as similarity
FROM bookmarks
WHERE embedding IS NOT NULL
  AND is_skipped = FALSE
  AND is_keeper = FALSE
ORDER BY embedding <=> query_embedding
LIMIT 10;
```

### When to Generate Embeddings

1. **On import**: Generate embedding for each bookmark after content is fetched
2. **On note update**: Re-generate embedding when notes change
3. **Async processing**: Use Promise.all with batching (10 at a time) to not overload API

### Search Strategy

Hybrid search combining:
1. **Full-text search** (fts column): Fast keyword matching
2. **Semantic search** (embedding column): Meaning-based similarity
3. **Category filters**: Narrow results by category

UI shows toggle: "Search by keywords" vs "Search by meaning"

---

## Mobile Responsiveness

Desktop-first design, but functional on mobile for occasional use.

### Categorize Page (Mobile)

- Bookmark preview takes full width
- Category buttons become larger tap targets in a 2-column grid
- Swipe right = next bookmark (same as → key)
- Swipe left = previous bookmark (same as ← key)
- Tap to select categories instead of keyboard
- Skip button clearly visible (with red flash feedback)

### Browse Page (Mobile)

- Sidebar becomes a slide-out drawer (hamburger menu)
- Filter chips scroll horizontally
- Bookmark cards stack vertically, single column
- Search bar sticky at top

### Import Page (Mobile)

- File picker instead of drag-and-drop
- Same flow otherwise

---

## Decisions Made

1. **Authentication**: None. Single-user personal app, no sensitive data.
2. **Categories**: Pre-populated starter set, user-defined. No limit on total categories.
3. **Required categories**: Yes, at least one category+subcategory pair required. "Misc > Uncategorized" as catch-all.
4. **Vim navigation**: Skip it. Keyboard shortcuts only for categorize page.
5. **Delete confirmation**: No popup. Flash red briefly as visual feedback. Can undo with ← key.
6. **Theme**: Dark mode only.
7. **Link previews**: Fetch Open Graph data for non-tweets (image, description).
8. **Responsiveness**: Desktop-first, mobile-friendly for occasional on-the-go use.
9. **Skipped bookmarks**: Saved to DB (URL + is_skipped flag) to prevent re-import. Not shown in Browse.
10. **Progress persistence**: Auto-save after each categorization. Resume position stored in settings table.
11. **Re-import**: Merge strategy. Match by URL, skip duplicates/categorized/skipped, add only new bookmarks.
12. **Embeddings**: OpenAI text-embedding-3-small via Vercel AI SDK.
13. **Offline handling**: Not needed. App requires network connection.
14. **State machine validation**: Shake animation if user presses → without completing category+subcategory selection.

---

## Sources

- [react-tweet docs](https://react-tweet.vercel.app/)
- [react-tweet GitHub](https://github.com/vercel/react-tweet)
- [Twitter oEmbed API](https://developer.x.com/en/docs/x-for-websites/oembed-api)
- [Chrome bookmarks file format](http://fileformats.archiveteam.org/wiki/Chrome_bookmarks)
