DROP INDEX IF EXISTS file_one_current;
CREATE UNIQUE INDEX IF NOT EXISTS file_logical_immutable ON file_versions(account_id, workspace_id, logical_id);
