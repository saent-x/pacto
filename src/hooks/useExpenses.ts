import { useCallback, useMemo } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';

type ExpenseInput = {
  title: string;
  amount: number;
  paidBy?: string;
  currency?: string;
  splitType?: string;
  splitAmount?: number | null;
  category?: string;
  date?: string;
};

export function useExpenses() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { expenses: { $: { where: { 'couple.id': coupleId } } } }
      : null,
  );

  const expenses = useMemo(() => data?.expenses ?? [], [data?.expenses]);
  const unsettled = useMemo(
    () => expenses.filter((e) => !e.isSettled),
    [expenses],
  );
  const settled = useMemo(
    () => expenses.filter((e) => e.isSettled),
    [expenses],
  );

  const create = useCallback(
    async (input: ExpenseInput) => {
      if (!coupleId || !userId) return;
      const expenseId = id();
      const paidById = input.paidBy ?? userId;
      await db.transact(
        db.tx.expenses[expenseId]
          .update({
            title: input.title,
            amount: input.amount,
            currency: input.currency ?? 'USD',
            splitType: input.splitType ?? 'even',
            splitAmount: input.splitAmount ?? undefined,
            category: input.category ?? 'general',
            date: input.date ?? new Date().toISOString().slice(0, 10),
            isSettled: false,
            createdAt: Date.now(),
          })
          .link({ couple: coupleId, paidBy: paidById }),
      );
    },
    [coupleId, userId],
  );

  const update = useCallback(
    async (expenseId: string, input: Partial<ExpenseInput>) => {
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.amount !== undefined) updates.amount = input.amount;
      if (input.currency !== undefined) updates.currency = input.currency;
      if (input.splitType !== undefined) updates.splitType = input.splitType;
      if (input.splitAmount !== undefined) updates.splitAmount = input.splitAmount ?? undefined;
      if (input.category !== undefined) updates.category = input.category;
      if (input.date !== undefined) updates.date = input.date;
      const txns: any[] = [db.tx.expenses[expenseId].update(updates)];
      if (input.paidBy !== undefined) {
        txns.push(db.tx.expenses[expenseId].link({ paidBy: input.paidBy }));
      }
      await db.transact(txns);
    },
    [],
  );

  const settle = useCallback(async (expenseId: string) => {
    await db.transact(db.tx.expenses[expenseId].update({ isSettled: true }));
  }, []);

  const remove = useCallback(async (expenseId: string) => {
    await db.transact(db.tx.expenses[expenseId].delete());
  }, []);

  return {
    expenses,
    unsettled,
    settled,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    settle,
    refetch: async () => {},
  };
}
