ALTER TABLE preferences ADD COLUMN semantic_search INTEGER NOT NULL DEFAULT 0
  CHECK (semantic_search IN (0, 1));
ALTER TABLE preferences ADD COLUMN auto_tag INTEGER NOT NULL DEFAULT 0
  CHECK (auto_tag IN (0, 1));
ALTER TABLE preferences ADD COLUMN summaries INTEGER NOT NULL DEFAULT 0
  CHECK (summaries IN (0, 1));

CREATE TABLE item_vectors (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  terms TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
