CREATE TABLE milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '❤️',
  photo_url text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX milestones_couple_id_idx ON milestones(couple_id);
CREATE INDEX milestones_date_idx ON milestones(date DESC);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones_select" ON milestones
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "milestones_insert" ON milestones
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "milestones_update" ON milestones
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "milestones_delete" ON milestones
  FOR DELETE USING (couple_id = get_my_couple_id());
