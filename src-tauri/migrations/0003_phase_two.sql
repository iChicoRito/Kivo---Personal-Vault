-- Phase 2 stores vault items, their organization, and the details of managed files.
-- Onboarding collections become real collections so the owner's first choices survive.

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

INSERT INTO collections (id, name, sort_order, created_at)
SELECT lower(hex(randomblob(16))), name, sort_order,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM starter_collections;

DROP TABLE starter_collections;

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('note', 'source', 'file')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT,
  url TEXT,
  collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS index_state (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  needs_index INTEGER NOT NULL DEFAULT 1 CHECK (needs_index IN (0, 1)),
  indexed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS items_collection_idx ON items (collection_id);
CREATE INDEX IF NOT EXISTS items_kind_updated_idx ON items (kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS item_tags_tag_idx ON item_tags (tag_id);
CREATE INDEX IF NOT EXISTS activity_created_idx ON activity (created_at DESC);
