import { z } from 'zod';
import type {
  AiActionDraft,
  AiDomain,
  AiMutationContext,
  AiMutationPlan,
  AiToolCall,
  AiToolOperation,
  AiToolResult,
} from './types';
import { AI_DOMAINS } from './types';
import { PRIORITY_MAX, PRIORITY_MIN } from '@/src/lib/priority';

const unknownRecordSchema = z.record(z.string(), z.unknown());
const dateKeySchema = z.string().refine(isValidDateKey, 'Use a real YYYY-MM-DD date');
const timestampSchema = z.number().int().nonnegative().refine(isValidTimestampMs, 'Use a valid timestamp');
const optionalText = z.string().min(1).nullable().optional();
const optionalNumber = z.number().finite().nullable().optional();
const optionalBoolean = z.boolean().nullable().optional();
const optionalScope = z.enum(['personal', 'shared']).optional();
const reminderRecurrenceSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional();
const planStatusSchema = z.enum(['active', 'planning', 'done', 'paused']).optional();
const pastelKeySchema = z.enum(['peach', 'mint', 'butter', 'rose', 'sky', 'lavender', 'gold', 'journal']).optional();
const prioritySchema = z.number().int().min(PRIORITY_MIN).max(PRIORITY_MAX).optional();
const timetableTemplateSchema = z.enum(['meals', 'workout', 'study', 'routine', 'sleep', 'custom']).optional();
const timetableShareSchema = z.enum(['solo', 'partner', 'shared']).optional();
const timetableItemDaySchema = z.number().int().min(0).max(6);
const timetableItemStartHourSchema = z.number().min(0).lt(24);
const timetableItemDurationSchema = z.number().positive().max(24 * 60);

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidTimestampMs(value: number): boolean {
  return Number.isFinite(new Date(value).getTime());
}

const readInputSchema = z
  .object({
    query: z.string().optional(),
    limit: z.number().int().min(1).max(25).optional(),
    filters: unknownRecordSchema.optional(),
  })
  .passthrough();

const reminderSchema = z.object({
  title: z.string().min(1),
  description: optionalText,
  dueAt: timestampSchema,
  recurrence: reminderRecurrenceSchema,
  priority: prioritySchema,
  category: optionalText,
  assignedTo: optionalText,
  scope: optionalScope,
});

const taskSchema = z.object({
  title: z.string().min(1),
  notes: optionalText,
  category: optionalText,
  dueDate: dateKeySchema.nullable().optional(),
  priority: prioritySchema,
  sortOrder: z.number().int().min(0).optional(),
  assignedTo: optionalText,
  listId: optionalText,
  scope: optionalScope,
});
const taskCreateSchema = taskSchema.refine((value) => typeof value.listId === 'string' && value.listId.length > 0, {
  path: ['listId'],
  message: 'Task creates require listId so the task appears in a task list',
});
const taskUpdateSchema = taskSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Update input must contain at least one field',
    });
  }
  if (
    Object.prototype.hasOwnProperty.call(value, 'scope') &&
    !Object.prototype.hasOwnProperty.call(value, 'listId')
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['listId'],
      message: 'Task scope updates require listId because tasks inherit their space from the parent list',
    });
  }
});

const taskListSchema = z.object({
  name: z.string().min(1),
  colorKey: pastelKeySchema,
  category: optionalText,
  scope: optionalScope,
});
const taskListUpdateSchema = taskListSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Update input must contain at least one field',
    });
  }
  if (Object.prototype.hasOwnProperty.call(value, 'scope')) {
    ctx.addIssue({
      code: 'custom',
      path: ['scope'],
      message: 'Task-list scope updates must use the task-list sheet so child tasks move with the list',
    });
  }
});

const eventSchema = z.object({
  title: z.string().min(1),
  description: optionalText,
  startsAt: timestampSchema,
  endsAt: timestampSchema.nullable().optional(),
  priority: prioritySchema,
  isPrivate: optionalBoolean,
});

const checkInSchema = z.object({
  mood: optionalText,
  note: optionalText,
  isPrivate: optionalBoolean,
  checkInDate: dateKeySchema,
});

const planSchema = z.object({
  title: z.string().min(1),
  description: optionalText,
  notes: optionalText,
  category: optionalText,
  targetDate: dateKeySchema.nullable().optional(),
  budget: optionalNumber,
  status: planStatusSchema,
  priority: prioritySchema,
  isPrivate: optionalBoolean,
  color: optionalText,
  bucket: optionalText,
});

const journalEntrySchema = z.object({
  title: optionalText,
  body: z.string().min(1),
  mood: optionalText,
  isPrivate: optionalBoolean,
  mediaUrls: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  entryDate: dateKeySchema,
});

const timetableSchema = z.object({
  title: z.string().min(1),
  template: timetableTemplateSchema,
  share: timetableShareSchema,
});

const timetableItemSchema = z.object({
  title: z.string().min(1),
  category: optionalText,
  icon: optionalText,
  color: optionalText,
  ink: optionalText,
  day: timetableItemDaySchema.optional(),
  startHour: timetableItemStartHourSchema.optional(),
  duration: timetableItemDurationSchema.optional(),
  who: optionalText,
  repeat: optionalText,
  star: optionalBoolean,
  timetableId: optionalText,
});
const timetableItemCreateSchema = timetableItemSchema.superRefine((value, ctx) => {
  if (typeof value.timetableId !== 'string' || value.timetableId.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['timetableId'],
      message: 'Timetable item creates require timetableId so the block appears in a timetable',
    });
  }
  if (value.day === undefined || value.startHour === undefined || value.duration === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['schedule'],
      message: 'Timetable item creates require day, startHour, and duration',
    });
  }
});

type DomainConfig = {
  domain: AiDomain;
  entity: AiDomain;
  singular: string;
  createSchema: z.ZodObject<any>;
  creatorLink?: string;
  relationInputs?: Record<string, string>;
  spaceOwnerRelationInputs?: string[];
  defaults?: (input: Record<string, unknown>, ctx: AiMutationContext) => Record<string, unknown>;
};

const DOMAIN_CONFIGS: Record<AiDomain, DomainConfig> = {
  reminders: {
    domain: 'reminders',
    entity: 'reminders',
    singular: 'reminder',
    createSchema: reminderSchema,
    creatorLink: 'createdBy',
    relationInputs: { assignedTo: 'assignedTo' },
    defaults: (input, ctx) => ({
      isCompleted: false,
      priority: input.priority ?? 0,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    }),
  },
  tasks: {
    domain: 'tasks',
    entity: 'tasks',
    singular: 'task',
    createSchema: taskSchema,
    creatorLink: 'createdBy',
    relationInputs: { assignedTo: 'assignedTo', listId: 'list' },
    spaceOwnerRelationInputs: ['listId'],
    defaults: (input, ctx) => ({
      isCompleted: false,
      priority: input.priority ?? 0,
      sortOrder: input.sortOrder ?? ctx.sortOrder ?? 0,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    }),
  },
  taskLists: {
    domain: 'taskLists',
    entity: 'taskLists',
    singular: 'task list',
    createSchema: taskListSchema,
    creatorLink: 'createdBy',
    defaults: (_input, ctx) => ({ createdAt: ctx.now, updatedAt: ctx.now }),
  },
  events: {
    domain: 'events',
    entity: 'events',
    singular: 'calendar event',
    createSchema: eventSchema,
    creatorLink: 'createdBy',
    defaults: (_input, ctx) => ({ createdAt: ctx.now, updatedAt: ctx.now }),
  },
  checkIns: {
    domain: 'checkIns',
    entity: 'checkIns',
    singular: 'check-in',
    createSchema: checkInSchema,
    creatorLink: 'author',
    defaults: (_input, ctx) => ({ createdAt: ctx.now, updatedAt: ctx.now }),
  },
  plans: {
    domain: 'plans',
    entity: 'plans',
    singular: 'target',
    createSchema: planSchema,
    creatorLink: 'createdBy',
    defaults: (_input, ctx) => ({ status: 'active', priority: 0, createdAt: ctx.now, updatedAt: ctx.now }),
  },
  journalEntries: {
    domain: 'journalEntries',
    entity: 'journalEntries',
    singular: 'journal entry',
    createSchema: journalEntrySchema,
    creatorLink: 'author',
    defaults: (_input, ctx) => ({ createdAt: ctx.now, updatedAt: ctx.now }),
  },
  timetables: {
    domain: 'timetables',
    entity: 'timetables',
    singular: 'timetable',
    createSchema: timetableSchema,
    creatorLink: 'createdBy',
    defaults: (_input, ctx) => ({ createdAt: ctx.now, updatedAt: ctx.now }),
  },
  timetableItems: {
    domain: 'timetableItems',
    entity: 'timetableItems',
    singular: 'timetable item',
    createSchema: timetableItemSchema,
    relationInputs: { timetableId: 'timetable' },
    spaceOwnerRelationInputs: ['timetableId'],
    defaults: (_input, ctx) => ({ createdAt: ctx.now, updatedAt: ctx.now }),
  },
};

const aiToolCallEnvelopeSchema = z.object({
  id: z.string().min(1).optional(),
  domain: z.enum(AI_DOMAINS),
  operation: z.enum(['read', 'create', 'update', 'delete']),
  targetId: z.string().min(1).optional(),
  input: unknownRecordSchema.optional().default({}),
  confidence: z.number().min(0).max(1).optional(),
});

export function parseAiToolCall(raw: unknown): AiToolCall {
  const parsed = aiToolCallEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid AI tool call: ${formatZodError(parsed.error)}`);
  }

  const call = parsed.data;
  if ((call.operation === 'update' || call.operation === 'delete') && !call.targetId) {
    throw new Error(`Invalid AI tool call: ${call.operation} requires targetId`);
  }

  const inputSchema = getInputSchema(call.domain, call.operation);
  const input = inputSchema.safeParse(call.input);
  if (!input.success) {
    throw new Error(`Invalid ${call.domain} ${call.operation} input: ${formatZodError(input.error)}`);
  }
  assertValidParsedToolInput(call.domain, call.operation, input.data);

  return {
    id: call.id ?? `${call.domain}-${call.operation}-${Date.now()}`,
    domain: call.domain,
    operation: call.operation,
    targetId: call.targetId,
    input: stripUndefined(input.data),
    confidence: call.confidence,
  };
}

function assertValidParsedToolInput(
  domain: AiDomain,
  operation: AiToolOperation,
  input: Record<string, unknown>,
) {
  if (operation === 'delete') return;
  if (
    domain === 'events' &&
    typeof input.startsAt === 'number' &&
    typeof input.endsAt === 'number' &&
    input.endsAt < input.startsAt
  ) {
    throw new Error('Invalid events input: endsAt must be after startsAt');
  }
}

export function buildActionDraft(toolCall: AiToolCall, options: { now?: number } = {}): AiActionDraft {
  if (toolCall.operation === 'read') {
    throw new Error('Read-only tool calls do not require action drafts');
  }

  const now = options.now ?? Date.now();
  const config = DOMAIN_CONFIGS[toolCall.domain];
  return {
    id: `draft-${toolCall.id}`,
    domain: toolCall.domain,
    operation: toolCall.operation,
    title: `${verbFor(toolCall.operation)} ${config.singular}`,
    summary: summarizeInput(toolCall),
    destructive: toolCall.operation === 'delete',
    requiresConfirmation: true,
    toolCall,
    createdAt: now,
  };
}

export function buildMutationPlan(draft: AiActionDraft, ctx: AiMutationContext): AiMutationPlan {
  if (!ctx.confirmed) {
    throw new Error('Cannot build an InstantDB mutation plan without user confirmation');
  }

  const config = DOMAIN_CONFIGS[draft.domain];
  const operation = draft.operation;
  const targetId = operation === 'create' ? ctx.idFactory() : draft.toolCall.targetId;
  if (!targetId) {
    throw new Error(`${operation} ${draft.domain} requires targetId`);
  }
  assertExistingMutationTargetReadable(config, operation, targetId, ctx);

  const input = draft.toolCall.input;
  const links = operation === 'delete' ? {} : buildMutationLinks(input, config, ctx, operation, targetId);
  const data =
    operation === 'delete'
      ? {}
      : canonicalizeDataForTargetSpace(
          stripUndefined({
            ...stripRelationInputs(input, config.relationInputs),
            ...(operation === 'create' ? config.defaults?.(input, ctx) : { updatedAt: ctx.now }),
          }),
          config,
          links,
          ctx,
        );

  return {
    domain: draft.domain,
    entity: config.entity,
    operation,
    targetId,
    data,
    links,
    unlinks: {},
  };
}

export async function applyMutationPlan(
  adapter: { tx: Record<string, any>; transact: (txns: unknown[] | unknown) => Promise<void> },
  plan: AiMutationPlan,
) {
  const entityTx = adapter.tx[plan.entity][plan.targetId];
  let txn =
    plan.operation === 'delete'
      ? entityTx.delete()
      : entityTx.update(plan.data);

  if (Object.keys(plan.links).length > 0) {
    txn = txn.link(plan.links);
  }

  const txns: unknown[] = [txn];
  for (const [label, id] of Object.entries(plan.unlinks)) {
    txns.push(adapter.tx[plan.entity][plan.targetId].unlink({ [label]: id }));
  }

  await adapter.transact(txns.length === 1 ? txns[0] : txns);
}

export function runReadTool(
  toolCall: AiToolCall,
  records: unknown[],
): AiToolResult {
  if (toolCall.operation !== 'read') {
    throw new Error('runReadTool only accepts read operations');
  }

  const input = readInputSchema.parse(toolCall.input);
  const limit = input.limit ?? 8;
  const query = input.query?.trim().toLowerCase();
  const filtered = query
    ? records.filter((record) => JSON.stringify(record).toLowerCase().includes(query))
    : records;

  return {
    callId: toolCall.id,
    domain: toolCall.domain,
    operation: 'read',
    ok: true,
    message: `Found ${filtered.length} ${toolCall.domain} record${filtered.length === 1 ? '' : 's'}.`,
    records: filtered.slice(0, limit),
  };
}

function getInputSchema(domain: AiDomain, operation: AiToolOperation) {
  if (operation === 'read') return readInputSchema;
  if (operation === 'delete') return unknownRecordSchema;

  const createSchema = DOMAIN_CONFIGS[domain].createSchema;
  if (operation === 'create') {
    if (domain === 'tasks') return taskCreateSchema;
    if (domain === 'timetableItems') return timetableItemCreateSchema;
    return createSchema;
  }

  if (domain === 'tasks') return taskUpdateSchema;
  if (domain === 'taskLists') return taskListUpdateSchema;

  return createSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Update input must contain at least one field',
  });
}

function buildMutationLinks(
  input: Record<string, unknown>,
  config: DomainConfig,
  ctx: AiMutationContext,
  operation: AiToolOperation,
  targetId: string,
) {
  const links: Record<string, string> = {};
  const spaceId = resolveMutationSpaceId(input, config, ctx, operation);
  if (spaceId) {
    assertPersonalRelinkOwnership(input, config, ctx, operation, targetId, spaceId);
    links.couple = spaceId;
  }
  const relationSpaceId = links.couple ?? existingMutationTargetSpaceId(config, operation, targetId, ctx);
  if (operation === 'create' && config.creatorLink) {
    links[config.creatorLink] = ctx.userId;
  }
  for (const [inputKey, linkName] of Object.entries(config.relationInputs ?? {})) {
    const value = input[inputKey];
    if (typeof value === 'string' && value.length > 0) {
      if (linkName === 'assignedTo') {
        const assignedTo = assigneeForAiMutation(value, relationSpaceId, config, ctx);
        if (!assignedTo) continue;
        links[linkName] = assignedTo;
      } else {
        links[linkName] = value;
      }
    }
  }
  return links;
}

function assigneeForAiMutation(
  assignedTo: string,
  targetSpaceId: string | null | undefined,
  config: DomainConfig,
  ctx: AiMutationContext,
) {
  if (targetSpaceId && ctx.personalSpaceId && targetSpaceId === ctx.personalSpaceId && assignedTo !== ctx.userId) {
    return null;
  }
  const assignableUserIds = new Set([ctx.userId, ...(ctx.assignableUserIds ?? [])].filter(Boolean));
  if (!assignableUserIds.has(assignedTo)) {
    throw new Error(`Invalid ${config.singular} assignee`);
  }
  return assignedTo;
}

function existingMutationTargetSpaceId(
  config: DomainConfig,
  operation: AiToolOperation,
  targetId: string,
  ctx: AiMutationContext,
) {
  if (operation === 'create') return null;
  return ctx.targetSpaceById?.[config.domain]?.[targetId] ?? null;
}

function resolveMutationSpaceId(
  input: Record<string, unknown>,
  config: DomainConfig,
  ctx: AiMutationContext,
  operation: AiToolOperation,
) {
  if (operation === 'delete') return null;
  const relationSpaceId = resolveRelationSpaceId(input, config, ctx);
  if (relationSpaceId) return relationSpaceId;

  const canMoveByPrivacy =
    config.domain === 'events' ||
    config.domain === 'checkIns' ||
    config.domain === 'plans' ||
    config.domain === 'journalEntries';
  const canMoveByShare = config.domain === 'timetables';
  const canMoveByScope = config.domain === 'reminders' || config.domain === 'taskLists';
  const intent = mutationSpaceMoveIntent(input, {
    canMoveByPrivacy,
    canMoveByShare,
    canMoveByScope,
  });
  if (operation !== 'create' && !intent.hasMoveInput) return null;

  if (intent.wantsPersonal) {
    if (ctx.personalSpaceId) return ctx.personalSpaceId;
    if (ctx.sharedSpaceId) throw new Error('Personal space not available');
    return ctx.coupleId ?? null;
  }
  return ctx.sharedSpaceId ?? ctx.coupleId ?? ctx.personalSpaceId ?? null;
}

function assertPersonalRelinkOwnership(
  input: Record<string, unknown>,
  config: DomainConfig,
  ctx: AiMutationContext,
  operation: AiToolOperation,
  targetId: string,
  targetSpaceId: string,
) {
  if (operation !== 'update') return;
  if (!ctx.personalSpaceId || targetSpaceId !== ctx.personalSpaceId) return;
  const canMoveByPrivacy =
    config.domain === 'events' ||
    config.domain === 'checkIns' ||
    config.domain === 'plans' ||
    config.domain === 'journalEntries';
  const canMoveByShare = config.domain === 'timetables';
  const canMoveByScope = config.domain === 'reminders' || config.domain === 'taskLists';
  const intent = mutationSpaceMoveIntent(input, {
    canMoveByPrivacy,
    canMoveByShare,
    canMoveByScope,
  });
  if (!intent.wantsPersonal) return;

  const ownerId = ctx.targetOwnerById?.[config.domain]?.[targetId] ?? null;
  if (ownerId !== ctx.userId) {
    throw new Error(`Cannot move another member ${config.singular} into personal space`);
  }
}

function mutationSpaceMoveIntent(
  input: Record<string, unknown>,
  options: {
    canMoveByPrivacy: boolean;
    canMoveByShare: boolean;
    canMoveByScope: boolean;
  },
) {
  const hasPrivacy = options.canMoveByPrivacy && Object.prototype.hasOwnProperty.call(input, 'isPrivate');
  const hasShare = options.canMoveByShare && Object.prototype.hasOwnProperty.call(input, 'share');
  const hasScope = options.canMoveByScope && Object.prototype.hasOwnProperty.call(input, 'scope');
  return {
    hasMoveInput: hasPrivacy || hasShare || hasScope,
    wantsPersonal: input.isPrivate === true || input.share === 'solo' || input.scope === 'personal',
  };
}

function resolveRelationSpaceId(
  input: Record<string, unknown>,
  config: DomainConfig,
  ctx: AiMutationContext,
) {
  for (const inputKey of config.spaceOwnerRelationInputs ?? []) {
    const value = input[inputKey];
    if (typeof value !== 'string' || value.length === 0) continue;
    const spaceId = ctx.relationSpaceById?.[value];
    if (typeof spaceId === 'string' && spaceId.length > 0) {
      return spaceId;
    }
    throw new Error(`${parentRelationName(inputKey)} not found`);
  }
  return null;
}

function parentRelationName(inputKey: string) {
  if (inputKey === 'listId') return 'parent list';
  if (inputKey === 'timetableId') return 'parent timetable';
  return 'parent record';
}

function canonicalizeDataForTargetSpace(
  data: Record<string, unknown>,
  config: DomainConfig,
  links: Record<string, string>,
  ctx: AiMutationContext,
) {
  const targetSpaceId = links.couple;
  if (!targetSpaceId || !ctx.personalSpaceId || targetSpaceId !== ctx.personalSpaceId) {
    return data;
  }

  if (
    config.domain === 'events' ||
    config.domain === 'checkIns' ||
    config.domain === 'plans' ||
    config.domain === 'journalEntries'
  ) {
    return { ...data, isPrivate: true };
  }

  if (config.domain === 'timetables') {
    return { ...data, share: 'solo' };
  }

  return data;
}

function assertExistingMutationTargetReadable(
  config: DomainConfig,
  operation: AiToolOperation,
  targetId: string,
  ctx: AiMutationContext,
) {
  if (operation === 'create') return;
  const targetSpaceId = ctx.targetSpaceById?.[config.domain]?.[targetId] ?? null;
  const readableSpaceIds = uniqueMutationSpaceIds([
    ctx.personalSpaceId,
    ctx.sharedSpaceId,
    ctx.coupleId,
  ]);
  if (!targetSpaceId || !readableSpaceIds.includes(targetSpaceId)) {
    throw new Error(`${config.singular} not found`);
  }
}

function uniqueMutationSpaceIds(ids: Array<string | null | undefined>) {
  return ids.filter((value, index, all): value is string =>
    typeof value === 'string' &&
    value.length > 0 &&
    all.indexOf(value) === index,
  );
}

function stripRelationInputs(
  input: Record<string, unknown>,
  relationInputs: Record<string, string> | undefined,
) {
  const output = { ...input };
  for (const key of Object.keys(relationInputs ?? {})) {
    delete output[key];
  }
  delete output.scope;
  return output;
}

function stripUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter((entry: [string, unknown]) => {
      const value = entry[1];
      return value !== undefined && value !== null;
    }),
  );
}

function summarizeInput(toolCall: AiToolCall) {
  if (toolCall.operation === 'delete') {
    return toolCall.targetId ?? `${toolCall.domain} item`;
  }
  const input = toolCall.input;
  const preferred =
    input.title ??
    input.name ??
    input.body ??
    input.note ??
    input.mood ??
    toolCall.targetId ??
    `${toolCall.domain} item`;
  const text = String(preferred);
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

function verbFor(operation: Exclude<AiToolOperation, 'read'>) {
  if (operation === 'create') return 'Create';
  if (operation === 'update') return 'Update';
  return 'Delete';
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'value'} ${issue.message}`)
    .join('; ');
}
