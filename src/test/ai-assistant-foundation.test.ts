import { describe, expect, it } from 'vitest';

import {
  AI_DOMAINS,
  AI_MODEL_PACKS,
  buildActionDraft,
  buildAiContextPrompt,
  buildMutationPlan,
  confirmAiActionDrafts,
  createInitialAiTurn,
  filterToolCallsForAllowedDomains,
  parseAiToolCall,
  polishDraft,
  processAiAudioTurn,
  reduceAiTurn,
  runReadTool,
} from '@/src/lib/ai';
import {
  buildAiRelationSpaceMap,
  buildAiSessionQuery,
  buildAiSessionRecords,
  buildAiTargetOwnerMap,
  buildAiTargetSpaceMap,
} from '@/src/lib/ai/sessionProvider';
import { getLocalAiDateKey } from '@/src/lib/ai/date';

describe('Pacto AI assistant foundation', () => {
  it('declares local model packs for Whisper and Qwen with download metadata', () => {
    const whisperTiny = AI_MODEL_PACKS.find((pack) => pack.id === 'whisper-tiny-en');
    const qwen = AI_MODEL_PACKS.find((pack) => pack.id === 'qwen3-0.6b-instruct-q4');

    expect(whisperTiny).toMatchObject({
      type: 'speechToText',
      runtime: 'whisper.rn',
      delivery: 'downloadAfterInstall',
      status: 'notDownloaded',
    });
    expect(whisperTiny?.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(whisperTiny?.sizeBytes).toBeGreaterThan(70_000_000);

    expect(qwen).toMatchObject({
      type: 'llm',
      runtime: 'llama.rn',
      delivery: 'downloadAfterInstall',
      status: 'notDownloaded',
    });
    expect(qwen?.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(qwen?.sizeBytes).toBeGreaterThan(300_000_000);
  });

  it('covers all app data domains the assistant is allowed to read or mutate', () => {
    expect(AI_DOMAINS).toEqual([
      'reminders',
      'tasks',
      'taskLists',
      'events',
      'checkIns',
      'plans',
      'journalEntries',
      'timetables',
      'timetableItems',
    ]);
  });

  it('validates constrained model output before creating mutation previews', () => {
    const toolCall = parseAiToolCall({
      id: 'call-1',
      domain: 'reminders',
      operation: 'create',
      input: {
        title: 'Call mum',
        dueAt: Date.parse('2026-05-01T09:00:00.000Z'),
        priority: 1,
      },
      confidence: 0.92,
    });

    const draft = buildActionDraft(toolCall, { now: 1777572000000 });

    expect(draft).toMatchObject({
      id: 'draft-call-1',
      domain: 'reminders',
      operation: 'create',
      requiresConfirmation: true,
      destructive: false,
      title: 'Create reminder',
      summary: 'Call mum',
    });
  });

  it('rejects malformed mutation output instead of guessing missing data', () => {
    expect(() =>
      parseAiToolCall({
        domain: 'tasks',
        operation: 'update',
        input: { title: 'Move groceries' },
      }),
    ).toThrow(/targetId/);

    expect(() =>
      parseAiToolCall({
        domain: 'plans',
        operation: 'create',
        input: { title: 'Dinner', budget: 'not-a-number' },
      }),
    ).toThrow(/budget/);

    expect(() =>
      parseAiToolCall({
        domain: 'plans',
        operation: 'create',
        input: { title: 'Unclear target', status: 'blocked' },
      }),
    ).toThrow(/status/);

    expect(() =>
      parseAiToolCall({
        domain: 'tasks',
        operation: 'create',
        input: { title: 'Distorting priority task', listId: 'list-1', priority: 5 },
      }),
    ).toThrow(/priority/);

    expect(() =>
      parseAiToolCall({
        domain: 'tasks',
        operation: 'create',
        input: { title: 'Invisible orphan task' },
      }),
    ).toThrow(/listId/);

    expect(() =>
      parseAiToolCall({
        domain: 'timetableItems',
        operation: 'create',
        input: { title: 'Invisible timetable block' },
      }),
    ).toThrow(/timetableId/);

    expect(() =>
      parseAiToolCall({
        domain: 'taskLists',
        operation: 'create',
        input: { name: 'Invalid color list', colorKey: 'neon' },
      }),
    ).toThrow(/colorKey/);

    expect(() =>
      parseAiToolCall({
        domain: 'taskLists',
        operation: 'update',
        targetId: 'list-1',
        input: { name: 'Private errands', scope: 'personal' },
      }),
    ).toThrow(/scope/);

    expect(() =>
      parseAiToolCall({
        domain: 'reminders',
        operation: 'create',
        input: {
          title: 'Invalid repeat reminder',
          dueAt: 1777572000000,
          recurrence: 'weekdays',
        },
      }),
    ).toThrow(/recurrence/);

    expect(() =>
      parseAiToolCall({
        domain: 'timetables',
        operation: 'create',
        input: { title: 'Misrouted rhythm', share: 'private' },
      }),
    ).toThrow(/share/);

    expect(() =>
      parseAiToolCall({
        domain: 'timetables',
        operation: 'create',
        input: { title: 'Unsupported rhythm', template: 'fitness-v2' },
      }),
    ).toThrow(/template/);

    expect(() =>
      parseAiToolCall({
        domain: 'timetableItems',
        operation: 'create',
        input: { title: 'Unscheduled block', timetableId: 'timetable-1' },
      }),
    ).toThrow(/schedule/);
  });

  it('drops retired icon metadata from assistant plan and task-list writes', () => {
    expect(
      parseAiToolCall({
        domain: 'plans',
        operation: 'create',
        input: { title: 'Weekend away', icon: 'heart' },
      }).input,
    ).toEqual({ title: 'Weekend away' });

    expect(
      parseAiToolCall({
        domain: 'taskLists',
        operation: 'create',
        input: { name: 'Packing', icon: 'bag' },
      }).input,
    ).toEqual({ name: 'Packing' });
  });

  it('rejects assistant date-only fields unless they are exact real calendar dates', () => {
    expect(() =>
      parseAiToolCall({
        domain: 'tasks',
        operation: 'create',
        input: {
          title: 'Task with impossible due date',
          listId: 'list-1',
          dueDate: '2026-02-31',
        },
      }),
    ).toThrow(/YYYY-MM-DD/);

    expect(() =>
      parseAiToolCall({
        domain: 'plans',
        operation: 'create',
        input: {
          title: 'Target with timestamp suffix',
          targetDate: '2026-05-01T00:00:00.000Z',
        },
      }),
    ).toThrow(/YYYY-MM-DD/);

    expect(() =>
      parseAiToolCall({
        domain: 'checkIns',
        operation: 'create',
        input: {
          mood: 'steady',
          checkInDate: 'not-a-date',
        },
      }),
    ).toThrow(/YYYY-MM-DD/);

    expect(() =>
      parseAiToolCall({
        domain: 'journalEntries',
        operation: 'create',
        input: {
          body: 'Journal with impossible date',
          entryDate: '2026-04-31',
        },
      }),
    ).toThrow(/YYYY-MM-DD/);
  });

  it('rejects assistant timestamp fields outside the JavaScript date range', () => {
    expect(() =>
      parseAiToolCall({
        domain: 'reminders',
        operation: 'create',
        input: {
          title: 'Impossible reminder',
          dueAt: 8_640_000_000_000_001,
        },
      }),
    ).toThrow(/valid timestamp/);

    expect(() =>
      parseAiToolCall({
        domain: 'events',
        operation: 'create',
        input: {
          title: 'Impossible event start',
          startsAt: 8_640_000_000_000_001,
        },
      }),
    ).toThrow(/valid timestamp/);

    expect(() =>
      parseAiToolCall({
        domain: 'events',
        operation: 'create',
        input: {
          title: 'Impossible event end',
          startsAt: Date.parse('2026-05-01T09:00:00.000Z'),
          endsAt: 8_640_000_000_000_001,
        },
      }),
    ).toThrow(/valid timestamp/);

    expect(() =>
      parseAiToolCall({
        domain: 'events',
        operation: 'create',
        input: {
          title: 'Backwards event',
          startsAt: Date.parse('2026-05-01T10:00:00.000Z'),
          endsAt: Date.parse('2026-05-01T09:00:00.000Z'),
        },
      }),
    ).toThrow(/endsAt/);
  });

  it('builds deterministic InstantDB mutation plans only from confirmed drafts', () => {
    const toolCall = parseAiToolCall({
      id: 'delete-weekend-plan',
      domain: 'plans',
      operation: 'delete',
      targetId: 'plan-123',
      input: {},
      confidence: 0.95,
    });
    const draft = buildActionDraft(toolCall, { now: 1777572000000 });

    expect(draft.requiresConfirmation).toBe(true);
    expect(draft.destructive).toBe(true);
    expect(() =>
      buildMutationPlan(draft, {
        confirmed: false,
        coupleId: 'space-1',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'new-id',
      }),
    ).toThrow(/confirmation/);

    expect(
      buildMutationPlan(draft, {
        confirmed: true,
        coupleId: 'space-1',
        targetSpaceById: { plans: { 'plan-123': 'space-1' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'new-id',
      }),
    ).toEqual({
      domain: 'plans',
      entity: 'plans',
      operation: 'delete',
      targetId: 'plan-123',
      data: {},
      links: {},
      unlinks: {},
    });
  });

  it('adds relationship links and timestamps for create mutation plans', () => {
    const toolCall = parseAiToolCall({
      id: 'task-1',
      domain: 'tasks',
      operation: 'create',
      input: {
        title: 'Buy groceries',
        dueDate: '2026-05-01',
        listId: 'list-1',
      },
    });
    const draft = buildActionDraft(toolCall, { now: 1777572000000 });

    expect(
      buildMutationPlan(draft, {
        confirmed: true,
        coupleId: 'space-1',
        relationSpaceById: { 'list-1': 'space-1' },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'generated-task-id',
      }),
    ).toEqual({
      domain: 'tasks',
      entity: 'tasks',
      operation: 'create',
      targetId: 'generated-task-id',
      data: {
        title: 'Buy groceries',
        dueDate: '2026-05-01',
        isCompleted: false,
        priority: 0,
        sortOrder: 0,
        createdAt: 1777572000000,
        updatedAt: 1777572000000,
      },
      links: {
        couple: 'space-1',
        createdBy: 'user-1',
        list: 'list-1',
      },
      unlinks: {},
    });
  });

  it('fails closed before assistant child-row creates with unknown parent ids', () => {
    const taskDraft = buildActionDraft(
      parseAiToolCall({
        id: 'unknown-list-task',
        domain: 'tasks',
        operation: 'create',
        input: {
          title: 'Task with hallucinated parent list',
          listId: 'missing-list',
        },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(taskDraft, {
        confirmed: true,
        coupleId: 'shared-space',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        relationSpaceById: {},
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'task-1',
      }),
    ).toThrow(/parent list not found/);

    const timetableItemDraft = buildActionDraft(
      parseAiToolCall({
        id: 'unknown-timetable-item',
        domain: 'timetableItems',
        operation: 'create',
        input: {
          title: 'Block with hallucinated parent timetable',
          day: 1,
          startHour: 9,
          duration: 60,
          timetableId: 'missing-timetable',
        },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(timetableItemDraft, {
        confirmed: true,
        coupleId: 'shared-space',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        relationSpaceById: {},
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'item-1',
      }),
    ).toThrow(/parent timetable not found/);
  });

  it('routes assistant privacy-scoped mutations to personal or shared spaces', () => {
    const privatePlan = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'private-plan',
          domain: 'plans',
          operation: 'create',
          input: { title: 'Private target', isPrivate: true },
        }),
        { now: 1777572000000 },
      ),
      {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'plan-1',
      },
    );
    expect(privatePlan.links.couple).toBe('solo-space');

    const sharedJournalUpdate = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'share-journal',
          domain: 'journalEntries',
          operation: 'update',
          targetId: 'entry-1',
          input: { isPrivate: false },
        }),
        { now: 1777572000000 },
      ),
      {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        targetSpaceById: { journalEntries: { 'entry-1': 'solo-space' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
      },
    );
    expect(sharedJournalUpdate.links.couple).toBe('shared-space');

    const soloTimetable = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'solo-timetable',
          domain: 'timetables',
          operation: 'update',
          targetId: 'timetable-1',
          input: { share: 'solo' },
        }),
        { now: 1777572000000 },
      ),
      {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        targetSpaceById: { timetables: { 'timetable-1': 'shared-space' } },
        targetOwnerById: { timetables: { 'timetable-1': 'user-1' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
      },
    );
    expect(soloTimetable.links.couple).toBe('solo-space');
  });

  it('fails closed before assistant personal relinks for another member records', () => {
    const sharedReminderToPersonal = buildActionDraft(
      parseAiToolCall({
        id: 'partner-reminder-to-personal',
        domain: 'reminders',
        operation: 'update',
        targetId: 'partner-reminder',
        input: { scope: 'personal' },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(sharedReminderToPersonal, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        targetSpaceById: { reminders: { 'partner-reminder': 'shared-space' } },
        targetOwnerById: { reminders: { 'partner-reminder': 'partner-1' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
      }),
    ).toThrow('Cannot move another member reminder into personal space');

    const sharedEventToPersonal = buildActionDraft(
      parseAiToolCall({
        id: 'partner-event-to-personal',
        domain: 'events',
        operation: 'update',
        targetId: 'partner-event',
        input: { isPrivate: true },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(sharedEventToPersonal, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        targetSpaceById: { events: { 'partner-event': 'shared-space' } },
        targetOwnerById: { events: { 'partner-event': 'partner-1' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
      }),
    ).toThrow('Cannot move another member calendar event into personal space');

    const sharedCheckInToPersonal = buildActionDraft(
      parseAiToolCall({
        id: 'partner-check-in-to-personal',
        domain: 'checkIns',
        operation: 'update',
        targetId: 'partner-check-in',
        input: { isPrivate: true },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(sharedCheckInToPersonal, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        targetSpaceById: { checkIns: { 'partner-check-in': 'shared-space' } },
        targetOwnerById: { checkIns: { 'partner-check-in': 'partner-1' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
      }),
    ).toThrow('Cannot move another member check-in into personal space');

    const sharedPlanToPersonal = buildActionDraft(
      parseAiToolCall({
        id: 'partner-plan-to-personal',
        domain: 'plans',
        operation: 'update',
        targetId: 'partner-plan',
        input: { isPrivate: true },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(sharedPlanToPersonal, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        targetSpaceById: { plans: { 'partner-plan': 'shared-space' } },
        targetOwnerById: { plans: { 'partner-plan': 'partner-1' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
      }),
    ).toThrow('Cannot move another member target into personal space');

    const sharedJournalToPersonal = buildActionDraft(
      parseAiToolCall({
        id: 'partner-journal-to-personal',
        domain: 'journalEntries',
        operation: 'update',
        targetId: 'partner-journal',
        input: { isPrivate: true },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(sharedJournalToPersonal, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        targetSpaceById: { journalEntries: { 'partner-journal': 'shared-space' } },
        targetOwnerById: { journalEntries: { 'partner-journal': 'partner-1' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
      }),
    ).toThrow('Cannot move another member journal entry into personal space');

    const sharedTimetableToPersonal = buildActionDraft(
      parseAiToolCall({
        id: 'partner-timetable-to-personal',
        domain: 'timetables',
        operation: 'update',
        targetId: 'partner-timetable',
        input: { share: 'solo' },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(sharedTimetableToPersonal, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        targetSpaceById: { timetables: { 'partner-timetable': 'shared-space' } },
        targetOwnerById: { timetables: { 'partner-timetable': 'partner-1' } },
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
      }),
    ).toThrow('Cannot move another member timetable into personal space');
  });

  it('rejects assistant task updates that try to move spaces by scope alone', () => {
    expect(() =>
      parseAiToolCall({
        id: 'scope-only-task-update',
        domain: 'tasks',
        operation: 'update',
        targetId: 'task-1',
        input: { scope: 'personal' },
      }),
    ).toThrow(/listId/);
  });

  it('fails closed instead of routing assistant personal mutations to a shared fallback', () => {
    const privatePlanDraft = buildActionDraft(
      parseAiToolCall({
        id: 'private-plan-without-base',
        domain: 'plans',
        operation: 'create',
        input: { title: 'Private target', isPrivate: true },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(privatePlanDraft, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: null,
        sharedSpaceId: 'active-shared',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'plan-1',
      }),
    ).toThrow(/personal space/i);

    const personalReminderDraft = buildActionDraft(
      parseAiToolCall({
        id: 'personal-reminder-without-base',
        domain: 'reminders',
        operation: 'create',
        input: {
          title: 'Private reminder',
          dueAt: 1777572000000,
          scope: 'personal',
        },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(personalReminderDraft, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: null,
        sharedSpaceId: 'active-shared',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'reminder-1',
      }),
    ).toThrow(/personal space/i);
  });

  it('fails closed before assistant update/delete targets outside scoped context', () => {
    const updateDraft = buildActionDraft(
      parseAiToolCall({
        id: 'update-missing-plan',
        domain: 'plans',
        operation: 'update',
        targetId: 'missing-plan',
        input: { title: 'Outside scope' },
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(updateDraft, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
        targetSpaceById: { plans: {} },
      }),
    ).toThrow('target not found');

    const deleteDraft = buildActionDraft(
      parseAiToolCall({
        id: 'delete-other-task',
        domain: 'tasks',
        operation: 'delete',
        targetId: 'other-task',
        input: {},
      }),
      { now: 1777572000000 },
    );

    expect(() =>
      buildMutationPlan(deleteDraft, {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'unused',
        targetSpaceById: { tasks: { 'other-task': 'other-space' } },
      }),
    ).toThrow('task not found');
  });

  it('stores assistant solo fallback creates with personal privacy metadata', () => {
    const baseContext = {
      confirmed: true,
      coupleId: 'solo-space',
      personalSpaceId: 'solo-space',
      sharedSpaceId: null,
      userId: 'user-1',
      now: 1777572000000,
      idFactory: () => 'generated-id',
    };

    const plan = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'fallback-plan',
          domain: 'plans',
          operation: 'create',
          input: { title: 'Solo target' },
        }),
        { now: 1777572000000 },
      ),
      baseContext,
    );
    expect(plan.links.couple).toBe('solo-space');
    expect(plan.data).toMatchObject({ isPrivate: true });

    const checkIn = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'fallback-check-in',
          domain: 'checkIns',
          operation: 'create',
          input: { mood: 'steady', checkInDate: '2026-05-24' },
        }),
        { now: 1777572000000 },
      ),
      baseContext,
    );
    expect(checkIn.links.couple).toBe('solo-space');
    expect(checkIn.data).toMatchObject({ isPrivate: true });

    const journal = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'fallback-journal',
          domain: 'journalEntries',
          operation: 'create',
          input: { body: 'Private note', entryDate: '2026-05-24' },
        }),
        { now: 1777572000000 },
      ),
      baseContext,
    );
    expect(journal.links.couple).toBe('solo-space');
    expect(journal.data).toMatchObject({ isPrivate: true });

    const event = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'fallback-event',
          domain: 'events',
          operation: 'create',
          input: {
            title: 'Solo calendar block',
            startsAt: 1777572000000,
          },
        }),
        { now: 1777572000000 },
      ),
      baseContext,
    );
    expect(event.links.couple).toBe('solo-space');
    expect(event.data).toMatchObject({ isPrivate: true });

    const timetable = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'fallback-timetable',
          domain: 'timetables',
          operation: 'create',
          input: { title: 'Solo rhythm' },
        }),
        { now: 1777572000000 },
      ),
      baseContext,
    );
    expect(timetable.links.couple).toBe('solo-space');
    expect(timetable.data).toMatchObject({ share: 'solo' });
  });

  it('routes assistant-created child records to the parent relation space', () => {
    const personalTask = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'personal-list-task',
          domain: 'tasks',
          operation: 'create',
          input: {
            title: 'Private list task',
            listId: 'personal-list',
          },
        }),
        { now: 1777572000000 },
      ),
      {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'task-1',
        relationSpaceById: {
          'personal-list': 'solo-space',
        },
      },
    );

    expect(personalTask.links).toMatchObject({
      couple: 'solo-space',
      list: 'personal-list',
      createdBy: 'user-1',
    });

    const sharedTimetableItem = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'shared-timetable-item',
        domain: 'timetableItems',
        operation: 'create',
        input: {
          title: 'Dinner',
          day: 5,
          startHour: 19,
          duration: 90,
          timetableId: 'shared-timetable',
        },
      }),
        { now: 1777572000000 },
      ),
      {
        confirmed: true,
        coupleId: 'solo-space',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'item-1',
        relationSpaceById: {
          'shared-timetable': 'shared-space',
        },
      },
    );

    expect(sharedTimetableItem.links).toMatchObject({
      couple: 'shared-space',
      timetable: 'shared-timetable',
    });
  });

  it('routes assistant-created personal reminders, tasks, and task lists to the solo space', () => {
    const personalReminder = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'personal-reminder',
          domain: 'reminders',
          operation: 'create',
          input: {
            title: 'Renew passport',
            dueAt: 1777572000000,
            scope: 'personal',
            assignedTo: 'partner-1',
          },
        }),
        { now: 1777572000000 },
      ),
      {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'reminder-1',
      },
    );
    expect(personalReminder.links.couple).toBe('solo-space');
    expect(personalReminder.links).not.toHaveProperty('assignedTo');
    expect(personalReminder.data).not.toHaveProperty('scope');

    const personalTask = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'personal-task',
          domain: 'tasks',
          operation: 'create',
          input: {
            title: 'Private admin',
            scope: 'personal',
            listId: 'personal-list',
            assignedTo: 'partner-1',
          },
        }),
        { now: 1777572000000 },
      ),
      {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'task-1',
        relationSpaceById: {
          'personal-list': 'solo-space',
        },
      },
    );
    expect(personalTask.links.couple).toBe('solo-space');
    expect(personalTask.links.list).toBe('personal-list');
    expect(personalTask.links).not.toHaveProperty('assignedTo');
    expect(personalTask.data).not.toHaveProperty('scope');

    const personalTaskList = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'personal-task-list',
          domain: 'taskLists',
          operation: 'create',
          input: {
            name: 'Private errands',
            scope: 'personal',
          },
        }),
        { now: 1777572000000 },
      ),
      {
        confirmed: true,
        coupleId: 'active-shared',
        personalSpaceId: 'solo-space',
        sharedSpaceId: 'shared-space',
        userId: 'user-1',
        now: 1777572000000,
        idFactory: () => 'list-1',
      },
    );
    expect(personalTaskList.links.couple).toBe('solo-space');
    expect(personalTaskList.data).not.toHaveProperty('scope');
  });

  it('rejects assistant shared reminder and task assignments to non-members', () => {
    const ctx = {
      confirmed: true,
      coupleId: 'active-shared',
      personalSpaceId: 'solo-space',
      sharedSpaceId: 'shared-space',
      userId: 'user-1',
      assignableUserIds: ['user-1', 'partner-1'],
      now: 1777572000000,
      idFactory: () => 'generated-id',
      relationSpaceById: {
        'shared-list': 'shared-space',
      },
      targetSpaceById: {
        tasks: {
          'shared-task': 'shared-space',
        },
      },
    };

    const partnerReminder = buildMutationPlan(
      buildActionDraft(
        parseAiToolCall({
          id: 'shared-reminder-partner',
          domain: 'reminders',
          operation: 'create',
          input: {
            title: 'Shared errand',
            dueAt: 1777572000000,
            scope: 'shared',
            assignedTo: 'partner-1',
          },
        }),
        { now: 1777572000000 },
      ),
      ctx,
    );
    expect(partnerReminder.links.assignedTo).toBe('partner-1');

    expect(() =>
      buildMutationPlan(
        buildActionDraft(
          parseAiToolCall({
            id: 'shared-reminder-stranger',
            domain: 'reminders',
            operation: 'create',
            input: {
              title: 'Shared errand',
              dueAt: 1777572000000,
              scope: 'shared',
              assignedTo: 'stranger-1',
            },
          }),
          { now: 1777572000000 },
        ),
        ctx,
      ),
    ).toThrow('Invalid reminder assignee');

    expect(() =>
      buildMutationPlan(
        buildActionDraft(
          parseAiToolCall({
            id: 'shared-task-stranger',
            domain: 'tasks',
            operation: 'create',
            input: {
              title: 'Shared task',
              listId: 'shared-list',
              assignedTo: 'stranger-1',
            },
          }),
          { now: 1777572000000 },
        ),
        ctx,
      ),
    ).toThrow('Invalid task assignee');

    expect(() =>
      buildMutationPlan(
        buildActionDraft(
          parseAiToolCall({
            id: 'shared-task-update-stranger',
            domain: 'tasks',
            operation: 'update',
            targetId: 'shared-task',
            input: {
              assignedTo: 'stranger-1',
            },
          }),
          { now: 1777572000000 },
        ),
        ctx,
      ),
    ).toThrow('Invalid task assignee');
  });

  it('builds assistant relation-space maps from task list and timetable context', () => {
    expect(
      buildAiRelationSpaceMap({
        taskLists: [
          { id: 'personal-list', name: 'Private', couple: [{ id: 'solo-space' }] },
          { id: 'shared-list', name: 'Shared', couple: { id: 'shared-space' } },
        ],
        timetables: [
          { id: 'shared-timetable', title: 'Shared rhythm', couple: [{ id: 'shared-space' }] },
          { id: 'orphan-timetable', title: 'No space' },
        ],
      }),
    ).toEqual({
      'personal-list': 'solo-space',
      'shared-list': 'shared-space',
      'shared-timetable': 'shared-space',
    });
  });

  it('builds assistant target-space maps from visible scoped context records', () => {
    expect(
      buildAiTargetSpaceMap({
        plans: [
          { id: 'personal-plan', title: 'Private', couple: [{ id: 'solo-space' }] },
          { id: 'shared-plan', title: 'Shared', couple: { id: 'shared-space' } },
          { id: 'orphan-plan', title: 'No space' },
        ],
        tasks: [
          { id: 'task-1', title: 'Task', couple: { id: 'shared-space' }, list: { couple: { id: 'shared-space' } } },
        ],
      }),
    ).toEqual({
      plans: {
        'personal-plan': 'solo-space',
        'shared-plan': 'shared-space',
      },
      tasks: {
        'task-1': 'shared-space',
      },
    });
  });

  it('builds assistant target-owner maps from visible scoped context records', () => {
    expect(
      buildAiTargetOwnerMap({
        reminders: [
          { id: 'owned-reminder', title: 'Mine', createdBy: { id: 'user-1' } },
          { id: 'partner-reminder', title: 'Theirs', createdBy: [{ id: 'partner-1' }] },
        ],
        plans: [
          { id: 'owned-plan', title: 'Mine', createdBy: { id: 'user-1' } },
        ],
        journalEntries: [
          { id: 'owned-entry', body: 'Mine', author: [{ id: 'user-1' }] },
        ],
        timetables: [
          { id: 'partner-timetable', title: 'Theirs', createdBy: { id: 'partner-1' } },
        ],
        timetableItems: [
          {
            id: 'partner-block',
            title: 'Block',
            couple: { id: 'shared-space' },
            timetable: { couple: { id: 'shared-space' }, createdBy: { id: 'partner-1' } },
          },
        ],
      }),
    ).toEqual({
      reminders: {
        'owned-reminder': 'user-1',
        'partner-reminder': 'partner-1',
      },
      plans: {
        'owned-plan': 'user-1',
      },
      journalEntries: {
        'owned-entry': 'user-1',
      },
      timetables: {
        'partner-timetable': 'partner-1',
      },
      timetableItems: {
        'partner-block': 'partner-1',
      },
    });
  });

  it('derives assistant child target spaces from resolved parent rows for legacy children', () => {
    expect(
      buildAiTargetSpaceMap({
        tasks: [
          { id: 'legacy-task', title: 'Legacy task', list: { couple: { id: 'solo-space' } } },
          {
            id: 'cross-space-task',
            title: 'Malformed task',
            couple: { id: 'shared-space' },
            list: { couple: { id: 'solo-space' } },
          },
        ],
        timetableItems: [
          {
            id: 'legacy-item',
            title: 'Legacy block',
            timetable: { couple: [{ id: 'shared-space' }] },
          },
          {
            id: 'cross-space-item',
            title: 'Malformed block',
            couple: { id: 'solo-space' },
            timetable: { couple: { id: 'shared-space' } },
          },
        ],
      }),
    ).toEqual({
      tasks: {
        'legacy-task': 'solo-space',
      },
      timetableItems: {
        'legacy-item': 'shared-space',
      },
    });
  });

  it('models the press-dictate-submit assistant state machine', () => {
    const initial = createInitialAiTurn('turn-1');

    const complete = [
      { type: 'startRecording' as const },
      { type: 'submitAudio' as const },
      { type: 'transcriptionComplete' as const, transcript: 'Create a reminder tomorrow at 9' },
      { type: 'thinking' as const },
      { type: 'assistantMessage' as const, body: 'I can create that reminder after you confirm.' },
      { type: 'awaitConfirmation' as const, actions: [] },
      { type: 'applyConfirmedActions' as const },
      { type: 'complete' as const, body: 'Reminder created.' },
    ].reduce(reduceAiTurn, initial);

    expect(complete.state).toBe('complete');
    expect(complete.transcript).toBe('Create a reminder tomorrow at 9');
    expect(complete.messages.map((message) => message.body)).toEqual([
      'Create a reminder tomorrow at 9',
      'I can create that reminder after you confirm.',
      'Reminder created.',
    ]);
  });

  it('builds bounded local context and runs read tools without confirmation', () => {
    const context = buildAiContextPrompt({
      userId: 'user-1',
      userName: 'Ari',
      spaceId: 'space-1',
      spaceMode: 'couple',
      partnerName: 'Sam',
      today: '2026-04-30',
      timezone: 'Europe/London',
      records: {
        tasks: [
          { id: 'task-1', title: 'Dinner plan', isCompleted: false, createdAt: 10 },
          { id: 'task-2', title: 'Coffee refill', isCompleted: true, createdAt: 20 },
        ],
      },
    });
    expect(context).toContain('today: 2026-04-30');
    expect(context).toContain('partner: Sam');
    expect(context).toContain('task-2 "Coffee refill"; task-1 "Dinner plan"');

    const readCall = parseAiToolCall({
      id: 'read-tasks',
      domain: 'tasks',
      operation: 'read',
      input: { query: 'dinner', limit: 5 },
    });

    expect(
      runReadTool(readCall, [
        { id: 'task-1', title: 'Dinner plan' },
        { id: 'task-2', title: 'Coffee refill' },
      ]),
    ).toMatchObject({
      callId: 'read-tasks',
      ok: true,
      records: [{ id: 'task-1', title: 'Dinner plan' }],
    });
  });

  it('does not let impossible assistant context dates outrank valid records', () => {
    const context = buildAiContextPrompt({
      userId: 'user-1',
      userName: 'Ari',
      spaceId: 'space-1',
      spaceMode: 'couple',
      partnerName: 'Sam',
      today: '2026-04-30',
      timezone: 'Europe/London',
      records: {
        tasks: [
          { id: 'bad-date', title: 'Impossible rollover', date: '2026-04-31T12:00:00' },
          { id: 'valid-date', title: 'Valid record', date: '2026-04-30T12:00:00' },
        ],
      },
    });

    expect(context).toContain('tasks: valid-date "Valid record"; bad-date "Impossible rollover"');
  });

  it('formats assistant today from the local calendar date', () => {
    expect(getLocalAiDateKey(new Date('2026-04-17T23:30:00.000Z'))).toBe('2026-04-18');
  });

  it('limits assistant session queries and prompt records to enabled features', () => {
    const enabled = (featureId: string) => ['tasks', 'calendar'].includes(featureId);
    const query = buildAiSessionQuery('space-1', enabled as any) as Record<string, any>;

    expect(Object.keys(query).sort()).toEqual(['events', 'taskLists', 'tasks']);
    expect(query.tasks.$.where).toEqual({ 'couple.id': 'space-1' });
    expect(query.tasks.$.order).toEqual({ updatedAt: 'desc' });
    expect(query.tasks.$.limit).toBe(100);
    expect(query.events.$.where).toEqual({ 'couple.id': 'space-1' });
    expect(query.events.$.order).toEqual({ updatedAt: 'desc' });
    expect(query.events.$.limit).toBe(100);
    expect(query.reminders).toBeUndefined();
    expect(query.checkIns).toBeUndefined();

    const records = buildAiSessionRecords(
      {
        tasks: [{ id: 'task-1', couple: { id: 'space-1' }, list: { couple: { id: 'space-1' } } }],
        events: [{ id: 'event-1' }],
        reminders: [{ id: 'reminder-1' }],
      } as any,
      enabled as any,
    );

    expect(records).toEqual({
      tasks: [{ id: 'task-1', couple: { id: 'space-1' }, list: { couple: { id: 'space-1' } } }],
      taskLists: [],
      events: [{ id: 'event-1' }],
    });
  });

  it('filters assistant child-row context to the parent record space', () => {
    const enabled = (featureId: string) => ['tasks', 'timetable'].includes(featureId);
    const query = buildAiSessionQuery(['solo-1', 'shared-1'], enabled as any) as Record<string, any>;

    expect(query.tasks.list).toEqual({ couple: {}, createdBy: {} });
    expect(query.timetableItems.timetable).toEqual({ couple: {}, createdBy: {} });

    const records = buildAiSessionRecords(
      {
        tasks: [
          {
            id: 'valid-task',
            title: 'Shared task',
            couple: { id: 'shared-1' },
            list: { id: 'shared-list', couple: { id: 'shared-1' } },
          },
          {
            id: 'cross-space-task',
            title: 'Wrong-space task',
            couple: { id: 'shared-1' },
            list: { id: 'personal-list', couple: { id: 'solo-1' } },
          },
        ],
        timetableItems: [
          {
            id: 'valid-block',
            title: 'Shared block',
            couple: { id: 'shared-1' },
            timetable: { id: 'shared-timetable', couple: { id: 'shared-1' } },
          },
          {
            id: 'cross-space-block',
            title: 'Wrong-space block',
            couple: { id: 'shared-1' },
            timetable: { id: 'personal-timetable', couple: { id: 'solo-1' } },
          },
        ],
      } as any,
      enabled as any,
    );

    expect(records.tasks?.map((record) => record.id)).toEqual(['valid-task']);
    expect(records.timetableItems?.map((record) => record.id)).toEqual(['valid-block']);
    expect(buildAiTargetSpaceMap(records).tasks).toEqual({ 'valid-task': 'shared-1' });
    expect(buildAiTargetSpaceMap(records).timetableItems).toEqual({ 'valid-block': 'shared-1' });
  });

  it('queries assistant context across personal and shared spaces', () => {
    const enabled = (featureId: string) => ['journal', 'goals'].includes(featureId);
    const query = buildAiSessionQuery(['solo-1', 'shared-1'], enabled as any) as Record<string, any>;

    expect(query.plans.$.where).toEqual({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
    });
    expect(query.journalEntries.$.where).toEqual({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
    });
  });

  it('orders bounded assistant context queries by recently updated records', () => {
    const enabled = () => true;
    const query = buildAiSessionQuery(['solo-1', 'shared-1'], enabled as any) as Record<string, any>;

    for (const domain of Object.keys(query)) {
      expect(query[domain].$.order).toEqual({ updatedAt: 'desc' });
    }
  });

  it('filters assistant personal-space context and target maps to current-user owned rows', () => {
    const enabled = () => true;
    const query = buildAiSessionQuery(['solo-1', 'shared-1'], enabled as any) as Record<string, any>;

    expect(query.reminders.createdBy).toEqual({});
    expect(query.tasks.createdBy).toEqual({});
    expect(query.tasks.list).toEqual({ couple: {}, createdBy: {} });
    expect(query.taskLists.createdBy).toEqual({});
    expect(query.events.createdBy).toEqual({});
    expect(query.checkIns.author).toEqual({});
    expect(query.plans.createdBy).toEqual({});
    expect(query.journalEntries.author).toEqual({});
    expect(query.timetables.createdBy).toEqual({});
    expect(query.timetableItems.timetable).toEqual({ couple: {}, createdBy: {} });

    const records = buildAiSessionRecords(
      {
        reminders: [
          { id: 'personal-partner-reminder', couple: { id: 'solo-1' }, createdBy: { id: 'partner-1' } },
          { id: 'personal-self-reminder', couple: { id: 'solo-1' }, createdBy: { id: 'user-1' } },
          { id: 'shared-partner-reminder', couple: { id: 'shared-1' }, createdBy: { id: 'partner-1' } },
        ],
        taskLists: [
          { id: 'personal-partner-list', couple: { id: 'solo-1' }, createdBy: { id: 'partner-1' } },
          { id: 'personal-self-list', couple: { id: 'solo-1' }, createdBy: { id: 'user-1' } },
          { id: 'shared-partner-list', couple: { id: 'shared-1' }, createdBy: { id: 'partner-1' } },
        ],
        tasks: [
          {
            id: 'personal-partner-task',
            couple: { id: 'solo-1' },
            createdBy: { id: 'partner-1' },
            list: { id: 'personal-self-list', couple: { id: 'solo-1' }, createdBy: { id: 'user-1' } },
          },
          {
            id: 'personal-self-task',
            couple: { id: 'solo-1' },
            createdBy: { id: 'user-1' },
            list: { id: 'personal-self-list', couple: { id: 'solo-1' }, createdBy: { id: 'user-1' } },
          },
          {
            id: 'shared-partner-task',
            couple: { id: 'shared-1' },
            createdBy: { id: 'partner-1' },
            list: { id: 'shared-partner-list', couple: { id: 'shared-1' }, createdBy: { id: 'partner-1' } },
          },
        ],
        plans: [
          { id: 'personal-partner-plan', couple: { id: 'solo-1' }, createdBy: { id: 'partner-1' } },
          { id: 'personal-self-plan', couple: { id: 'solo-1' }, createdBy: { id: 'user-1' } },
          { id: 'shared-partner-plan', couple: { id: 'shared-1' }, createdBy: { id: 'partner-1' } },
        ],
        journalEntries: [
          { id: 'personal-partner-entry', couple: { id: 'solo-1' }, author: { id: 'partner-1' } },
          { id: 'personal-self-entry', couple: { id: 'solo-1' }, author: { id: 'user-1' } },
          { id: 'shared-partner-entry', couple: { id: 'shared-1' }, author: { id: 'partner-1' } },
        ],
        timetables: [
          { id: 'personal-partner-timetable', couple: { id: 'solo-1' }, createdBy: { id: 'partner-1' } },
          { id: 'personal-self-timetable', couple: { id: 'solo-1' }, createdBy: { id: 'user-1' } },
          { id: 'shared-partner-timetable', couple: { id: 'shared-1' }, createdBy: { id: 'partner-1' } },
        ],
        timetableItems: [
          {
            id: 'personal-partner-block',
            couple: { id: 'solo-1' },
            timetable: { id: 'personal-partner-timetable', couple: { id: 'solo-1' }, createdBy: { id: 'partner-1' } },
          },
          {
            id: 'personal-self-block',
            couple: { id: 'solo-1' },
            timetable: { id: 'personal-self-timetable', couple: { id: 'solo-1' }, createdBy: { id: 'user-1' } },
          },
          {
            id: 'shared-partner-block',
            couple: { id: 'shared-1' },
            timetable: { id: 'shared-partner-timetable', couple: { id: 'shared-1' }, createdBy: { id: 'partner-1' } },
          },
        ],
      } as any,
      enabled as any,
      { personalSpaceId: 'solo-1', userId: 'user-1' },
    );

    expect(records.reminders?.map((record) => record.id)).toEqual(['personal-self-reminder', 'shared-partner-reminder']);
    expect(records.taskLists?.map((record) => record.id)).toEqual(['personal-self-list', 'shared-partner-list']);
    expect(records.tasks?.map((record) => record.id)).toEqual(['personal-self-task', 'shared-partner-task']);
    expect(records.plans?.map((record) => record.id)).toEqual(['personal-self-plan', 'shared-partner-plan']);
    expect(records.journalEntries?.map((record) => record.id)).toEqual(['personal-self-entry', 'shared-partner-entry']);
    expect(records.timetables?.map((record) => record.id)).toEqual(['personal-self-timetable', 'shared-partner-timetable']);
    expect(records.timetableItems?.map((record) => record.id)).toEqual(['personal-self-block', 'shared-partner-block']);
    expect(buildAiTargetSpaceMap(records).plans).toEqual({
      'personal-self-plan': 'solo-1',
      'shared-partner-plan': 'shared-1',
    });
  });

  it('transcribes audio, plans locally, runs read tools, and previews mutations', async () => {
    const result = await processAiAudioTurn({
      audioUri: 'file:///dictation.m4a',
      contextPrompt: 'today: 2026-04-30',
      records: {
        tasks: [{ id: 'task-1', title: 'Dinner plan', isCompleted: false }],
      },
      transcriptionAdapter: {
        transcribeFile: async (audioUri) => `transcribed ${audioUri}`,
      },
      planningAdapter: {
        plan: async (messages) => {
          expect(messages[0].content).toContain('today: 2026-04-30');
          expect(messages[1].content).toBe('transcribed file:///dictation.m4a');
          return [
            {
              id: 'read-tasks',
              domain: 'tasks',
              operation: 'read',
              input: { query: 'dinner' },
            },
            {
              id: 'create-task',
              domain: 'tasks',
              operation: 'create',
              input: { title: 'Buy flowers', listId: 'list-1' },
            },
          ];
        },
      },
    });

    expect(result.transcript).toBe('transcribed file:///dictation.m4a');
    expect(result.readResults).toHaveLength(1);
    expect(result.actionDrafts).toMatchObject([
      {
        id: 'draft-create-task',
        domain: 'tasks',
        operation: 'create',
        summary: 'Buy flowers',
      },
    ]);
    expect(result.assistantMessage).toContain('review');
  });

  it('filters planner tool calls to enabled assistant domains before reads and mutations', async () => {
    const result = await processAiAudioTurn({
      audioUri: 'file:///dictation.m4a',
      contextPrompt: 'today: 2026-04-30',
      allowedDomains: ['tasks'],
      records: {
        tasks: [{ id: 'task-1', title: 'Dinner plan' }],
        reminders: [{ id: 'reminder-1', title: 'Disabled reminder' }],
      },
      transcriptionAdapter: {
        transcribeFile: async () => 'find dinner and remind me',
      },
      planningAdapter: {
        plan: async () => [
          {
            id: 'read-tasks',
            domain: 'tasks',
            operation: 'read',
            input: { query: 'dinner' },
          },
          {
            id: 'create-reminder',
            domain: 'reminders',
            operation: 'create',
            input: { title: 'Disabled reminder', dueAt: 1777572000000 },
          },
        ],
      },
    });

    expect(result.toolCalls.map((call) => call.domain)).toEqual(['tasks']);
    expect(result.readResults).toHaveLength(1);
    expect(result.actionDrafts).toHaveLength(0);
    expect(result.assistantMessage).toContain('Found 1 tasks record');
  });

  it('drops disabled domains before creating assistant action drafts', () => {
    const calls = [
      parseAiToolCall({
        id: 'create-task',
        domain: 'tasks',
        operation: 'create',
        input: { title: 'Buy flowers', listId: 'list-1' },
      }),
      parseAiToolCall({
        id: 'create-reminder',
        domain: 'reminders',
        operation: 'create',
        input: { title: 'Disabled reminder', dueAt: 1777572000000 },
      }),
    ];

    expect(filterToolCallsForAllowedDomains(calls, ['tasks']).map((call) => call.id)).toEqual([
      'create-task',
    ]);
  });

  it('applies confirmed action drafts through a mutation adapter', async () => {
    const draft = buildActionDraft(
      parseAiToolCall({
        id: 'create-plan',
        domain: 'plans',
        operation: 'create',
        input: { title: 'Plan trip' },
      }),
      { now: 1777572000000 },
    );
    const applied: unknown[] = [];

    const result = await confirmAiActionDrafts([draft], {
      coupleId: 'space-1',
      userId: 'user-1',
      now: 1777572000000,
      idFactory: () => 'plan-1',
      applyMutationPlan: async (plan) => {
        applied.push(plan);
      },
    });

    expect(result).toEqual({
      ok: true,
      message: 'Applied 1 Pacto AI action.',
      plans: [
        {
          domain: 'plans',
          entity: 'plans',
          operation: 'create',
          targetId: 'plan-1',
          data: {
            title: 'Plan trip',
            status: 'active',
            priority: 0,
            createdAt: 1777572000000,
            updatedAt: 1777572000000,
          },
          links: {
            couple: 'space-1',
            createdBy: 'user-1',
          },
          unlinks: {},
        },
      ],
    });
    expect(applied).toEqual(result.plans);
  });

  it('polishes memory drafts through an explicit local completion adapter', async () => {
    const seenMessages: unknown[] = [];
    let disposed = false;

    const result = await polishDraft('  we made soup and talked for ages  ', {
      complete: async (messages) => {
        seenMessages.push(...messages);
        return '"We made soup, stayed at the table, and kept talking."';
      },
      dispose: async () => {
        disposed = true;
      },
    });

    expect(result).toBe('We made soup, stayed at the table, and kept talking.');
    expect(seenMessages).toMatchObject([
      { role: 'system' },
      { role: 'user', content: 'we made soup and talked for ages' },
    ]);
    expect(disposed).toBe(false);
  });

  it('keeps the original memory draft when polish returns empty output', async () => {
    await expect(
      polishDraft('Original text', {
        complete: async () => '   ',
      }),
    ).resolves.toBe('Original text');
  });
});
