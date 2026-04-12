import type { InstantRules } from '@instantdb/react-native';

const coupleScoped = {
  allow: {
    view: 'isCoupleMember',
    create: 'isCoupleMember',
    update: 'isCoupleMember',
    delete: 'isCoupleMember',
  },
  bind: {
    isCoupleMember:
      "auth.id in data.ref('couple.memberships.user.id')",
  },
};

const rules = {
  couples: {
    allow: {
      view: 'isMember',
      create: 'auth.id != null',
      update: 'isMember',
      delete: 'false',
    },
    bind: {
      isMember: "auth.id in data.ref('memberships.user.id')",
    },
  },

  memberships: {
    allow: {
      view: 'isSelf || isCouplemate',
      create: 'auth.id != null',
      update: 'isSelf',
      delete: 'false',
    },
    bind: {
      isSelf: "auth.id == data.ref('user.id')",
      isCouplemate:
        "auth.id in data.ref('couple.memberships.user.id')",
    },
  },

  events: coupleScoped,
  plans: coupleScoped,
  rituals: coupleScoped,
  checkIns: coupleScoped,
  reminders: coupleScoped,
  tasks: coupleScoped,
  journalEntries: coupleScoped,
  loveNotes: coupleScoped,
  wishlists: coupleScoped,
  wishlistItems: coupleScoped,
  expenses: coupleScoped,
  milestones: coupleScoped,

  $users: {
    allow: {
      view: 'auth.id != null',
      create: 'auth.id != null',
      update: 'isSelf',
      delete: 'false',
    },
    bind: {
      isSelf: 'auth.id == data.id',
    },
  },

  $files: {
    allow: {
      view: 'auth.id != null',
      create: 'auth.id != null',
      delete: 'auth.id != null',
    },
  },

  dailyVerseCache: {
    allow: {
      view: 'auth.id != null',
      create: 'false',
      update: 'false',
      delete: 'false',
    },
  },
} satisfies InstantRules;

export default rules;
