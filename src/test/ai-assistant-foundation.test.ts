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
  buildAiSessionQuery,
  buildAiSessionRecords,
} from '@/src/lib/ai/sessionProvider';

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
      'loveNotes',
      'checkIns',
      'wishlists',
      'wishlistItems',
      'milestones',
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
      },
    });
    const draft = buildActionDraft(toolCall, { now: 1777572000000 });

    expect(
      buildMutationPlan(draft, {
        confirmed: true,
        coupleId: 'space-1',
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
      },
      unlinks: {},
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

  it('limits assistant session queries and prompt records to enabled features', () => {
    const enabled = (featureId: string) => ['tasks', 'calendar'].includes(featureId);
    const query = buildAiSessionQuery('space-1', enabled as any) as Record<string, any>;

    expect(Object.keys(query).sort()).toEqual(['events', 'taskLists', 'tasks']);
    expect(query.tasks.$.where).toEqual({ 'couple.id': 'space-1' });
    expect(query.events.$.where).toEqual({ 'couple.id': 'space-1' });
    expect(query.reminders).toBeUndefined();
    expect(query.loveNotes).toBeUndefined();

    const records = buildAiSessionRecords(
      {
        tasks: [{ id: 'task-1' }],
        events: [{ id: 'event-1' }],
        reminders: [{ id: 'reminder-1' }],
      } as any,
      enabled as any,
    );

    expect(records).toEqual({
      tasks: [{ id: 'task-1' }],
      taskLists: [],
      events: [{ id: 'event-1' }],
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
              input: { title: 'Buy flowers' },
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
        input: { title: 'Buy flowers' },
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
        id: 'create-note',
        domain: 'loveNotes',
        operation: 'create',
        input: { body: 'I love you' },
      }),
      { now: 1777572000000 },
    );
    const applied: unknown[] = [];

    const result = await confirmAiActionDrafts([draft], {
      coupleId: 'space-1',
      userId: 'user-1',
      now: 1777572000000,
      idFactory: () => 'note-1',
      applyMutationPlan: async (plan) => {
        applied.push(plan);
      },
    });

    expect(result).toEqual({
      ok: true,
      message: 'Applied 1 Pacto AI action.',
      plans: [
        {
          domain: 'loveNotes',
          entity: 'loveNotes',
          operation: 'create',
          targetId: 'note-1',
          data: {
            body: 'I love you',
            createdAt: 1777572000000,
            updatedAt: 1777572000000,
          },
          links: {
            couple: 'space-1',
            author: 'user-1',
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
