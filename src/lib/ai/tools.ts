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

const unknownRecordSchema = z.record(z.string(), z.unknown());
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Use YYYY-MM-DD dates');
const optionalText = z.string().min(1).nullable().optional();
const optionalNumber = z.number().finite().nullable().optional();
const optionalBoolean = z.boolean().nullable().optional();

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
  dueAt: z.number().int().nonnegative(),
  recurrence: optionalText,
  priority: z.number().int().min(0).max(5).optional(),
  category: optionalText,
  assignedTo: optionalText,
});

const taskSchema = z.object({
  title: z.string().min(1),
  notes: optionalText,
  category: optionalText,
  dueDate: dateKeySchema.nullable().optional(),
  priority: z.number().int().min(0).max(5).optional(),
  sortOrder: z.number().int().min(0).optional(),
  assignedTo: optionalText,
  listId: optionalText,
});

const taskListSchema = z.object({
  name: z.string().min(1),
  icon: optionalText,
  colorKey: optionalText,
  category: optionalText,
});

const eventSchema = z.object({
  title: z.string().min(1),
  description: optionalText,
  startsAt: z.number().int().nonnegative(),
  endsAt: z.number().int().nonnegative().nullable().optional(),
  priority: z.number().int().min(0).max(5).optional(),
  isPrivate: optionalBoolean,
});

const loveNoteSchema = z.object({
  body: z.string().min(1),
  isPrivate: optionalBoolean,
  vibe: optionalText,
});

const checkInSchema = z.object({
  mood: optionalText,
  note: optionalText,
  isPrivate: optionalBoolean,
  checkInDate: dateKeySchema,
});

const wishlistSchema = z.object({
  name: z.string().min(1),
  icon: optionalText,
  color: optionalText,
});

const wishlistItemSchema = z.object({
  title: z.string().min(1),
  description: optionalText,
  url: optionalText,
  price: optionalNumber,
  currency: optionalText,
  tag: optionalText,
  isPurchased: optionalBoolean,
  priority: z.number().int().min(0).max(5).optional(),
  sortOrder: z.number().int().min(0).optional(),
  wishlistId: optionalText,
  purchasedBy: optionalText,
});

const milestoneSchema = z.object({
  title: z.string().min(1),
  description: optionalText,
  date: dateKeySchema,
  icon: optionalText,
  color: optionalText,
  repeatYearly: optionalBoolean,
  quote: optionalText,
});

const planSchema = z.object({
  title: z.string().min(1),
  description: optionalText,
  notes: optionalText,
  category: optionalText,
  targetDate: dateKeySchema.nullable().optional(),
  budget: optionalNumber,
  status: optionalText,
  priority: z.number().int().min(0).max(5).optional(),
  isPrivate: optionalBoolean,
  icon: optionalText,
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
  template: optionalText,
  share: optionalText,
});

const timetableItemSchema = z.object({
  title: z.string().min(1),
  category: optionalText,
  icon: optionalText,
  color: optionalText,
  ink: optionalText,
  day: z.number().int().min(0).max(6).nullable().optional(),
  startHour: z.number().min(0).max(24).nullable().optional(),
  duration: z.number().positive().nullable().optional(),
  who: optionalText,
  repeat: optionalText,
  star: optionalBoolean,
  timetableId: optionalText,
});

type DomainConfig = {
  domain: AiDomain;
  entity: AiDomain;
  singular: string;
  createSchema: z.ZodObject<any>;
  creatorLink?: string;
  relationInputs?: Record<string, string>;
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
  loveNotes: {
    domain: 'loveNotes',
    entity: 'loveNotes',
    singular: 'love note',
    createSchema: loveNoteSchema,
    creatorLink: 'author',
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
  wishlists: {
    domain: 'wishlists',
    entity: 'wishlists',
    singular: 'wishlist',
    createSchema: wishlistSchema,
    creatorLink: 'createdBy',
    defaults: (_input, ctx) => ({ createdAt: ctx.now, updatedAt: ctx.now }),
  },
  wishlistItems: {
    domain: 'wishlistItems',
    entity: 'wishlistItems',
    singular: 'wishlist item',
    createSchema: wishlistItemSchema,
    creatorLink: 'addedBy',
    relationInputs: { wishlistId: 'wishlist', purchasedBy: 'purchasedBy' },
    defaults: (input, ctx) => ({
      isPurchased: input.isPurchased ?? false,
      priority: input.priority ?? 0,
      sortOrder: input.sortOrder ?? ctx.sortOrder ?? 0,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    }),
  },
  milestones: {
    domain: 'milestones',
    entity: 'milestones',
    singular: 'milestone',
    createSchema: milestoneSchema,
    creatorLink: 'createdBy',
    defaults: (_input, ctx) => ({ repeatYearly: false, createdAt: ctx.now, updatedAt: ctx.now }),
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

  return {
    id: call.id ?? `${call.domain}-${call.operation}-${Date.now()}`,
    domain: call.domain,
    operation: call.operation,
    targetId: call.targetId,
    input: stripUndefined(input.data),
    confidence: call.confidence,
  };
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

  const input = draft.toolCall.input;
  const data =
    operation === 'delete'
      ? {}
      : stripUndefined({
          ...stripRelationInputs(input, config.relationInputs),
          ...(operation === 'create' ? config.defaults?.(input, ctx) : { updatedAt: ctx.now }),
        });

  return {
    domain: draft.domain,
    entity: config.entity,
    operation,
    targetId,
    data,
    links: operation === 'create' ? buildCreateLinks(input, config, ctx) : buildRelationLinks(input, config),
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
  if (operation === 'create') return createSchema;

  return createSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Update input must contain at least one field',
  });
}

function buildCreateLinks(input: Record<string, unknown>, config: DomainConfig, ctx: AiMutationContext) {
  return {
    couple: ctx.coupleId,
    ...(config.creatorLink ? { [config.creatorLink]: ctx.userId } : {}),
    ...buildRelationLinks(input, config),
  };
}

function buildRelationLinks(input: Record<string, unknown>, config: DomainConfig) {
  const links: Record<string, string> = {};
  for (const [inputKey, linkName] of Object.entries(config.relationInputs ?? {})) {
    const value = input[inputKey];
    if (typeof value === 'string' && value.length > 0) {
      links[linkName] = value;
    }
  }
  return links;
}

function stripRelationInputs(
  input: Record<string, unknown>,
  relationInputs: Record<string, string> | undefined,
) {
  if (!relationInputs) return input;
  const output = { ...input };
  for (const key of Object.keys(relationInputs)) {
    delete output[key];
  }
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
