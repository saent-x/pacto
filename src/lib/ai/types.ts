export const AI_DOMAINS = [
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
] as const;

export type AiDomain = (typeof AI_DOMAINS)[number];

export type AiModelPackType = 'speechToText' | 'llm';
export type AiModelPackStatus =
  | 'notDownloaded'
  | 'downloading'
  | 'downloaded'
  | 'verifying'
  | 'ready'
  | 'error';

export type AiModelPack = {
  id: string;
  type: AiModelPackType;
  runtime: 'whisper.rn' | 'llama.rn';
  displayName: string;
  filename: string;
  downloadUrl: string;
  sizeBytes: number;
  checksumSha256: string;
  delivery: 'downloadAfterInstall';
  status: AiModelPackStatus;
  recommended: boolean;
  notes?: string;
  localUri?: string;
};

export type AiAssistantState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'awaitingConfirmation'
  | 'applying'
  | 'complete'
  | 'error';

export type AiToolOperation = 'read' | 'create' | 'update' | 'delete';

export type AiToolCall = {
  id: string;
  domain: AiDomain;
  operation: AiToolOperation;
  targetId?: string;
  input: Record<string, unknown>;
  confidence?: number;
};

export type AiAssistantMessage = {
  id: string;
  from: 'assistant' | 'user' | 'system';
  body: string;
  createdAt: number;
};

export type AiActionDraft = {
  id: string;
  domain: AiDomain;
  operation: Exclude<AiToolOperation, 'read'>;
  title: string;
  summary: string;
  destructive: boolean;
  requiresConfirmation: true;
  toolCall: AiToolCall;
  createdAt: number;
};

export type AiToolResult = {
  callId: string;
  domain: AiDomain;
  operation: AiToolOperation;
  ok: boolean;
  message: string;
  records?: unknown[];
  mutationPlan?: AiMutationPlan;
  error?: string;
};

export type AiTurn = {
  id: string;
  state: AiAssistantState;
  transcript: string | null;
  messages: AiAssistantMessage[];
  pendingActions: AiActionDraft[];
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

export type AiMutationPlan = {
  domain: AiDomain;
  entity: AiDomain;
  operation: Exclude<AiToolOperation, 'read'>;
  targetId: string;
  data: Record<string, unknown>;
  links: Record<string, string>;
  unlinks: Record<string, string>;
};

export type AiMutationContext = {
  confirmed: boolean;
  coupleId: string;
  userId: string;
  now: number;
  idFactory: () => string;
  sortOrder?: number;
};
