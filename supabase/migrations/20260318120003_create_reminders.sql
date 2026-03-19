CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  due_at timestamptz NOT NULL,
  recurrence text, -- 'daily', 'weekly', 'monthly', 'yearly'
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  priority smallint NOT NULL DEFAULT 0, -- 0=none, 1=low, 2=medium, 3=high
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reminders_couple_id_idx ON reminders(couple_id);
CREATE INDEX reminders_due_at_idx ON reminders(due_at);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_select" ON reminders
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "reminders_insert" ON reminders
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "reminders_update" ON reminders
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "reminders_delete" ON reminders
  FOR DELETE USING (couple_id = get_my_couple_id());

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
