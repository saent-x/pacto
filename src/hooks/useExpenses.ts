import { useCallback, useMemo } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { useSession } from './useSession';

type ExpenseDoc = {
  _id: string;
  coupleId: string;
  title: string;
  amount: number;
  paidBy: string;
  currency: string;
  splitType: string;
  splitAmount: number | null;
  category: string;
  date: string;
  isSettled: boolean;
  createdAt: number;
};

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

const listExpensesQuery = makeFunctionReference<'query', {}, ExpenseDoc[]>(
  'expenses:listExpenses',
);
const createExpenseMutation = makeFunctionReference<
  'mutation',
  {
    title: string;
    amount: number;
    paidBy?: string;
    currency?: string;
    splitType?: string;
    splitAmount?: number | null;
    category?: string;
    date?: string;
  },
  ExpenseDoc
>('expenses:createExpense');
const updateExpenseMutation = makeFunctionReference<
  'mutation',
  {
    expenseId: string;
    title?: string;
    amount?: number;
    paidBy?: string;
    currency?: string;
    splitType?: string;
    splitAmount?: number | null;
    category?: string;
    date?: string;
  },
  ExpenseDoc
>('expenses:updateExpense');
const settleExpenseMutation = makeFunctionReference<
  'mutation',
  { expenseId: string },
  ExpenseDoc
>('expenses:settleExpense');
const deleteExpenseMutation = makeFunctionReference<
  'mutation',
  { expenseId: string },
  null
>('expenses:deleteExpense');

export function useExpenses() {
  const { activeCouple } = useSession();
  const convex = useConvex();
  const rows = useQuery(listExpensesQuery, activeCouple ? {} : 'skip');
  const createExpense = useMutation(createExpenseMutation);
  const updateExpenseFn = useMutation(updateExpenseMutation);
  const settleExpenseFn = useMutation(settleExpenseMutation);
  const deleteExpense = useMutation(deleteExpenseMutation);

  const expenses = useMemo(() => rows ?? [], [rows]);
  const unsettled = useMemo(
    () => expenses.filter((e) => !e.isSettled),
    [expenses],
  );
  const settled = useMemo(
    () => expenses.filter((e) => e.isSettled),
    [expenses],
  );

  const create = useCallback(
    async (data: ExpenseInput) => {
      await createExpense({
        title: data.title,
        amount: data.amount,
        paidBy: data.paidBy,
        currency: data.currency,
        splitType: data.splitType,
        splitAmount: data.splitAmount ?? null,
        category: data.category,
        date: data.date,
      });
    },
    [createExpense],
  );

  const update = useCallback(
    async (id: string, data: Partial<ExpenseInput>) => {
      await updateExpenseFn({
        expenseId: id,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.paidBy !== undefined ? { paidBy: data.paidBy } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.splitType !== undefined ? { splitType: data.splitType } : {}),
        ...(data.splitAmount !== undefined ? { splitAmount: data.splitAmount ?? null } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
      });
    },
    [updateExpenseFn],
  );

  const settle = useCallback(
    async (id: string) => {
      await settleExpenseFn({ expenseId: id });
    },
    [settleExpenseFn],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteExpense({ expenseId: id });
    },
    [deleteExpense],
  );

  return {
    expenses,
    unsettled,
    settled,
    isLoading: !!activeCouple && rows === undefined,
    create,
    update,
    remove,
    settle,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(listExpensesQuery, {});
    },
  };
}
