CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  title text,
  body text NOT NULL,
  mood text, -- emoji
  is_private boolean NOT NULL DEFAULT false,
  media_urls text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX journal_entries_couple_id_idx ON journal_entries(couple_id);
CREATE INDEX journal_entries_entry_date_idx ON journal_entries(entry_date DESC);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Can see shared entries from couple, or own private entries
CREATE POLICY "journal_select" ON journal_entries
  FOR SELECT USING (
    couple_id = get_my_couple_id()
    AND (is_private = false OR author_id = auth.uid())
  );

CREATE POLICY "journal_insert" ON journal_entries
  FOR INSERT WITH CHECK (
    couple_id = get_my_couple_id()
    AND author_id = auth.uid()
  );

-- Can only edit own entries
CREATE POLICY "journal_update" ON journal_entries
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "journal_delete" ON journal_entries
  FOR DELETE USING (author_id = auth.uid());

CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
