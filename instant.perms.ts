import type { InstantRules } from '@instantdb/react-native';

const isMemberBind = {
  isMember:
    "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true",
};

const coupleScoped = {
  allow: {
    view: 'isMember',
    create: 'isMember',
    update: 'isMember',
    delete: 'isMember',
  },
  bind: isMemberBind,
};

const rules = {
  attrs: { allow: { $default: 'false' } },

  couples: {
    allow: {
      view: 'isMember',
      create: 'auth.id != null',
      update: 'isMember',
      delete: 'false',
    },
    bind: {
      isMember:
        "auth.ref('$user.memberships.couple.id').includes(data.id) == true",
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
        "auth.ref('$user.memberships.couple.id').includes(data.ref('couple.id')) == true",
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
