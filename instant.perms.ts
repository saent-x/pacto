import type { InstantRules } from '@instantdb/react-native';

// Shared rule shape: only couple-members of the entity's linked space
// can read / write. Each entity below has a direct `couple` link to a
// space, so the traversal is always `couple.memberships.user.id`.
const coupleMemberOnly = {
  view: "auth.id in data.ref('couple.memberships.user.id')",
  create: "auth.id in data.ref('couple.memberships.user.id')",
  update: "auth.id in data.ref('couple.memberships.user.id')",
  delete: "auth.id in data.ref('couple.memberships.user.id')",
};

const rules = {
  $users: {
    allow: {
      view: "auth.id == data.id",
      update: "auth.id == data.id",
      create: "auth.id == data.id",
      delete: "false",
    },
  },
  spaces: {
    allow: {
      view: "auth.id in data.ref('memberships.user.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('memberships.user.id')",
      delete: "auth.id in data.ref('memberships.user.id')",
    },
  },
  memberships: {
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id')",
      create: "auth.id != null",
      update: "false",
      delete: "auth.id == data.ref('user.id')[0]",
    },
  },
  profiles: {
    allow: {
      view: "auth.id == data.ref('user.id')[0]",
      create: "auth.id == data.ref('user.id')[0]",
      update: "auth.id == data.ref('user.id')[0]",
      delete: "auth.id == data.ref('user.id')[0]",
    },
  },
  events: { allow: coupleMemberOnly },
  plans: { allow: coupleMemberOnly },
  rituals: { allow: coupleMemberOnly },
  checkIns: { allow: coupleMemberOnly },
  reminders: { allow: coupleMemberOnly },
  tasks: { allow: coupleMemberOnly },
  taskLists: { allow: coupleMemberOnly },
  milestones: { allow: coupleMemberOnly },
  journalEntries: { allow: coupleMemberOnly },
  loveNotes: { allow: coupleMemberOnly },
  expenses: { allow: coupleMemberOnly },
  wishlists: { allow: coupleMemberOnly },
  wishlistItems: { allow: coupleMemberOnly },
  timetables: { allow: coupleMemberOnly },
  timetableItems: { allow: coupleMemberOnly },
  ringsHistory: { allow: coupleMemberOnly },
  dailyVerseCache: {
    // Global per-day cache populated by the server; clients read-only.
    allow: {
      view: "auth.id != null",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
