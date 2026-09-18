-- Phase 3 adds pinning, soft delete, and a collection icon. Every change is an
-- added column, so an existing version 3 vault upgrades in place with no data loss.

ALTER TABLE items ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN deleted_at TEXT;
ALTER TABLE collections ADD COLUMN icon TEXT;
