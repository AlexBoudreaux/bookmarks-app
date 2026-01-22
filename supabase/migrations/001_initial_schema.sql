-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Main bookmarks table
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  tweet_html TEXT,
  og_image TEXT,
  domain TEXT,
  notes TEXT,
  is_tweet BOOLEAN DEFAULT FALSE,
  has_media BOOLEAN DEFAULT FALSE,
  is_keeper BOOLEAN DEFAULT FALSE,
  is_skipped BOOLEAN DEFAULT FALSE,
  is_categorized BOOLEAN DEFAULT FALSE,
  add_date TIMESTAMP,
  last_viewed_at TIMESTAMP,
  chrome_folder_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories (hierarchical)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id),
  sort_order INT DEFAULT 0,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- App settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Junction table
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

-- Full-text search
ALTER TABLE bookmarks ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(notes, ''))
  ) STORED;
CREATE INDEX idx_bookmarks_fts ON bookmarks USING GIN(fts);
