-- Couples table
CREATE TABLE couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  anniversary_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  partner_1_id uuid NOT NULL REFERENCES profiles(id),
  partner_2_id uuid REFERENCES profiles(id)
);

ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- Add FK from profiles to couples (circular reference resolved after both tables exist)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_couple_id_fkey
  FOREIGN KEY (couple_id) REFERENCES couples(id);

-- RLS: only couple members can see/update their couple
CREATE POLICY "couples_select" ON couples
  FOR SELECT USING (partner_1_id = auth.uid() OR partner_2_id = auth.uid());

CREATE POLICY "couples_insert" ON couples
  FOR INSERT WITH CHECK (partner_1_id = auth.uid());

CREATE POLICY "couples_update" ON couples
  FOR UPDATE USING (partner_1_id = auth.uid() OR partner_2_id = auth.uid());

-- Helper function: get current user's couple_id (used by all feature table RLS)
CREATE OR REPLACE FUNCTION get_my_couple_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT couple_id FROM profiles WHERE id = auth.uid()
$$;

-- Now replace the temporary profiles_select policy with one that includes partner visibility
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR couple_id = get_my_couple_id()
  );

-- RPC: join a couple via invite code
CREATE OR REPLACE FUNCTION join_couple(code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_couple_id uuid;
BEGIN
  SELECT id INTO v_couple_id FROM couples
  WHERE invite_code = code AND partner_2_id IS NULL;

  IF v_couple_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or already-used invite code';
  END IF;

  UPDATE couples SET partner_2_id = auth.uid() WHERE id = v_couple_id;
  UPDATE profiles SET couple_id = v_couple_id WHERE id = auth.uid();

  RETURN v_couple_id;
END;
$$;

-- RPC: create a couple
CREATE OR REPLACE FUNCTION create_couple(couple_name text, code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_couple_id uuid;
BEGIN
  INSERT INTO couples (name, invite_code, partner_1_id)
  VALUES (couple_name, code, auth.uid())
  RETURNING id INTO v_couple_id;

  UPDATE profiles SET couple_id = v_couple_id WHERE id = auth.uid();

  RETURN v_couple_id;
END;
$$;
