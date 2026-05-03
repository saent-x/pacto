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
  devices: {
    // Owner can do anything to their own row. Space-mates can read so the
    // sender can fetch partner tokens for client-to-client push.
    allow: {
      view:
        "auth.id == data.ref('user.id')[0] || auth.id in data.ref('user.memberships.space.memberships.user.id')",
      create: "auth.id == data.ref('user.id')[0]",
      update: "auth.id == data.ref('user.id')[0]",
      delete: "auth.id == data.ref('user.id')[0]",
    },
  },
  dailyVerseCache: {
    // Global per-day cache populated by the server; clients read-only.
    allow: {
      view: "auth.id != null",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  $files: {
    // Avatars under `avatars/{userId}/*` — owner writes, any signed-in user reads.
    // Memory media under `spaces/{spaceId}/memories/*` — any authenticated user in the
    // space may write. TODO: tighten to strict membership check once InstantDB CEL
    // supports `data.path.split('/')[1] in data.ref('$user.memberships.space.id')`.
    allow: {
      view: "auth.id != null && (data.path.startsWith('avatars/') || data.path.startsWith('spaces/'))",
      create:
        "data.path.startsWith('avatars/' + auth.id + '/')" +
        " || (data.path.startsWith('spaces/') && auth.id != null)",
      update:
        "data.path.startsWith('avatars/' + auth.id + '/')" +
        " || (data.path.startsWith('spaces/') && auth.id != null)",
      delete:
        "data.path.startsWith('avatars/' + auth.id + '/')" +
        " || (data.path.startsWith('spaces/') && auth.id != null)",
    },
  },
  memories: {
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id')",
      create:
        "auth.id in data.ref('space.memberships.user.id')" +
        " && (newData.isPrivate != true || data.ref('space.kind')[0] in ['pair','couple','crew'])" +
        " && (newData.isPrivate != true || newData.notifyMembers == false)" +
        " && (newData.kind in ['post','reply','quote'] || data.ref('space.kind')[0] in ['pair','couple','crew'])",
      update:
        "auth.id == data.ref('author.id')[0]" +
        " && newData.kind == data.kind" +
        " && newData.isPrivate == data.isPrivate",
      delete:
        "auth.id == data.ref('author.id')[0]" +
        " || auth.id in data.ref('space.memberships[role==\"owner\"].user.id')",
    },
  },
  memoryReactions: {
    allow: {
      view: "auth.id in data.ref('memory.space.memberships.user.id')",
      create:
        "auth.id in data.ref('memory.space.memberships.user.id')" +
        " && data.ref('memory.space.kind')[0] in ['pair','couple','crew']" +
        " && auth.id == newData.user",
      update: "false",
      delete: "auth.id == data.ref('user.id')[0]",
    },
  },
  memoryAttachments: {
    allow: {
      view: "auth.id in data.ref('memory.space.memberships.user.id')",
      create:
        "auth.id == data.ref('memory.author.id')[0]" +
        // Quota check: server-resolves cap from space.plan ('pro' → 10GB else 500MB).
        " && data.ref('memory.space.mediaQuota.bytesUsed')[0] + newData.mediaSize" +
        "    <= (data.ref('memory.space.plan')[0] == 'pro' ? 10737418240 : 524288000)",
      update: "false",
      delete:
        "auth.id == data.ref('memory.author.id')[0]" +
        " || auth.id in data.ref('memory.space.memberships[role==\"owner\"].user.id')",
    },
  },
  memoryPolls: {
    allow: {
      view: "auth.id in data.ref('memory.space.memberships.user.id')",
      create:
        "auth.id in data.ref('memory.space.memberships.user.id')" +
        " && data.ref('memory.space.kind')[0] == 'crew'",
      update: "false",
      delete:
        "auth.id == data.ref('memory.author.id')[0]" +
        " || auth.id in data.ref('memory.space.memberships[role==\"owner\"].user.id')",
    },
  },
  memoryPollOptions: {
    allow: {
      view: "auth.id in data.ref('poll.memory.space.memberships.user.id')",
      create:
        "auth.id in data.ref('poll.memory.space.memberships.user.id')" +
        " && data.ref('poll.memory.space.kind')[0] == 'crew'",
      update: "false",
      delete:
        "auth.id == data.ref('poll.memory.author.id')[0]" +
        " || auth.id in data.ref('poll.memory.space.memberships[role==\"owner\"].user.id')",
    },
  },
  memoryPollVotes: {
    allow: {
      view: "auth.id in data.ref('option.poll.memory.space.memberships.user.id')",
      create:
        "auth.id in data.ref('option.poll.memory.space.memberships.user.id')" +
        " && auth.id == newData.user" +
        " && auth.id not in data.ref('option.poll.options.votes.user.id')",
      update: "false",
      delete: "auth.id == data.ref('user.id')[0]",
    },
  },
  mediaQuotaUsage: {
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  aiUsage: {
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
