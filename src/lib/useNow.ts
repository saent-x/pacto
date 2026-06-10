import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Tab screens stay mounted for the app's whole lifetime (and iOS keeps the app
// alive in the background for days), so any "now"/"today" captured at mount goes
// stale across midnight. These hooks re-anchor on foreground/focus instead.

/** Day-boundary-aware "today": refreshes when the app foregrounds or the screen
 *  regains focus, re-rendering only when the calendar day actually changed. */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());
  const refresh = useCallback(() => {
    setToday((prev) => {
      const now = new Date();
      return prev.toDateString() === now.toDateString() ? prev : now;
    });
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  return today;
}

/** Ticking "now" for live markers/countdowns: updates every `ms` while the app
 *  is active (paused in the background), and immediately on foreground. */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!id) id = setInterval(() => setNow(new Date()), ms);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    start();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setNow(new Date());
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [ms]);
  return now;
}
