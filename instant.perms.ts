import type { InstantRules } from '@instantdb/react-native';

// Phase 1 — minimal permissive rules. Tightening can follow in later phases
// once co-member visibility has concrete need.
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
  events: {
    allow: {
      view: "auth.id in data.ref('couple.memberships.user.id')",
      create: "auth.id in data.ref('couple.memberships.user.id')",
      update: "auth.id in data.ref('couple.memberships.user.id')",
      delete: "auth.id in data.ref('couple.memberships.user.id')",
    },
  },
} satisfies InstantRules;

export default rules;
