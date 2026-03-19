import { create } from 'zustand';
import { supabase } from '@/src/lib/supabase';
import { Couple, Profile } from '@/src/types/database';

interface CoupleState {
  couple: Couple | null;
  partner: Profile | null;
  coupleId: string | null;
  isLoading: boolean;
  fetchCouple: (coupleId: string) => Promise<void>;
  fetchPartner: (coupleId: string, myUserId: string) => Promise<void>;
  setCouple: (couple: Couple | null) => void;
  reset: () => void;
}

export const useCoupleStore = create<CoupleState>((set) => ({
  couple: null,
  partner: null,
  coupleId: null,
  isLoading: false,

  fetchCouple: async (coupleId: string) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('couples')
      .select('*')
      .eq('id', coupleId)
      .single();

    if (data) {
      const couple = data as Couple;
      set({ couple, coupleId: couple.id, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  fetchPartner: async (coupleId: string, myUserId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('couple_id', coupleId)
      .not('id', 'eq', myUserId)
      .single();

    if (data) {
      set({ partner: data as Profile });
    }
  },

  setCouple: (couple) => {
    set({ couple, coupleId: couple?.id ?? null });
  },

  reset: () => {
    set({ couple: null, partner: null, coupleId: null, isLoading: false });
  },
}));
