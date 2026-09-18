CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  owner_name TEXT NOT NULL,
  vault_name TEXT NOT NULL,
  setup_completed_at TEXT
);

CREATE TABLE IF NOT EXISTS preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
  density TEXT NOT NULL CHECK (density IN ('comfortable', 'compact')),
  sidebar_mode TEXT NOT NULL CHECK (sidebar_mode IN ('expanded', 'collapsed')),
  content_width TEXT NOT NULL CHECK (content_width IN ('focused', 'wide')),
  start_at_login INTEGER NOT NULL CHECK (start_at_login IN (0, 1))
);

CREATE TABLE IF NOT EXISTS starter_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS security (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_verifier TEXT,
  updated_at TEXT
);

PRAGMA user_version = 1;
