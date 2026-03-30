import { useMemo, useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { useConvex, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";

import type { CalendarView } from "@/convex/timeline";

const getCalendarViewQuery = makeFunctionReference<
  "query",
  {
    month?: string;
    selectedDate?: string;
    previewDays?: number;
    now?: number;
  },
  CalendarView
>("timeline:getCalendarView");

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function useCalendar() {
  const initialDate = todayString();
  const convex = useConvex();
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [month, setMonth] = useState(initialDate.slice(0, 7));

  const view = useQuery(getCalendarViewQuery, {
    month,
    ...(selectedDate ? { selectedDate } : {}),
    previewDays: 30,
  });

  const monthDate = useMemo(() => parseISO(`${month}-01`), [month]);

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
    isLoading: view === undefined,
    month: view?.month ?? month,
    monthLabel: view?.monthLabel ?? format(monthDate, "MMMM yyyy"),
    selectedDate: view?.selectedDate ?? selectedDate,
    days: view?.days ?? [],
    agenda: view?.agenda ?? [],
    milestones: view?.milestones ?? [],
    selectDate,
    goToPreviousMonth: () => {
      setMonthAndSelection(format(addMonths(monthDate, -1), "yyyy-MM"));
    },
    goToNextMonth: () => {
      setMonthAndSelection(format(addMonths(monthDate, 1), "yyyy-MM"));
    },
    goToToday: () => {
      const today = todayString();
      setSelectedDate(today);
      setMonth(today.slice(0, 7));
    },
    refetch: async () => {
      await convex.query(getCalendarViewQuery, {
        month,
        ...(selectedDate ? { selectedDate } : {}),
        previewDays: 30,
      });
    },
  };
}
