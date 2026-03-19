CREATE TABLE task_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📋',
  color text NOT NULL DEFAULT '#06B6D4',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX task_lists_couple_id_idx ON task_lists(couple_id);

ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_lists_select" ON task_lists
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "task_lists_insert" ON task_lists
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "task_lists_update" ON task_lists
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "task_lists_delete" ON task_lists
  FOR DELETE USING (couple_id = get_my_couple_id());

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  due_date date,
  priority smallint NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_list_id_idx ON tasks(list_id);
CREATE INDEX tasks_couple_id_idx ON tasks(couple_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (couple_id = get_my_couple_id());

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
