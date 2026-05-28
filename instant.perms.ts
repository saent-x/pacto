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

const coupleMember = "auth.id in data.ref('couple.memberships.user.id')";
const spaceMember = "auth.id in data.ref('space.memberships.user.id')";
const memorySpaceMember = "auth.id in data.ref('memory.space.memberships.user.id')";
const pollMemorySpaceMember = "auth.id in data.ref('poll.memory.space.memberships.user.id')";
const pollOptionMemorySpaceMember =
  "auth.id in data.ref('option.poll.memory.space.memberships.user.id')";

const linkedUserInCouple = (
  link: 'author' | 'createdBy' | 'addedBy' | 'assignedTo' | 'completedBy',
) => `(data.ref('${link}.id')[0] == null || data.ref('couple.id')[0] in data.ref('${link}.memberships.space.id'))`;

const ownedCreateCoupleMemberOnly = (
  ownerLink: 'author' | 'createdBy' | 'addedBy',
  extraUserLinkGuards: string[] = [],
) => {
  const userLinkGuards = [linkedUserInCouple(ownerLink), ...extraUserLinkGuards].join(' && ');
  return {
    ...coupleMemberOnly,
    create: `${coupleMember} && auth.id == data.ref('${ownerLink}.id')[0] && ${userLinkGuards}`,
    update: `${coupleMember} && ${userLinkGuards}`,
  };
};

const legacyRowsNoCreate = (allow: Record<string, string>) => ({
  ...allow,
  create: 'false',
});

const privateCoupleMemberOnly = (ownerLink: 'author' | 'createdBy') => {
  const isOwner = `auth.id == data.ref('${ownerLink}.id')[0]`;
  const existingPrivateOwner = `(data.isPrivate != true || ${isOwner})`;
  const newPrivateOwner = `(newData.isPrivate != true || ${isOwner})`;
  const soloRowsStayPrivate = "(data.ref('couple.kind')[0] != 'solo' || newData.isPrivate == true)";
  const ownerInCouple = linkedUserInCouple(ownerLink);
  return {
    view: `${coupleMember} && ${existingPrivateOwner}`,
    create: `${coupleMember} && ${isOwner} && ${newPrivateOwner} && ${soloRowsStayPrivate} && ${ownerInCouple}`,
    update: `${coupleMember} && ${existingPrivateOwner} && ${newPrivateOwner} && ${soloRowsStayPrivate} && ${ownerInCouple}`,
    delete: `${coupleMember} && ${existingPrivateOwner}`,
  };
};

const privateOwnerMutationOnly = (ownerLink: 'author' | 'createdBy') => {
  const isOwner = `auth.id == data.ref('${ownerLink}.id')[0]`;
  const existingPrivateOwner = `(data.isPrivate != true || ${isOwner})`;
  const newPrivateOwner = `(newData.isPrivate != true || ${isOwner})`;
  const soloRowsStayPrivate = "(data.ref('couple.kind')[0] != 'solo' || newData.isPrivate == true)";
  const ownerInCouple = linkedUserInCouple(ownerLink);
  return {
    view: `${coupleMember} && ${existingPrivateOwner}`,
    create: `${coupleMember} && ${isOwner} && ${newPrivateOwner} && ${soloRowsStayPrivate} && ${ownerInCouple}`,
    update: `${coupleMember} && ${isOwner} && ${existingPrivateOwner} && ${newPrivateOwner} && ${soloRowsStayPrivate} && ${ownerInCouple}`,
    delete: `${coupleMember} && ${existingPrivateOwner} && ${isOwner}`,
  };
};

const ringsHistoryMembershipOwner = "auth.id == data.ref('membership.user.id')[0]";
const ringsHistoryMembershipSpaceMatches =
  "data.ref('membership.space.id')[0] == data.ref('couple.id')[0]";
const ringsHistoryMemberOnly = {
  view: `${coupleMember} && ${ringsHistoryMembershipSpaceMatches}`,
  create: `${coupleMember} && ${ringsHistoryMembershipOwner} && ${ringsHistoryMembershipSpaceMatches}`,
  update: `${coupleMember} && ${ringsHistoryMembershipOwner} && ${ringsHistoryMembershipSpaceMatches}`,
  delete: `${coupleMember} && ${ringsHistoryMembershipOwner} && ${ringsHistoryMembershipSpaceMatches}`,
};
const taskListSpaceMatches =
  "(data.ref('list.id')[0] == null || data.ref('list.couple.id')[0] == data.ref('couple.id')[0])";
const taskUserLinksMatch = [
  linkedUserInCouple('createdBy'),
  linkedUserInCouple('assignedTo'),
  linkedUserInCouple('completedBy'),
].join(' && ');
const taskMemberOnly = {
  view: `${coupleMember} && ${taskListSpaceMatches}`,
  create:
    `${coupleMember}` +
    " && auth.id == data.ref('createdBy.id')[0]" +
    ` && ${taskListSpaceMatches}` +
    ` && ${taskUserLinksMatch}`,
  update: `${coupleMember} && ${taskListSpaceMatches} && ${taskUserLinksMatch}`,
  delete: `${coupleMember} && ${taskListSpaceMatches}`,
};
const timetableItemSpaceMatches =
  "data.ref('timetable.couple.id')[0] == data.ref('couple.id')[0]";
const timetableItemMemberOnly = {
  view: `${coupleMember} && ${timetableItemSpaceMatches}`,
  create: `${coupleMember} && ${timetableItemSpaceMatches}`,
  update: `${coupleMember} && ${timetableItemSpaceMatches}`,
  delete: `${coupleMember} && ${timetableItemSpaceMatches}`,
};
const soloTimetablesStaySolo = "(data.ref('couple.kind')[0] != 'solo' || newData.share == 'solo')";
const soloTimetableShareOwner = "(newData.share != 'solo' || auth.id == data.ref('createdBy.id')[0])";
const baseTimetableMemberOnly = ownedCreateCoupleMemberOnly('createdBy');
const timetableMemberOnly = {
  ...baseTimetableMemberOnly,
  create: `${baseTimetableMemberOnly.create} && ${soloTimetablesStaySolo} && ${soloTimetableShareOwner}`,
  update: `${baseTimetableMemberOnly.update} && ${soloTimetablesStaySolo} && ${soloTimetableShareOwner}`,
};
const allowedSpaceKind = "newData.kind in ['solo','pair','couple','crew']";
const freeOrUnsetSpacePlan = "(newData.plan == null || newData.plan == 'free')";
const authenticatedSpaceCreator = "auth.id == data.ref('createdBy.id')[0]";
const soloMemoriesStayPrivate = "(data.ref('space.kind')[0] != 'solo' || newData.isPrivate == true)";
const baseSoloSpaceIsSolo =
  "(data.ref('baseSoloSpace.id')[0] == null || data.ref('baseSoloSpace.kind')[0] == 'solo')";
const allowedSpaceKindUpdate =
  "(newData.kind == data.kind || (data.kind in ['pair','couple'] && newData.kind == 'crew'))";
const immutableSpaceFields =
  `${allowedSpaceKindUpdate} && newData.plan == data.plan && newData.createdAt == data.createdAt`;
const mediaQuotaMember = "auth.id in data.ref('space.memberships.user.id')";
const memoryAttachmentImmutableForSpaceRepair = [
  'type',
  'refId',
  'mediaUrl',
  'mediaPath',
  'mediaWidth',
  'mediaHeight',
  'mediaSize',
  'sortOrder',
  'createdAt',
].map((field) => `newData.${field} == data.${field}`).join(' && ');
const privateMemoryAttachmentSpaceRepair =
  memorySpaceMember +
  " && auth.id == data.ref('memory.author.id')[0]" +
  " && data.ref('memory.isPrivate')[0] == true" +
  ` && ${memoryAttachmentImmutableForSpaceRepair}`;

const rules = {
  $users: {
    allow: {
      view: "auth.id == data.id || auth.id in data.ref('memberships.space.memberships.user.id')",
      update: `auth.id == data.id && ${baseSoloSpaceIsSolo}`,
      create: `auth.id == data.id && ${baseSoloSpaceIsSolo}`,
      delete: "false",
    },
  },
  spaces: {
    bind: {
      isMember: "auth.id in data.ref('memberships.user.id')",
      isOnlyMember:
        "auth.id in data.ref('memberships.user.id') && data.ref('memberships.user.id').all(userId, userId == auth.id)",
      // Unique-attribute lookups in links must pass view on the target row.
      // Open invite spaces are therefore viewable to signed-in users, while
      // writes remain member-only.
      // SEC-6: INTENTIONAL. This read exposure is the invite-by-code feature —
      // any signed-in user may resolve a space that has an inviteCode so they
      // can join. It is gated by requiring auth.id != null AND the space having
      // a non-null inviteCode; create/update/delete stay member-only above.
      isOpenInvite: "auth.id != null && data.inviteCode != null",
    },
    allow: {
      view: "isMember || isOpenInvite",
      create: `auth.id != null && ${authenticatedSpaceCreator} && ${allowedSpaceKind} && ${freeOrUnsetSpacePlan}`,
      update: `isMember && ${immutableSpaceFields}`,
      delete: "isOnlyMember",
    },
    fields: {
      inviteCode: "auth.id in data.ref('memberships.user.id')",
      name: "auth.id in data.ref('memberships.user.id')",
      enabledFeatures: "auth.id in data.ref('memberships.user.id')",
    },
  },
  memberships: {
    bind: {
      isSelf: "auth.id == data.ref('user.id')[0]",
      isOpenInviteLookup: "auth.id != null && data.ref('space.inviteCode')[0] != null",
      hasNoExistingSpaceMembership: "!(auth.id in data.ref('space.memberships.user.id'))",
      isCreatingOwnedSpaceMembership:
        "isSelf && hasNoExistingSpaceMembership && auth.id == data.ref('space.createdBy.id')[0] && data.role == 'owner'",
      inviteSpaceAllowsJoin:
        "(data.ref('space.kind')[0] == 'crew' || size(data.ref('space.memberships.user.id')) < 2)",
      isJoiningOpenInvite:
        "isSelf && hasNoExistingSpaceMembership && data.ref('space.inviteCode')[0] != null && data.ref('space.kind')[0] != 'solo' && inviteSpaceAllowsJoin && data.role == 'partner'",
    },
    allow: {
      view: "auth.id in data.ref('space.memberships.user.id') || isOpenInviteLookup",
      create: "auth.id != null && (isCreatingOwnedSpaceMembership || isJoiningOpenInvite)",
      update: "false",
      delete: "auth.id == data.ref('user.id')[0] && data.ref('space.kind')[0] != 'solo'",
    },
    fields: {
      role: "auth.id in data.ref('space.memberships.user.id')",
      joinedAt: "auth.id in data.ref('space.memberships.user.id')",
      lastNotificationsReadAt: "auth.id in data.ref('space.memberships.user.id')",
      notifyOnPost: "auth.id in data.ref('space.memberships.user.id')",
      notifyOnReply: "auth.id in data.ref('space.memberships.user.id')",
      notifyOnReaction: "auth.id in data.ref('space.memberships.user.id')",
      notifyOnRepost: "auth.id in data.ref('space.memberships.user.id')",
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
  events: { allow: privateCoupleMemberOnly('createdBy') },
  plans: { allow: privateCoupleMemberOnly('createdBy') },
  rituals: { allow: privateCoupleMemberOnly('createdBy') },
  checkIns: { allow: privateOwnerMutationOnly('author') },
  reminders: {
    allow: ownedCreateCoupleMemberOnly('createdBy', [
      linkedUserInCouple('assignedTo'),
      linkedUserInCouple('completedBy'),
    ]),
  },
  tasks: { allow: taskMemberOnly },
  taskLists: { allow: ownedCreateCoupleMemberOnly('createdBy') },
  milestones: { allow: legacyRowsNoCreate(ownedCreateCoupleMemberOnly('createdBy')) },
  journalEntries: { allow: privateOwnerMutationOnly('author') },
  loveNotes: { allow: legacyRowsNoCreate(privateCoupleMemberOnly('author')) },
  wishlists: { allow: legacyRowsNoCreate(ownedCreateCoupleMemberOnly('createdBy')) },
  wishlistItems: { allow: legacyRowsNoCreate(ownedCreateCoupleMemberOnly('addedBy')) },
  timetables: { allow: timetableMemberOnly },
  timetableItems: { allow: timetableItemMemberOnly },
  ringsHistory: { allow: ringsHistoryMemberOnly },
  devices: {
    // Owner-only. Production push fan-out uses the authenticated API relay.
    allow: {
      view: "auth.id == data.ref('user.id')[0]",
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
    // New memory media uploads live under `users/{userId}/spaces/{spaceId}/*`
    // so client writes/deletes can be owner-scoped with path rules. Legacy
    // `spaces/{spaceId}/*` rows are not directly readable through `$files`;
    // scoped feature rows must carry the renderable media URL instead.
    allow: {
      // SEC-6: INTENTIONAL. Avatars under `avatars/*` are readable by any
      // signed-in user so partner/member avatars render across spaces; the
      // second clause keeps a user's own space media (`users/{auth.id}/spaces/`)
      // owner-scoped. Writes/deletes below remain owner-prefixed only.
      view:
        "auth.id != null && (data.path.startsWith('avatars/') || data.path.startsWith('users/' + auth.id + '/spaces/'))",
      create:
        "data.path.startsWith('avatars/' + auth.id + '/')" +
        " || data.path.startsWith('users/' + auth.id + '/spaces/')",
      update:
        "data.path.startsWith('avatars/' + auth.id + '/')" +
        " || data.path.startsWith('users/' + auth.id + '/spaces/')",
      delete:
        "data.path.startsWith('avatars/' + auth.id + '/')" +
        " || data.path.startsWith('users/' + auth.id + '/spaces/')",
    },
  },
  memories: {
    allow: {
      view:
        spaceMember +
        " && (data.isPrivate != true || auth.id == data.ref('author.id')[0])",
      create:
        spaceMember +
        " && auth.id == data.ref('author.id')[0]" +
        " && (newData.isPrivate != true || newData.notifyMembers == false)" +
        ` && ${soloMemoriesStayPrivate}` +
        " && (newData.kind in ['post','reply','quote'] || data.ref('space.kind')[0] in ['pair','couple','crew'])",
      update:
        spaceMember +
        " && auth.id == data.ref('author.id')[0]" +
        " && newData.kind == data.kind" +
        " && newData.isPrivate == data.isPrivate" +
        ` && ${soloMemoriesStayPrivate}`,
      delete:
        spaceMember +
        " && (auth.id == data.ref('author.id')[0]" +
        " || (data.isPrivate != true && auth.id in data.ref('space.memberships[role==\"owner\"].user.id')))",
    },
  },
  memoryReactions: {
    allow: {
      view:
        memorySpaceMember +
        " && data.ref('memory.isPrivate')[0] != true",
      create:
        memorySpaceMember +
        " && data.ref('memory.isPrivate')[0] != true" +
        " && data.ref('memory.space.kind')[0] in ['pair','couple','crew']" +
        " && auth.id == data.ref('user.id')[0]" +
        " && !(auth.id in data.ref('memory.reactions.user.id'))",
      update: "false",
      delete: memorySpaceMember + " && auth.id == data.ref('user.id')[0]",
    },
  },
  memoryAttachments: {
    allow: {
      view:
        memorySpaceMember +
        " && (data.ref('memory.isPrivate')[0] != true || auth.id == data.ref('memory.author.id')[0])",
      create: "false",
      update: privateMemoryAttachmentSpaceRepair,
      delete:
        memorySpaceMember +
        " && (auth.id == data.ref('memory.author.id')[0]" +
        " || (data.ref('memory.isPrivate')[0] != true && auth.id in data.ref('memory.space.memberships[role==\"owner\"].user.id')))",
    },
  },
  memoryPolls: {
    allow: {
      view:
        memorySpaceMember +
        " && (data.ref('memory.isPrivate')[0] != true || auth.id == data.ref('memory.author.id')[0])",
      create:
        memorySpaceMember +
        " && auth.id == data.ref('memory.author.id')[0]" +
        " && data.ref('memory.space.kind')[0] == 'crew'",
      update: "false",
      delete:
        memorySpaceMember +
        " && (auth.id == data.ref('memory.author.id')[0]" +
        " || (data.ref('memory.isPrivate')[0] != true && auth.id in data.ref('memory.space.memberships[role==\"owner\"].user.id')))",
    },
  },
  memoryPollOptions: {
    allow: {
      view:
        pollMemorySpaceMember +
        " && (data.ref('poll.memory.isPrivate')[0] != true || auth.id == data.ref('poll.memory.author.id')[0])",
      create:
        pollMemorySpaceMember +
        " && auth.id == data.ref('poll.memory.author.id')[0]" +
        " && data.ref('poll.memory.space.kind')[0] == 'crew'",
      update: "false",
      delete:
        pollMemorySpaceMember +
        " && (auth.id == data.ref('poll.memory.author.id')[0]" +
        " || (data.ref('poll.memory.isPrivate')[0] != true && auth.id in data.ref('poll.memory.space.memberships[role==\"owner\"].user.id')))",
    },
  },
  memoryPollVotes: {
    allow: {
      view:
        pollOptionMemorySpaceMember +
        " && (data.ref('option.poll.memory.isPrivate')[0] != true || auth.id == data.ref('option.poll.memory.author.id')[0])",
      create:
        pollOptionMemorySpaceMember +
        " && (data.ref('option.poll.memory.isPrivate')[0] != true || auth.id == data.ref('option.poll.memory.author.id')[0])" +
        " && auth.id == data.ref('user.id')[0]" +
        " && !(auth.id in data.ref('option.poll.options.votes.user.id'))",
      update: "false",
      delete: pollOptionMemorySpaceMember + " && auth.id == data.ref('user.id')[0]",
    },
  },
  mediaQuotaUsage: {
    allow: {
      view: mediaQuotaMember,
      create:
        mediaQuotaMember +
        " && data.ref('space.mediaQuota.id')[0] == null" +
        " && newData.bytesUsed == 0",
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
