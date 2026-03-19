CREATE TABLE mood_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  mood smallint NOT NULL CHECK (mood BETWEEN 1 AND 5),
  emoji text NOT NULL,
  note text,
  is_private boolean NOT NULL DEFAULT false,
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, check_in_date)
);

CREATE INDEX mood_check_ins_couple_id_idx ON mood_check_ins(couple_id);
CREATE INDEX mood_check_ins_date_idx ON mood_check_ins(check_in_date DESC);

ALTER TABLE mood_check_ins ENABLE ROW LEVEL SECURITY;

-- Can see shared moods from couple, or own private moods
CREATE POLICY "mood_select" ON mood_check_ins
  FOR SELECT USING (
    couple_id = get_my_couple_id()
    AND (is_private = false OR user_id = auth.uid())
  );

CREATE POLICY "mood_insert" ON mood_check_ins
  FOR INSERT WITH CHECK (
    couple_id = get_my_couple_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "mood_update" ON mood_check_ins
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "mood_delete" ON mood_check_ins
  FOR DELETE USING (user_id = auth.uid());
