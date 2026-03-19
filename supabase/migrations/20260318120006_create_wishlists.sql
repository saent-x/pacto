CREATE TABLE wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wishlists_couple_id_idx ON wishlists(couple_id);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlists_select" ON wishlists
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "wishlists_insert" ON wishlists
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "wishlists_update" ON wishlists
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "wishlists_delete" ON wishlists
  FOR DELETE USING (couple_id = get_my_couple_id());

CREATE TABLE wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text,
  price numeric(10,2),
  image_url text,
  is_purchased boolean NOT NULL DEFAULT false,
  purchased_by uuid REFERENCES profiles(id),
  priority smallint NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  added_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wishlist_items_wishlist_id_idx ON wishlist_items(wishlist_id);
CREATE INDEX wishlist_items_couple_id_idx ON wishlist_items(couple_id);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_items_select" ON wishlist_items
  FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "wishlist_items_insert" ON wishlist_items
  FOR INSERT WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "wishlist_items_update" ON wishlist_items
  FOR UPDATE USING (couple_id = get_my_couple_id());
CREATE POLICY "wishlist_items_delete" ON wishlist_items
  FOR DELETE USING (couple_id = get_my_couple_id());
