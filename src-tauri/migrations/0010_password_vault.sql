-- The password vault stores a salt and a canary blob, never the master password.
-- Only the password column of a credential is encrypted; the rest stays readable
-- so the list and search stay fast.
CREATE TABLE vault_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salt BLOB NOT NULL,
  canary_nonce BLOB NOT NULL,
  canary_ciphertext BLOB NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  password_nonce BLOB NOT NULL,
  password_ciphertext BLOB NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX credentials_live ON credentials (updated_at DESC);
