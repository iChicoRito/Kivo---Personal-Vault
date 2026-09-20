-- The Notes page remembers whether the reader prefers cards or rows. The default
-- keeps existing vaults on the grid layout, and the toggle writes the other value.
ALTER TABLE preferences ADD COLUMN notes_view TEXT NOT NULL DEFAULT 'grid' CHECK (notes_view IN ('grid', 'list'));
