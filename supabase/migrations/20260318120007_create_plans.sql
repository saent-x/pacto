CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other', -- travel, date_night, home, life_goal, other
  target_date date,
  budget numeric(10,2),
  status text NOT NULL DEFAULT 'idea', -- idea, planning, scheduled, completed
  cover_image_url text,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plans_couple_id_idx ON plans(couple_id);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select" ON plans
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "plans_insert" ON plans
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "plans_update" ON plans
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "plans_delete" ON plans
  FOR DELETE USING (couple_id = get_my_couple_id());

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
