CREATE TABLE checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_template boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX checklists_couple_id_idx ON checklists(couple_id);

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklists_select" ON checklists
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "checklists_insert" ON checklists
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "checklists_update" ON checklists
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "checklists_delete" ON checklists
  FOR DELETE USING (couple_id = get_my_couple_id());

CREATE TABLE checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by uuid REFERENCES profiles(id),
  sort_order integer NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES checklist_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX checklist_items_checklist_id_idx ON checklist_items(checklist_id);
CREATE INDEX checklist_items_couple_id_idx ON checklist_items(couple_id);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_items_select" ON checklist_items
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "checklist_items_insert" ON checklist_items
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "checklist_items_update" ON checklist_items
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "checklist_items_delete" ON checklist_items
  FOR DELETE USING (couple_id = get_my_couple_id());
