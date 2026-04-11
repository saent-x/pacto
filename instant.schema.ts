import { i } from '@instantdb/react-native';

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      displayName: i.string(),
      avatarUrl: i.string().optional(),
      preferences: i.json().optional(),
    }),
    couples: i.entity({
      name: i.string(),
      inviteCode: i.string().optional().unique(),
      anniversary: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    memberships: i.entity({
      role: i.string(),
      status: i.string(),
      joinedAt: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    events: i.entity({
      title: i.string(),
      description: i.string().optional(),
      startsAt: i.number(),
      endsAt: i.number().optional(),
      category: i.string().optional(),
      location: i.string().optional(),
      priority: i.number(),
      isPrivate: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    plans: i.entity({
      title: i.string(),
      description: i.string().optional(),
      category: i.string().optional(),
      targetDate: i.string().optional(),
      budget: i.number().optional(),
      status: i.string(),
      notes: i.string().optional(),
      coverImageUrl: i.string().optional(),
      priority: i.number(),
      isPrivate: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    rituals: i.entity({
      title: i.string(),
      description: i.string().optional(),
      cadence: i.string(),
      dueDate: i.string().optional(),
      nextOccurrenceAt: i.number().optional(),
      lastCompletedAt: i.number().optional(),
      streak: i.number(),
      priority: i.number(),
      isPrivate: i.boolean(),
      isActive: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    checkIns: i.entity({
      mood: i.string().optional(),
      note: i.string().optional(),
      checkInDate: i.string(),
      isPrivate: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    reminders: i.entity({
      title: i.string(),
      description: i.string().optional(),
      dueAt: i.number().indexed(),
      recurrence: i.string().optional(),
      isCompleted: i.boolean(),
      completedAt: i.number().optional(),
      priority: i.number(),
      category: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    tasks: i.entity({
      title: i.string(),
      notes: i.string().optional(),
      category: i.string().optional(),
      isCompleted: i.boolean(),
      completedAt: i.number().optional(),
      dueDate: i.string().optional(),
      priority: i.number(),
      sortOrder: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    journalEntries: i.entity({
      title: i.string().optional(),
      body: i.string(),
      mood: i.string().optional(),
      isPrivate: i.boolean(),
      tags: i.json(),
      mediaUrls: i.json().optional(),
      entryDate: i.string(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    loveNotes: i.entity({
      body: i.string(),
      isPrivate: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    wishlists: i.entity({
      name: i.string(),
      createdAt: i.number(),
    }),
    wishlistItems: i.entity({
      title: i.string(),
      description: i.string().optional(),
      url: i.string().optional(),
      price: i.number().optional(),
      isPurchased: i.boolean(),
      priority: i.number(),
      sortOrder: i.number(),
      createdAt: i.number(),
    }),
    expenses: i.entity({
      title: i.string(),
      amount: i.number(),
      currency: i.string().optional(),
      splitType: i.string(),
      splitAmount: i.number().optional(),
      category: i.string(),
      date: i.string(),
      isSettled: i.boolean(),
      createdAt: i.number(),
    }),
    milestones: i.entity({
      title: i.string(),
      description: i.string().optional(),
      date: i.string(),
      icon: i.string(),
      createdAt: i.number(),
    }),
    dailyVerseCache: i.entity({
      dateKey: i.string().unique().indexed(),
      text: i.string(),
      reference: i.string(),
      translation: i.string(),
      source: i.string(),
      fetchedAt: i.number(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
  },
  links: {
    coupleCreator: {
      forward: { on: 'couples', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdCouples' },
    },
    membershipUser: {
      forward: { on: 'memberships', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'memberships' },
    },
    membershipCouple: {
      forward: { on: 'memberships', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'memberships' },
    },
    eventCouple: {
      forward: { on: 'events', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'events' },
    },
    eventCreator: {
      forward: { on: 'events', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdEvents' },
    },
    planCouple: {
      forward: { on: 'plans', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'plans' },
    },
    planCreator: {
      forward: { on: 'plans', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdPlans' },
    },
    ritualCouple: {
      forward: { on: 'rituals', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'rituals' },
    },
    ritualCreator: {
      forward: { on: 'rituals', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdRituals' },
    },
    checkInCouple: {
      forward: { on: 'checkIns', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'checkIns' },
    },
    checkInAuthor: {
      forward: { on: 'checkIns', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'checkIns' },
    },
    reminderCouple: {
      forward: { on: 'reminders', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'reminders' },
    },
    reminderCreator: {
      forward: { on: 'reminders', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdReminders' },
    },
    reminderAssignee: {
      forward: { on: 'reminders', has: 'one', label: 'assignedTo' },
      reverse: { on: '$users', has: 'many', label: 'assignedReminders' },
    },
    reminderCompletedBy: {
      forward: { on: 'reminders', has: 'one', label: 'completedBy' },
      reverse: { on: '$users', has: 'many', label: 'completedReminders' },
    },
    taskCouple: {
      forward: { on: 'tasks', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'tasks' },
    },
    taskCreator: {
      forward: { on: 'tasks', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdTasks' },
    },
    taskAssignee: {
      forward: { on: 'tasks', has: 'one', label: 'assignedTo' },
      reverse: { on: '$users', has: 'many', label: 'assignedTasks' },
    },
    taskCompletedBy: {
      forward: { on: 'tasks', has: 'one', label: 'completedBy' },
      reverse: { on: '$users', has: 'many', label: 'completedTasks' },
    },
    journalCouple: {
      forward: { on: 'journalEntries', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'journalEntries' },
    },
    journalAuthor: {
      forward: { on: 'journalEntries', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'journalEntries' },
    },
loveNoteCouple: {
      forward: { on: 'loveNotes', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'loveNotes' },
    },
    loveNoteAuthor: {
      forward: { on: 'loveNotes', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'loveNotes' },
    },
    wishlistCouple: {
      forward: { on: 'wishlists', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'wishlists' },
    },
    wishlistCreator: {
      forward: { on: 'wishlists', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdWishlists' },
    },
    wishlistItemWishlist: {
      forward: { on: 'wishlistItems', has: 'one', label: 'wishlist' },
      reverse: { on: 'wishlists', has: 'many', label: 'items', onDelete: 'cascade' },
    },
    wishlistItemCouple: {
      forward: { on: 'wishlistItems', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'wishlistItems' },
    },
    wishlistItemAddedBy: {
      forward: { on: 'wishlistItems', has: 'one', label: 'addedBy' },
      reverse: { on: '$users', has: 'many', label: 'addedWishlistItems' },
    },
    wishlistItemPurchasedBy: {
      forward: { on: 'wishlistItems', has: 'one', label: 'purchasedBy' },
      reverse: { on: '$users', has: 'many', label: 'purchasedWishlistItems' },
    },
    expenseCouple: {
      forward: { on: 'expenses', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'expenses' },
    },
    expensePaidBy: {
      forward: { on: 'expenses', has: 'one', label: 'paidBy' },
      reverse: { on: '$users', has: 'many', label: 'paidExpenses' },
    },
    milestoneCouple: {
      forward: { on: 'milestones', has: 'one', label: 'couple' },
      reverse: { on: 'couples', has: 'many', label: 'milestones' },
    },
    milestoneCreator: {
      forward: { on: 'milestones', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdMilestones' },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
