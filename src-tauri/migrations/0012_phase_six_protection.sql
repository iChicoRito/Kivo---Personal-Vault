ALTER TABLE preferences ADD COLUMN auto_lock_minutes INTEGER NOT NULL DEFAULT 0
  CHECK (auto_lock_minutes >= 0);

ALTER TABLE files ADD COLUMN encrypted INTEGER NOT NULL DEFAULT 0
  CHECK (encrypted IN (0, 1));

ALTER TABLE security ADD COLUMN encryption_enabled INTEGER NOT NULL DEFAULT 0
  CHECK (encryption_enabled IN (0, 1));
ALTER TABLE security ADD COLUMN encryption_salt BLOB;
ALTER TABLE security ADD COLUMN wrapped_key BLOB;

CREATE TABLE item_secrets (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  nonce BLOB NOT NULL,
  ciphertext BLOB NOT NULL
);

-- Existing note versions remain plaintext until the owner enables encryption.
-- While protection is on, content is empty and encrypted_content holds
-- nonce || authenticated ciphertext.
ALTER TABLE item_versions ADD COLUMN encrypted_content BLOB;
