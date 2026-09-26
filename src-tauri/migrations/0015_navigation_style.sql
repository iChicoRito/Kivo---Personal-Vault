-- The app shell can show its navigation as the floating dock or as a left
-- sidebar. Existing vaults keep the dock, which was the only layout before.
ALTER TABLE preferences ADD COLUMN navigation_style TEXT NOT NULL DEFAULT 'dock' CHECK (navigation_style IN ('dock', 'sidebar'));
