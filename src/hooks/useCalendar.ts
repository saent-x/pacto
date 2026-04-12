import { useCallback, useEffect, useMemo, useState } from 'react';
import { addMonths, format, parseISO } from 'date-fns';
import { db } from '@/src/lib/instant';
import type { CalendarView } from '@/src/lib/home/types';
import { formatMonthLabel } from '@/src/lib/home/builders';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchCalendarView(
  token: string | null,
  month: string,
  selectedDate: string | null,
): Promise<CalendarView | null> {
  if (!token) return null;
  try {
    const params = new URLSearchParams({ month });
    if (selectedDate) params.set('selectedDate', selectedDate);
    const res = await fetch(`${API_BASE}/api/calendar?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useCalendar() {
  const initialDate = todayString();
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [view, setView] = useState<CalendarView | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const monthDate = useMemo(() => parseISO(`${month}-01`), [month]);

  const filteredAgenda = useMemo(() => {
    if (!view?.agenda || !selectedDate) return view?.agenda ?? [];
    return view.agenda.filter((item) => {
      if (item.occursAt === null) return false;
      return new Date(item.occursAt).toISOString().slice(0, 10) === selectedDate;
    });
  }, [view?.agenda, selectedDate]);

  const loadView = useCallback(async () => {
    const user = await db.getAuth();
    const token = user?.refresh_token ?? null;
    setIsLoading(true);
    const result = await fetchCalendarView(token, month, null);
    setView(result);
    setIsLoading(false);
  }, [month]);

  useEffect(() => {
    loadView();
  }, [loadView]);

  const selectDate = (nextDate: string | null) => {
    if (!nextDate) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(nextDate);
    setMonth(nextDate.slice(0, 7));
  };

  const setMonthAndSelection = (nextMonth: string) => {
    setMonth(nextMonth);
    setSelectedDate((current) =>
      current && current.startsWith(nextMonth) ? current : `${nextMonth}-01`,
    );
  };

  return {
    isLoading,
    month: view?.month ?? month,
    monthLabel: view?.monthLabel ?? format(monthDate, 'MMMM yyyy'),
    selectedDate: view?.selectedDate ?? selectedDate,
    days: view?.days ?? [],
    agenda: filteredAgenda,
    milestones: view?.milestones ?? [],
    selectDate,
    goToPreviousMonth: () => {
      setMonthAndSelection(format(addMonths(monthDate, -1), 'yyyy-MM'));
    },
    goToNextMonth: () => {
      setMonthAndSelection(format(addMonths(monthDate, 1), 'yyyy-MM'));
    },
    goToToday: () => {
      const today = todayString();
      setSelectedDate(today);
      setMonth(today.slice(0, 7));
    },
    refetch: loadView,
  };
}
