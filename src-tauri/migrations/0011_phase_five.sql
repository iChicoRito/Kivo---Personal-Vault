CREATE VIRTUAL TABLE item_search USING fts5(
  item_id UNINDEXED, kind UNINDEXED, title, body,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE item_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

ALTER TABLE index_state ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
UPDATE index_state SET status = 'indexed' WHERE indexed_at IS NOT NULL;
CREATE INDEX item_versions_item_idx ON item_versions (item_id, created_at DESC);

INSERT INTO item_search(item_id, kind, title, body)
SELECT id, kind, title, content FROM items WHERE kind = 'note' AND deleted_at IS NULL;

UPDATE index_state SET needs_index = 0, status = 'indexed',
  indexed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE item_id IN (SELECT id FROM items WHERE kind = 'note' AND deleted_at IS NULL);
