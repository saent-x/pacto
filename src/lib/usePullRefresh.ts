import { useCallback, useEffect, useRef, useState } from 'react';

// Convex queries are live subscriptions, so there is nothing to manually refetch —
// the data on screen is already current. Pull-to-refresh is therefore a tactile
// affordance: it shows the spinner briefly, then releases. An optional `onRefresh`
// callback lets a screen run extra work (and, if it returns a promise, the spinner
// is held until it settles).
const SETTLE_MS = 650;

export function usePullRefresh(onRefresh?: () => void | Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRefreshing(true);
    const release = () => {
      timer.current = setTimeout(() => setRefreshing(false), SETTLE_MS);
    };
    const result = onRefresh?.();
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(release, release);
    } else {
      release();
    }
  }, [onRefresh]);

  return { refreshing, onRefresh: refresh };
}
