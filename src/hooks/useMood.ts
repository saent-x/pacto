import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { useCoupleStore } from '@/src/stores/coupleStore';
import { useRealtime } from './useRealtime';
import { MoodCheckIn } from '@/src/types/database';

export function useMood() {
  const userId = useAuthStore((s) => s.user?.id);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const partner = useCoupleStore((s) => s.partner);

  const [myMood, setMyMood] = useState<MoodCheckIn | null>(null);
  const [partnerMood, setPartnerMood] = useState<MoodCheckIn | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchMoods = useCallback(async () => {
    if (!coupleId || !userId) return;

    const [myResult, partnerResult] = await Promise.all([
      supabase
        .from('mood_check_ins')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .maybeSingle(),
      partner?.id
        ? supabase
            .from('mood_check_ins')
            .select('*')
            .eq('couple_id', coupleId)
            .eq('user_id', partner.id)
            .eq('check_in_date', today)
            .eq('is_private', false)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (myResult.data) setMyMood(myResult.data as MoodCheckIn);
    if (partnerResult.data) setPartnerMood(partnerResult.data as MoodCheckIn);
    setIsLoading(false);
  }, [coupleId, userId, partner?.id, today]);

  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  useRealtime<MoodCheckIn>(
    'mood_check_ins',
    (record) => {
      if (record.check_in_date === today) {
        if (record.user_id === userId) setMyMood(record);
        else if (!record.is_private) setPartnerMood(record);
      }
    },
    (record) => {
      if (record.check_in_date === today) {
        if (record.user_id === userId) setMyMood(record);
        else if (!record.is_private) setPartnerMood(record);
      }
    },
  );

  const checkIn = useCallback(
    async (mood: number, emoji: string, note?: string) => {
      if (!coupleId || !userId) return;

      const payload = {
        couple_id: coupleId,
        user_id: userId,
        mood,
        emoji,
        note: note ?? null,
        is_private: false,
        check_in_date: today,
      };

      // Optimistic update
      setMyMood({ ...payload, id: myMood?.id ?? 'temp', created_at: new Date().toISOString() } as MoodCheckIn);

      const { error } = await supabase
        .from('mood_check_ins')
        .upsert(payload as any, { onConflict: 'user_id,check_in_date' });

      if (error) {
        setMyMood(null);
        console.warn('[Coupl] Mood check-in failed:', error.message);
      }
    },
    [coupleId, userId, today, myMood?.id],
  );

  return { myMood, partnerMood, isLoading, checkIn };
}
