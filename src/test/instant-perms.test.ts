import { describe, expect, it } from 'vitest';
import rules from '../../instant.perms';

describe('Instant permissions', () => {
  it('lets signed-in users resolve open invite spaces without granting writes', () => {
    const spaces = (rules as any).spaces;

    expect(spaces.bind.isOpenInvite).toBe("auth.id != null && data.inviteCode != null");
    expect(spaces.allow.view).toBe('isMember || isOpenInvite');
    expect(spaces.fields.inviteCode).toBe("auth.id in data.ref('memberships.user.id')");
    expect(spaces.fields.name).toBe("auth.id in data.ref('memberships.user.id')");
    expect(spaces.fields.enabledFeatures).toBe("auth.id in data.ref('memberships.user.id')");
    expect(spaces.allow.update).toContain('isMember');
    expect(spaces.allow.delete).toBe('isOnlyMember');
  });

  it('prevents direct shared-space deletion unless the authenticated user is the only member', () => {
    const spaces = (rules as any).spaces;

    expect(spaces.bind.isOnlyMember).toBe(
      "auth.id in data.ref('memberships.user.id') && data.ref('memberships.user.id').all(userId, userId == auth.id)",
    );
    expect(spaces.allow.delete).toBe('isOnlyMember');
  });

  it('prevents clients from changing structural space fields that affect privacy and quotas', () => {
    const spaces = (rules as any).spaces;

    expect(spaces.allow.create).toContain("auth.id == data.ref('createdBy.id')[0]");
    expect(spaces.allow.create).toContain("(newData.plan == null || newData.plan == 'free')");
    expect(spaces.allow.create).toContain("newData.kind in ['solo','pair','couple','crew']");
    expect(spaces.allow.update).toContain(
      "(newData.kind == data.kind || (data.kind in ['pair','couple'] && newData.kind == 'crew'))",
    );
    expect(spaces.allow.update).toContain('newData.plan == data.plan');
    expect(spaces.allow.update).toContain('newData.createdAt == data.createdAt');
  });

  it('limits membership creation to self-owned spaces or open invite joins', () => {
    const memberships = (rules as any).memberships;

    expect(memberships.bind.isSelf).toBe("auth.id == data.ref('user.id')[0]");
    expect(memberships.bind.hasNoExistingSpaceMembership).toBe(
      "!(auth.id in data.ref('space.memberships.user.id'))",
    );
    expect(memberships.bind.isCreatingOwnedSpaceMembership).toBe(
      "isSelf && hasNoExistingSpaceMembership && auth.id == data.ref('space.createdBy.id')[0] && data.role == 'owner'",
    );
    expect(memberships.bind.isJoiningOpenInvite).toBe(
      "isSelf && hasNoExistingSpaceMembership && data.ref('space.inviteCode')[0] != null && data.ref('space.kind')[0] != 'solo' && inviteSpaceAllowsJoin && data.role == 'partner'",
    );
    expect(memberships.allow.create).toBe(
      'auth.id != null && (isCreatingOwnedSpaceMembership || isJoiningOpenInvite)',
    );
  });

  it('caps pair and couple invite joins at two members while allowing crew joins', () => {
    const memberships = (rules as any).memberships;

    expect(memberships.bind.inviteSpaceAllowsJoin).toBe(
      "(data.ref('space.kind')[0] == 'crew' || size(data.ref('space.memberships.user.id')) < 2)",
    );
    expect(memberships.bind.isJoiningOpenInvite).toContain('inviteSpaceAllowsJoin');
  });

  it('allows signed-in invite lookups to count target memberships before attempting a join', () => {
    const memberships = (rules as any).memberships;

    expect(memberships.bind.isOpenInviteLookup).toBe(
      "auth.id != null && data.ref('space.inviteCode')[0] != null",
    );
    expect(memberships.allow.view).toBe(
      "auth.id in data.ref('space.memberships.user.id') || isOpenInviteLookup",
    );
    expect(memberships.fields.role).toBe("auth.id in data.ref('space.memberships.user.id')");
    expect(memberships.fields.joinedAt).toBe("auth.id in data.ref('space.memberships.user.id')");
    expect(memberships.allow.update).toBe('false');
  });

  it('prevents direct deletion of permanent solo memberships', () => {
    const memberships = (rules as any).memberships;

    expect(memberships.allow.delete).toContain("data.ref('space.kind')[0] != 'solo'");
  });

  it('allows users to link their permanent base solo space to their own user row', () => {
    const users = (rules as any).$users;

    expect(users.allow.create).toContain('auth.id == data.id');
    expect(users.allow.create).toContain(
      "(data.ref('baseSoloSpace.id')[0] == null || data.ref('baseSoloSpace.kind')[0] == 'solo')",
    );
    expect(users.allow.update).toContain('auth.id == data.id');
    expect(users.allow.update).toContain(
      "(data.ref('baseSoloSpace.id')[0] == null || data.ref('baseSoloSpace.kind')[0] == 'solo')",
    );
  });

  it('allows pact members to read member profile fields needed for shared identity labels', () => {
    const users = (rules as any).$users;

    expect(users.allow.view).toContain("auth.id == data.id");
    expect(users.allow.view).toContain("auth.id in data.ref('memberships.space.memberships.user.id')");
    expect(users.allow.update).toContain('auth.id == data.id');
    expect(users.allow.update).toContain("data.ref('baseSoloSpace.kind')[0] == 'solo'");
    expect(users.allow.delete).toBe('false');
  });

  it('keeps push device tokens owner-only now that production fan-out uses the API relay', () => {
    const devices = (rules as any).devices;

    expect(devices.allow.view).toBe("auth.id == data.ref('user.id')[0]");
    expect(devices.allow.create).toBe("auth.id == data.ref('user.id')[0]");
    expect(devices.allow.update).toBe("auth.id == data.ref('user.id')[0]");
    expect(devices.allow.delete).toBe("auth.id == data.ref('user.id')[0]");
  });

  it('allows private memories in solo spaces only when notifications are disabled', () => {
    const memories = (rules as any).memories;

    expect(memories.allow.create).toContain("newData.isPrivate != true || newData.notifyMembers == false");
    expect(memories.allow.create).not.toContain("newData.isPrivate != true || data.ref('space.kind')[0] in ['pair','couple','crew']");
  });

  it('does not expose private authored rows to every member of a shared space', () => {
    const privacyByLink: Record<string, string> = {
      events: 'createdBy',
      plans: 'createdBy',
      rituals: 'createdBy',
      checkIns: 'author',
      journalEntries: 'author',
      loveNotes: 'author',
    };

    for (const [table, ownerLink] of Object.entries(privacyByLink)) {
      const allow = (rules as any)[table].allow;
      const privacyGuard = `(data.isPrivate != true || auth.id == data.ref('${ownerLink}.id')[0])`;
      const createGuard = `(newData.isPrivate != true || auth.id == data.ref('${ownerLink}.id')[0])`;

      expect(allow.view).toContain(privacyGuard);
      if (allow.create !== 'false') {
        expect(allow.create).toContain(createGuard);
      }
      expect(allow.update).toContain(privacyGuard);
      expect(allow.update).toContain(createGuard);
      expect(allow.delete).toContain(privacyGuard);
    }
  });

  it('requires solo-space rows to carry private or solo metadata on create and update', () => {
    const soloPrivacyGuard = "(data.ref('couple.kind')[0] != 'solo' || newData.isPrivate == true)";
    for (const table of ['events', 'plans', 'rituals', 'checkIns', 'journalEntries', 'loveNotes']) {
      const allow = (rules as any)[table].allow;
      if (allow.create !== 'false') {
        expect(allow.create).toContain(soloPrivacyGuard);
      }
      expect(allow.update).toContain(soloPrivacyGuard);
    }

    const memories = (rules as any).memories.allow;
    const soloMemoryGuard = "(data.ref('space.kind')[0] != 'solo' || newData.isPrivate == true)";
    expect(memories.create).toContain(soloMemoryGuard);
    expect(memories.update).toContain(soloMemoryGuard);

    const timetables = (rules as any).timetables.allow;
    const soloTimetableGuard = "(data.ref('couple.kind')[0] != 'solo' || newData.share == 'solo')";
    expect(timetables.create).toContain(soloTimetableGuard);
    expect(timetables.update).toContain(soloTimetableGuard);
  });

  it('requires timetable ownership before solo-share permission updates', () => {
    const timetables = (rules as any).timetables.allow;
    const soloShareOwnerGuard = "(newData.share != 'solo' || auth.id == data.ref('createdBy.id')[0])";

    expect(timetables.create).toContain(soloShareOwnerGuard);
    expect(timetables.update).toContain(soloShareOwnerGuard);
  });

  it('requires authenticated ownership links when creating authored rows', () => {
    const ownerByTable: Record<string, string> = {
      events: 'createdBy',
      plans: 'createdBy',
      rituals: 'createdBy',
      checkIns: 'author',
      reminders: 'createdBy',
      tasks: 'createdBy',
      taskLists: 'createdBy',
      journalEntries: 'author',
      timetables: 'createdBy',
    };

    for (const [table, ownerLink] of Object.entries(ownerByTable)) {
      expect((rules as any)[table].allow.create).toContain(
        `auth.id == data.ref('${ownerLink}.id')[0]`,
      );
    }
  });

  it('requires check-in authorship for updates and deletes', () => {
    const allow = (rules as any).checkIns.allow;

    expect(allow.update).toContain("&& auth.id == data.ref('author.id')[0] &&");
    expect(allow.delete).toContain("&& auth.id == data.ref('author.id')[0]");
  });

  it('requires journal authorship for updates and deletes', () => {
    const allow = (rules as any).journalEntries.allow;

    expect(allow.update).toContain("&& auth.id == data.ref('author.id')[0] &&");
    expect(allow.delete).toContain("&& auth.id == data.ref('author.id')[0]");
  });

  it('does not allow retired legacy modules to create new rows', () => {
    for (const table of ['milestones', 'loveNotes', 'wishlists', 'wishlistItems']) {
      expect((rules as any)[table].allow.create).toBe('false');
    }
  });

  it('requires child rows with direct space links to match their parent space', () => {
    const tasks = (rules as any).tasks.allow;
    const timetableItems = (rules as any).timetableItems.allow;
    const taskListSpaceGuard =
      "(data.ref('list.id')[0] == null || data.ref('list.couple.id')[0] == data.ref('couple.id')[0])";
    const timetableSpaceGuard =
      "data.ref('timetable.couple.id')[0] == data.ref('couple.id')[0]";

    for (const action of ['view', 'create', 'update', 'delete']) {
      expect(tasks[action]).toContain(taskListSpaceGuard);
      expect(timetableItems[action]).toContain(timetableSpaceGuard);
    }
  });

  it('requires linked user fields on scoped rows to belong to the owning space', () => {
    const linkedUserSpaceGuard = (link: string) =>
      `(data.ref('${link}.id')[0] == null || data.ref('couple.id')[0] in data.ref('${link}.memberships.space.id'))`;
    const ownerLinkByTable: Record<string, string> = {
      events: 'createdBy',
      plans: 'createdBy',
      rituals: 'createdBy',
      checkIns: 'author',
      journalEntries: 'author',
      loveNotes: 'author',
      taskLists: 'createdBy',
      timetables: 'createdBy',
    };

    for (const [table, ownerLink] of Object.entries(ownerLinkByTable)) {
      const allow = (rules as any)[table].allow;
      const guard = linkedUserSpaceGuard(ownerLink);
      if (allow.create !== 'false') {
        expect(allow.create).toContain(guard);
      }
      expect(allow.update).toContain(guard);
    }

    for (const table of ['reminders', 'tasks']) {
      const allow = (rules as any)[table].allow;
      for (const link of ['createdBy', 'assignedTo', 'completedBy']) {
        const guard = linkedUserSpaceGuard(link);
        expect(allow.create).toContain(guard);
        expect(allow.update).toContain(guard);
      }
    }
  });

  it('requires the authenticated membership when creating rings history', () => {
    const allow = (rules as any).ringsHistory.allow;
    const ownerGuard = "auth.id == data.ref('membership.user.id')[0]";
    const membershipSpaceGuard = "data.ref('membership.space.id')[0] == data.ref('couple.id')[0]";

    expect(allow.create).toContain(ownerGuard);
    expect(allow.create).toContain(membershipSpaceGuard);
    expect(allow.update).toContain(ownerGuard);
    expect(allow.update).toContain(membershipSpaceGuard);
    expect(allow.delete).toContain(ownerGuard);
    expect(allow.delete).toContain(membershipSpaceGuard);
    expect(allow.view).toContain(membershipSpaceGuard);
  });

  it('keeps private memory relations private even if stale data is linked to a shared space', () => {
    const memories = (rules as any).memories;
    expect(memories.allow.view).toContain(
      "(data.isPrivate != true || auth.id == data.ref('author.id')[0])",
    );
    expect(memories.allow.create).toContain("auth.id == data.ref('author.id')[0]");
    expect(memories.allow.delete).toContain("data.isPrivate != true");

    const memoryChildPrivacy =
      "(data.ref('memory.isPrivate')[0] != true || auth.id == data.ref('memory.author.id')[0])";
    const pollOptionPrivacy =
      "(data.ref('poll.memory.isPrivate')[0] != true || auth.id == data.ref('poll.memory.author.id')[0])";
    const pollVotePrivacy =
      "(data.ref('option.poll.memory.isPrivate')[0] != true || auth.id == data.ref('option.poll.memory.author.id')[0])";
    expect((rules as any).memoryAttachments.allow.view).toContain(memoryChildPrivacy);
    expect((rules as any).memoryAttachments.allow.delete).toContain("data.ref('memory.isPrivate')[0] != true");
    expect((rules as any).memoryReactions.allow.view).toContain("data.ref('memory.isPrivate')[0] != true");
    expect((rules as any).memoryReactions.allow.create).toContain("data.ref('memory.isPrivate')[0] != true");
    expect((rules as any).memoryPolls.allow.view).toContain(memoryChildPrivacy);
    expect((rules as any).memoryPolls.allow.create).toContain("auth.id == data.ref('memory.author.id')[0]");
    expect((rules as any).memoryPolls.allow.delete).toContain("data.ref('memory.isPrivate')[0] != true");
    expect((rules as any).memoryPollOptions.allow.view).toContain(pollOptionPrivacy);
    expect((rules as any).memoryPollOptions.allow.create).toContain("auth.id == data.ref('poll.memory.author.id')[0]");
    expect((rules as any).memoryPollOptions.allow.delete).toContain("data.ref('poll.memory.isPrivate')[0] != true");
    expect((rules as any).memoryPollVotes.allow.view).toContain(pollVotePrivacy);
    expect((rules as any).memoryPollVotes.allow.create).toContain(pollVotePrivacy);
  });

  it('requires current space membership before mutating memory rows', () => {
    expect((rules as any).memories.allow.update).toContain(
      "auth.id in data.ref('space.memberships.user.id')",
    );
    expect((rules as any).memories.allow.delete).toContain(
      "auth.id in data.ref('space.memberships.user.id')",
    );

    expect((rules as any).memoryAttachments.allow.create).toBe('false');
    expect((rules as any).memoryAttachments.allow.delete).toContain(
      "auth.id in data.ref('memory.space.memberships.user.id')",
    );
    expect((rules as any).memoryPolls.allow.delete).toContain(
      "auth.id in data.ref('memory.space.memberships.user.id')",
    );
    expect((rules as any).memoryPollOptions.allow.delete).toContain(
      "auth.id in data.ref('poll.memory.space.memberships.user.id')",
    );
    expect((rules as any).memoryPollVotes.allow.delete).toContain(
      "auth.id in data.ref('option.poll.memory.space.memberships.user.id')",
    );
    expect((rules as any).memoryReactions.allow.delete).toContain(
      "auth.id in data.ref('memory.space.memberships.user.id')",
    );
  });

  it('allows private memory authors to repair only denormalized attachment space ids during leave', () => {
    const attachments = (rules as any).memoryAttachments.allow;

    expect(attachments.create).toBe('false');
    expect(attachments.update).toContain(
      "auth.id in data.ref('memory.space.memberships.user.id')",
    );
    expect(attachments.update).toContain("auth.id == data.ref('memory.author.id')[0]");
    expect(attachments.update).toContain("data.ref('memory.isPrivate')[0] == true");
    for (const field of [
      'type',
      'refId',
      'mediaUrl',
      'mediaPath',
      'mediaWidth',
      'mediaHeight',
      'mediaSize',
      'sortOrder',
      'createdAt',
    ]) {
      expect(attachments.update).toContain(`newData.${field} == data.${field}`);
    }
  });

  it('denies direct memory attachment creates so the trusted API can validate attachment scope', () => {
    const createRule = (rules as any).memoryAttachments.allow.create;

    expect(createRule).toBe('false');
  });

  it('limits storage reads and writes to owner-controlled paths', () => {
    const files = (rules as any).$files;

    expect(files.allow.view).toContain("data.path.startsWith('users/' + auth.id + '/spaces/')");
    expect(files.allow.view).not.toContain("data.path.startsWith('spaces/')");
    expect(files.allow.view).not.toContain("data.path.startsWith('users/')");
    for (const action of ['create', 'update', 'delete']) {
      expect(files.allow[action]).toContain("data.path.startsWith('users/' + auth.id + '/spaces/')");
      expect(files.allow[action]).not.toContain("data.path.startsWith('spaces/') && auth.id != null");
    }
  });
});
