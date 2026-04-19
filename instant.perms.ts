import type { InstantRules } from '@instantdb/react-native';

const rules = {
  $users: {
    allow: {
      view: "auth.id == data.id || 'co_member' in data.ref('memberships.space.memberships.user.id')",
      update: "auth.id == data.id",
      create: "false",
      delete: "false",
    },
  },
  spaces: {
    allow: {
      view: "auth.id in data.ref('memberships.user.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('memberships.user.id')",
      delete: "auth.id in data.ref('memberships.user.id') && 'owner' in data.ref('memberships.role')",
    },
  },
  memberships: {
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id')",
      create: "auth.id != null && auth.id == newData.ref('user.id')[0]",
      update: "false",
      delete: "auth.id == data.ref('user.id')[0]",
    },
  },
} satisfies InstantRules;

export default rules;
