-- The sidebar and content-width preferences were removed from the app, so the
-- columns that stored them no longer have a source. Existing values for the
-- remaining preferences are copied over before the old table is dropped.
CREATE TABLE preferences_rebuilt (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
  density TEXT NOT NULL CHECK (density IN ('comfortable', 'compact')),
  start_at_login INTEGER NOT NULL CHECK (start_at_login IN (0, 1))
);

INSERT INTO preferences_rebuilt (id, theme, density, start_at_login)
  SELECT id, theme, density, start_at_login FROM preferences;

DROP TABLE preferences;

ALTER TABLE preferences_rebuilt RENAME TO preferences;

PRAGMA user_version = 2;
