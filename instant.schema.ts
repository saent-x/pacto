import { i } from '@instantdb/react-native';

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      displayName: i.string().optional(),
      avatarUrl: i.string().optional(),
      birthday: i.string().optional(),
      createdAt: i.number().optional(),
    }),
    spaces: i.entity({
      kind: i.string(),                                     // 'solo' | 'couple' | 'pair' | 'crew'
      enabledFeatures: i.json().optional(),
      name: i.string().optional(),
      anniversary: i.string().optional(),
      inviteCode: i.string().optional().unique().indexed(),
      createdAt: i.number(),
      updatedAt: i.number(),
      plan: i.string().optional(),
    }),
    memberships: i.entity({
      role: i.string(),                                     // 'owner' | 'partner'
      joinedAt: i.number(),
      lastNotificationsReadAt: i.number().optional(),
      notifyOnPost: i.boolean().optional(),
      notifyOnReply: i.boolean().optional(),
      notifyOnReaction: i.boolean().optional(),
      notifyOnRepost: i.boolean().optional(),
    }),
    profiles: i.entity({
      displayName: i.string().optional(),
      avatarUrl: i.string().optional(),
      bio: i.string().optional(),
      birthday: i.string().optional(),
      streakDays: i.number().optional(),
      totalEntries: i.number().optional(),
      totalMilestones: i.number().optional(),
      createdAt: i.number(),
      updatedAt: i.number().optional(),
    }),
    events: i.entity({
      title: i.string(),
      description: i.string().optional(),
      startsAt: i.number().indexed(),
      endsAt: i.number().optional(),
      priority: i.number().optional(),
      isPrivate: i.boolean().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    plans: i.entity({
      title: i.string(),
      description: i.string().optional(),
      notes: i.string().optional(),
      category: i.string().optional(),
      targetDate: i.string().optional(),
      budget: i.number().optional(),
      status: i.string().optional(),                        // 'active' | 'done' | 'cancelled' | ...
      priority: i.number().optional(),
      isPrivate: i.boolean().optional(),
      icon: i.string().optional(),
      color: i.string().optional(),
      bucket: i.string().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    rituals: i.entity({
      title: i.string(),
      description: i.string().optional(),
      cadence: i.string().optional(),
      dueDate: i.string().optional(),
      nextOccurrenceAt: i.number().optional(),
      priority: i.number().optional(),
      isActive: i.boolean().optional(),
      isPrivate: i.boolean().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    checkIns: i.entity({
      mood: i.string().optional(),
      note: i.string().optional(),
      energy: i.number().optional(),
      isPrivate: i.boolean().optional(),
      checkInDate: i.string().indexed(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    reminders: i.entity({
      title: i.string(),
      description: i.string().optional(),
      dueAt: i.number().indexed(),
      recurrence: i.string().optional(),
      isCompleted: i.boolean().optional(),
      completedAt: i.number().optional(),
      priority: i.number().optional(),
      category: i.string().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    tasks: i.entity({
      title: i.string(),
      notes: i.string().optional(),
      category: i.string().optional(),                      // free-form grouping key; taskList link below is the redesign's first-class grouping
      isCompleted: i.boolean().optional(),
      completedAt: i.number().optional(),
      dueDate: i.string().optional(),
      priority: i.number().optional(),
      sortOrder: i.number().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    taskLists: i.entity({
      name: i.string(),
      icon: i.string().optional(),
      colorKey: i.string().optional(),
      category: i.string().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    milestones: i.entity({
      title: i.string(),
      description: i.string().optional(),
      date: i.string().indexed(),
      icon: i.string().optional(),
      color: i.string().optional(),
      repeatYearly: i.boolean().optional(),
      quote: i.string().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    journalEntries: i.entity({
      title: i.string().optional(),
      body: i.string(),
      mood: i.string().optional(),
      isPrivate: i.boolean().optional(),
      mediaUrls: i.json().optional(),
      tags: i.json().optional(),
      entryDate: i.string().indexed(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    loveNotes: i.entity({
      body: i.string(),
      isPrivate: i.boolean().optional(),
      vibe: i.string().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    dailyVerseCache: i.entity({
      dateKey: i.string().unique().indexed(),
      text: i.string(),
      reference: i.string(),
      translation: i.string().optional(),
      source: i.string().optional(),
      createdAt: i.number(),
    }),
    expenses: i.entity({
      title: i.string(),
      amount: i.number(),
      currency: i.string().optional(),
      splitType: i.string().optional(),
      splitAmount: i.number().optional(),
      category: i.string().optional(),
      date: i.string().indexed(),
      isSettled: i.boolean().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    wishlists: i.entity({
      name: i.string(),
      icon: i.string().optional(),
      color: i.string().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    wishlistItems: i.entity({
      title: i.string(),
      description: i.string().optional(),
      url: i.string().optional(),
      price: i.number().optional(),
      currency: i.string().optional(),
      tag: i.string().optional(),
      scope: i.string().optional(),
      isPurchased: i.boolean().optional(),
      priority: i.number().optional(),
      sortOrder: i.number().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    timetables: i.entity({
      title: i.string(),
      template: i.string().optional(),                      // 'meals' | 'workout' | 'study' | 'routine' | 'sleep' | 'custom'
      share: i.string().optional(),                         // 'solo' | 'partner' | 'shared'
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    timetableItems: i.entity({
      title: i.string(),
      category: i.string().optional(),
      icon: i.string().optional(),
      color: i.string().optional(),
      ink: i.string().optional(),
      day: i.number().optional(),
      startHour: i.number().optional(),
      duration: i.number().optional(),
      who: i.string().optional(),                           // 'me' | 'sofia' | 'both'
      repeat: i.string().optional(),                        // 'weekly' | 'once'
      star: i.boolean().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    ringsHistory: i.entity({
      dateKey: i.string().indexed(),
      connectValue: i.number().optional(),
      sharedValue: i.number().optional(),
      presentValue: i.number().optional(),
      note: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
    devices: i.entity({
      expoPushToken: i.string().unique().indexed(),
      platform: i.string(),                                 // 'ios' | 'android'
      appVersion: i.string().optional(),
      lastSeenAt: i.number().indexed(),
      createdAt: i.number(),
    }),
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    memories: i.entity({
      body: i.string(),
      kind: i.string(),
      isPrivate: i.boolean().optional(),
      isPinned: i.boolean().optional(),
      notifyMembers: i.boolean().optional(),
      reactionCount: i.number().optional(),
      replyCount: i.number().optional(),
      repostCount: i.number().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
    }),
    memoryReactions: i.entity({
      emoji: i.string(),
      createdAt: i.number().indexed(),
    }),
    memoryAttachments: i.entity({
      type: i.string(),
      refId: i.string().optional(),
      mediaUrl: i.string().optional(),
      mediaPath: i.string().optional(),
      mediaWidth: i.number().optional(),
      mediaHeight: i.number().optional(),
      mediaSize: i.number().optional(),
      sortOrder: i.number().optional(),
      createdAt: i.number().indexed(),
    }),
    memoryPolls: i.entity({
      question: i.string().optional(),
      closesAt: i.number().optional(),
      createdAt: i.number().indexed(),
    }),
    memoryPollOptions: i.entity({
      label: i.string(),
      voteCount: i.number().optional(),
      sortOrder: i.number().optional(),
      createdAt: i.number().indexed(),
    }),
    memoryPollVotes: i.entity({
      createdAt: i.number().indexed(),
    }),
    mediaQuotaUsage: i.entity({
      bytesUsed: i.number(),
      updatedAt: i.number().indexed(),
    }),
    aiUsage: i.entity({
      monthKey: i.string().indexed(),
      turns: i.number(),
      updatedAt: i.number().indexed(),
    }),
  },
  links: {
    // --- existing core ---
    spaceCreator: {
      forward: { on: 'spaces', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdSpaces' },
    },
    membershipUser: {
      forward: { on: 'memberships', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'memberships' },
    },
    membershipSpace: {
      forward: { on: 'memberships', has: 'one', label: 'space', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'memberships' },
    },
    eventCouple: {
      forward: { on: 'events', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'events' },
    },
    eventCreator: {
      forward: { on: 'events', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdEvents' },
    },

    // --- profile ---
    profileUser: {
      forward: { on: 'profiles', has: 'one', label: 'user', onDelete: 'cascade' },
      reverse: { on: '$users', has: 'one', label: 'profile' },
    },

    // --- plans ---
    planCouple: {
      forward: { on: 'plans', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'plans' },
    },
    planCreator: {
      forward: { on: 'plans', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdPlans' },
    },

    // --- rituals ---
    ritualCouple: {
      forward: { on: 'rituals', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'rituals' },
    },
    ritualCreator: {
      forward: { on: 'rituals', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdRituals' },
    },

    // --- checkIns ---
    checkInCouple: {
      forward: { on: 'checkIns', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'checkIns' },
    },
    checkInAuthor: {
      forward: { on: 'checkIns', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'checkIns' },
    },

    // --- reminders ---
    reminderCouple: {
      forward: { on: 'reminders', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'reminders' },
    },
    reminderCreator: {
      forward: { on: 'reminders', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdReminders' },
    },
    reminderAssignee: {
      forward: { on: 'reminders', has: 'one', label: 'assignedTo' },
      reverse: { on: '$users', has: 'many', label: 'assignedReminders' },
    },
    reminderCompleter: {
      forward: { on: 'reminders', has: 'one', label: 'completedBy' },
      reverse: { on: '$users', has: 'many', label: 'completedReminders' },
    },

    // --- tasks ---
    taskCouple: {
      forward: { on: 'tasks', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'tasks' },
    },
    taskCreator: {
      forward: { on: 'tasks', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdTasks' },
    },
    taskAssignee: {
      forward: { on: 'tasks', has: 'one', label: 'assignedTo' },
      reverse: { on: '$users', has: 'many', label: 'assignedTasks' },
    },
    taskCompleter: {
      forward: { on: 'tasks', has: 'one', label: 'completedBy' },
      reverse: { on: '$users', has: 'many', label: 'completedTasks' },
    },
    taskList: {
      forward: { on: 'tasks', has: 'one', label: 'list' },
      reverse: { on: 'taskLists', has: 'many', label: 'tasks' },
    },

    // --- taskLists ---
    taskListCouple: {
      forward: { on: 'taskLists', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'taskLists' },
    },
    taskListCreator: {
      forward: { on: 'taskLists', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdTaskLists' },
    },

    // --- milestones ---
    milestoneCouple: {
      forward: { on: 'milestones', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'milestones' },
    },
    milestoneCreator: {
      forward: { on: 'milestones', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdMilestones' },
    },

    // --- journalEntries ---
    journalCouple: {
      forward: { on: 'journalEntries', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'journalEntries' },
    },
    journalAuthor: {
      forward: { on: 'journalEntries', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'journalEntries' },
    },

    // --- loveNotes ---
    loveNoteCouple: {
      forward: { on: 'loveNotes', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'loveNotes' },
    },
    loveNoteAuthor: {
      forward: { on: 'loveNotes', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'loveNotes' },
    },

    // --- expenses ---
    expenseCouple: {
      forward: { on: 'expenses', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'expenses' },
    },
    expensePayer: {
      forward: { on: 'expenses', has: 'one', label: 'paidBy' },
      reverse: { on: '$users', has: 'many', label: 'paidExpenses' },
    },

    // --- wishlists ---
    wishlistCouple: {
      forward: { on: 'wishlists', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'wishlists' },
    },
    wishlistCreator: {
      forward: { on: 'wishlists', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdWishlists' },
    },

    // --- wishlistItems ---
    wishlistItemWishlist: {
      forward: { on: 'wishlistItems', has: 'one', label: 'wishlist', onDelete: 'cascade' },
      reverse: { on: 'wishlists', has: 'many', label: 'items' },
    },
    wishlistItemCouple: {
      forward: { on: 'wishlistItems', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'wishlistItems' },
    },
    wishlistItemAdder: {
      forward: { on: 'wishlistItems', has: 'one', label: 'addedBy' },
      reverse: { on: '$users', has: 'many', label: 'addedWishlistItems' },
    },
    wishlistItemPurchaser: {
      forward: { on: 'wishlistItems', has: 'one', label: 'purchasedBy' },
      reverse: { on: '$users', has: 'many', label: 'purchasedWishlistItems' },
    },

    // --- timetables ---
    timetableCouple: {
      forward: { on: 'timetables', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'timetables' },
    },
    timetableCreator: {
      forward: { on: 'timetables', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdTimetables' },
    },

    // --- timetableItems ---
    timetableItemTimetable: {
      forward: { on: 'timetableItems', has: 'one', label: 'timetable', onDelete: 'cascade' },
      reverse: { on: 'timetables', has: 'many', label: 'items' },
    },
    timetableItemCouple: {
      forward: { on: 'timetableItems', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'timetableItems' },
    },

    // --- ringsHistory ---
    ringsCouple: {
      forward: { on: 'ringsHistory', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'ringsHistory' },
    },
    ringsMembership: {
      forward: { on: 'ringsHistory', has: 'one', label: 'membership' },
      reverse: { on: 'memberships', has: 'many', label: 'ringsHistory' },
    },

    // --- devices ---
    deviceUser: {
      forward: { on: 'devices', has: 'one', label: 'user', onDelete: 'cascade' },
      reverse: { on: '$users', has: 'many', label: 'devices' },
    },

    // --- memories ---
    memorySpace: {
      forward: { on: 'memories', has: 'one', label: 'space', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'memories' },
    },
    memoryAuthor: {
      forward: { on: 'memories', has: 'one', label: 'author' },
      reverse: { on: '$users', has: 'many', label: 'memories' },
    },
    // Self-link: replies/reposts/quotes survive parent deletion (intentional, not cascaded).
    memoryReplyParent: {
      forward: { on: 'memories', has: 'one', label: 'replyTo' },
      reverse: { on: 'memories', has: 'many', label: 'replies' },
    },
    // Self-link: replies/reposts/quotes survive parent deletion (intentional, not cascaded).
    memoryRepostSource: {
      forward: { on: 'memories', has: 'one', label: 'repostOf' },
      reverse: { on: 'memories', has: 'many', label: 'reposts' },
    },
    // Self-link: replies/reposts/quotes survive parent deletion (intentional, not cascaded).
    memoryQuoteSource: {
      forward: { on: 'memories', has: 'one', label: 'quoteOf' },
      reverse: { on: 'memories', has: 'many', label: 'quotes' },
    },
    reactionMemory: {
      forward: { on: 'memoryReactions', has: 'one', label: 'memory', onDelete: 'cascade' },
      reverse: { on: 'memories', has: 'many', label: 'reactions' },
    },
    reactionUser: {
      forward: { on: 'memoryReactions', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'memoryReactions' },
    },
    attachmentMemory: {
      forward: { on: 'memoryAttachments', has: 'one', label: 'memory', onDelete: 'cascade' },
      reverse: { on: 'memories', has: 'many', label: 'attachments' },
    },
    pollMemory: {
      forward: { on: 'memoryPolls', has: 'one', label: 'memory', onDelete: 'cascade' },
      reverse: { on: 'memories', has: 'one', label: 'poll' },
    },
    pollOptionPoll: {
      forward: { on: 'memoryPollOptions', has: 'one', label: 'poll', onDelete: 'cascade' },
      reverse: { on: 'memoryPolls', has: 'many', label: 'options' },
    },
    pollVoteOption: {
      forward: { on: 'memoryPollVotes', has: 'one', label: 'option', onDelete: 'cascade' },
      reverse: { on: 'memoryPollOptions', has: 'many', label: 'votes' },
    },
    pollVoteUser: {
      forward: { on: 'memoryPollVotes', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'memoryPollVotes' },
    },
    quotaSpace: {
      forward: { on: 'mediaQuotaUsage', has: 'one', label: 'space', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'one', label: 'mediaQuota' },
    },
    aiUsageSpace: {
      forward: { on: 'aiUsage', has: 'one', label: 'space', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'aiUsage' },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
