-- Tags move from the tags + item_tags tables into a JSON array column on each
-- item. Existing links are folded into the new column before the old tables go.
ALTER TABLE items ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';

UPDATE items SET tags = (
  SELECT json_group_array(name) FROM (
    SELECT t.name
    FROM item_tags it
    JOIN tags t ON t.id = it.tag_id
    WHERE it.item_id = items.id
    ORDER BY t.name COLLATE NOCASE
  )
);

DROP TABLE item_tags;
DROP TABLE tags;
