-- Smart EDMS Migration: Add tags field to Document model
--
-- Adds a `tags` array column to the documents table for lightweight tag
-- management (spec §9.3 — "attach tags and labels").
--
-- Tags are stored as a PostgreSQL text[] column with a default of '{}'.
-- This is simpler than a separate DocumentTag junction table for the
-- common case of < 20 tags per document. For high-volume tagging, a
-- junction table with an index on tag would be more efficient.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for fast tag membership queries (WHERE 'invoice' = ANY(tags))
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN (tags);
