-- A collection can be open, protected by a password, or protected by a PIN. The
-- argon2 hash lives in secret_hash; the raw secret is never stored.
ALTER TABLE collections ADD COLUMN protection TEXT NOT NULL DEFAULT 'none'
  CHECK (protection IN ('none', 'password', 'pin'));
ALTER TABLE collections ADD COLUMN secret_hash TEXT;
