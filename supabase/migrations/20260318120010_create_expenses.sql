CREATE TABLE shared_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(10,2) NOT NULL,
  paid_by uuid NOT NULL REFERENCES profiles(id),
  split_type text NOT NULL DEFAULT 'equal', -- equal, full_payer, custom
  split_amount numeric(10,2), -- the other partner's share (for custom splits)
  category text NOT NULL DEFAULT 'other', -- food, home, entertainment, transport, other
  date date NOT NULL DEFAULT CURRENT_DATE,
  is_settled boolean NOT NULL DEFAULT false,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shared_expenses_couple_id_idx ON shared_expenses(couple_id);
CREATE INDEX shared_expenses_date_idx ON shared_expenses(date DESC);

ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select" ON shared_expenses
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "expenses_insert" ON shared_expenses
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "expenses_update" ON shared_expenses
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "expenses_delete" ON shared_expenses
  FOR DELETE USING (couple_id = get_my_couple_id());
