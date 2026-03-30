import { useConvex, useMutation } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { authClient } from '@/src/lib/auth-client';

const createCoupleMutation = makeFunctionReference<
  'mutation',
  { name: string; anniversary?: string | null },
  {
    inviteCode: string;
  }
>('couples:createCouple');

const joinCoupleByInviteCodeMutation = makeFunctionReference<
  'mutation',
  { inviteCode: string },
  unknown
>('couples:joinCoupleByInviteCode');

function toErrorMessage(
  error: {
    message?: string;
  } | null,
  fallback: string,
) {
  return error?.message ?? fallback;
}

export function useAuthActions() {
  const convex = useConvex();
  const createCouple = useMutation(createCoupleMutation);
  const joinCoupleByInviteCode = useMutation(joinCoupleByInviteCodeMutation);

  return {
    signIn: async (input: { email: string; password: string }) => {
      const { error } = await authClient.signIn.email({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });

      if (error) {
        throw new Error(toErrorMessage(error, 'Unable to sign in.'));
      }
    },
    signUp: async (input: { name: string; email: string; password: string }) => {
      const { error } = await authClient.signUp.email({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });

      if (error) {
        throw new Error(toErrorMessage(error, 'Unable to create your account.'));
      }
    },
    signOut: async () => {
      const { error } = await authClient.signOut();

      if (error) {
        throw new Error(toErrorMessage(error, 'Unable to sign out.'));
      }

      convex.clearAuth();
    },
    createCouple: async (input: { name: string; anniversary?: string | null }) =>
      createCouple({
        name: input.name,
        ...(input.anniversary !== undefined
          ? { anniversary: input.anniversary }
          : {}),
      }),
    joinCoupleByInviteCode: async (inviteCode: string) =>
      joinCoupleByInviteCode({
        inviteCode,
      }),
  };
}
