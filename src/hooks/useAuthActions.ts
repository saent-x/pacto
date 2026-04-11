import { db, id } from '@/src/lib/instant';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useAuthActions() {
  const { user } = db.useAuth();

  return {
    sendMagicCode: async (email: string) => {
      await db.auth.sendMagicCode({ email: email.trim().toLowerCase() });
    },
    signInWithMagicCode: async (input: { email: string; code: string }) => {
      await db.auth.signInWithMagicCode({
        email: input.email.trim().toLowerCase(),
        code: input.code,
      });
    },
    signOut: async () => {
      db.auth.signOut();
    },
    createCouple: async (input: { name: string; anniversary?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      const coupleId = id();
      const membershipId = id();
      const now = Date.now();
      const inviteCode = generateInviteCode();

      await db.transact([
        db.tx.couples[coupleId]
          .update({
            name: input.name,
            inviteCode,
            anniversary: input.anniversary ?? undefined,
            createdAt: now,
            updatedAt: now,
          })
          .link({ createdBy: user.id }),
        db.tx.memberships[membershipId]
          .update({
            role: 'creator',
            status: 'active',
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .link({ user: user.id, couple: coupleId }),
      ]);

      return {
        couple: { id: coupleId, name: input.name },
        membership: { id: membershipId },
        inviteCode,
      };
    },
    joinCoupleByInviteCode: async (inviteCode: string) => {
      if (!user) throw new Error('Not authenticated');

      const { couples } = await db.queryOnce({
        couples: { $: { where: { inviteCode: inviteCode.trim().toUpperCase() } } },
      });

      const couple = couples[0];
      if (!couple) throw new Error('Invalid invite code.');

      const membershipId = id();
      const now = Date.now();

      await db.transact([
        db.tx.memberships[membershipId]
          .update({
            role: 'partner',
            status: 'active',
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .link({ user: user.id, couple: couple.id }),
        db.tx.couples[couple.id].update({
          inviteCode: undefined,
          updatedAt: now,
        }),
      ]);
    },
  };
}
