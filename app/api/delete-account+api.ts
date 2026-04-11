import { init } from '@instantdb/admin';
import schema from '../../instant.schema';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN!,
  schema,
});

export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let user;
  try {
    user = await db.auth.verifyToken(token);
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = user.id;

  // Find user's memberships and couples
  const { memberships } = await (db as any).query({
    memberships: {
      $: { where: { 'user.id': userId } },
      couple: {},
    },
  });

  const coupleIds = (memberships as any[])
    .map((m: any) => m.couple?.[0]?.id ?? m.couple?.id)
    .filter(Boolean) as string[];

  // Collect all delete operations
  const txns: any[] = [];

  // Delete user-authored content across all their couples
  for (const coupleId of coupleIds) {
    const data = await (db as any).query({
      checkIns: { $: { where: { 'couple.id': coupleId, 'author.id': userId } } },
      journalEntries: { $: { where: { 'couple.id': coupleId, 'author.id': userId } } },
      loveNotes: { $: { where: { 'couple.id': coupleId, 'author.id': userId } } },
      events: { $: { where: { 'couple.id': coupleId, 'createdBy.id': userId } } },
      plans: { $: { where: { 'couple.id': coupleId, 'createdBy.id': userId } } },
      rituals: { $: { where: { 'couple.id': coupleId, 'createdBy.id': userId } } },
      reminders: { $: { where: { 'couple.id': coupleId, 'createdBy.id': userId } } },
      tasks: { $: { where: { 'couple.id': coupleId, 'createdBy.id': userId } } },
      wishlists: { $: { where: { 'couple.id': coupleId, 'createdBy.id': userId } } },
      expenses: { $: { where: { 'couple.id': coupleId, 'paidBy.id': userId } } },
      milestones: { $: { where: { 'couple.id': coupleId, 'createdBy.id': userId } } },
    });

    for (const entry of data.checkIns ?? []) txns.push(db.tx.checkIns[entry.id].delete());
    for (const entry of data.journalEntries ?? []) txns.push(db.tx.journalEntries[entry.id].delete());
    for (const entry of data.loveNotes ?? []) txns.push(db.tx.loveNotes[entry.id].delete());
    for (const entry of data.events ?? []) txns.push(db.tx.events[entry.id].delete());
    for (const entry of data.plans ?? []) txns.push(db.tx.plans[entry.id].delete());
    for (const entry of data.rituals ?? []) txns.push(db.tx.rituals[entry.id].delete());
    for (const entry of data.reminders ?? []) txns.push(db.tx.reminders[entry.id].delete());
    for (const entry of data.tasks ?? []) txns.push(db.tx.tasks[entry.id].delete());
    // Wishlists cascade-delete their items via schema onDelete: 'cascade'
    for (const entry of data.wishlists ?? []) txns.push(db.tx.wishlists[entry.id].delete());
    for (const entry of data.expenses ?? []) txns.push(db.tx.expenses[entry.id].delete());
    for (const entry of data.milestones ?? []) txns.push(db.tx.milestones[entry.id].delete());
  }

  // Delete memberships
  for (const m of memberships as any[]) {
    txns.push(db.tx.memberships[m.id].delete());
  }

  // Execute all deletes atomically
  if (txns.length > 0) {
    await db.transact(txns);
  }

  // Delete the auth user record
  await db.auth.deleteUser({ id: userId });

  return Response.json({ success: true });
}
