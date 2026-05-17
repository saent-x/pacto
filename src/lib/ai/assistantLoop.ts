import type { AiActionDraft, AiDomain, AiMutationContext, AiMutationPlan, AiToolCall, AiToolResult } from './types';
import type { AiPlanningAdapter, AiTranscriptionAdapter } from './runtime';
import { buildActionDraft, buildMutationPlan, parseAiToolCall, runReadTool } from './tools';

export type ProcessAiAudioTurnInput = {
  audioUri: string;
  contextPrompt: string;
  records?: Partial<Record<AiDomain, unknown[]>>;
  allowedDomains?: readonly AiDomain[];
  transcriptionAdapter: AiTranscriptionAdapter;
  planningAdapter: AiPlanningAdapter;
};

export type ProcessAiAudioTurnResult = {
  transcript: string;
  toolCalls: AiToolCall[];
  readResults: AiToolResult[];
  actionDrafts: AiActionDraft[];
  assistantMessage: string;
};

export async function processAiAudioTurn({
  audioUri,
  contextPrompt,
  records = {},
  allowedDomains,
  transcriptionAdapter,
  planningAdapter,
}: ProcessAiAudioTurnInput): Promise<ProcessAiAudioTurnResult> {
  const transcript = await transcriptionAdapter.transcribeFile(audioUri);
  if (!transcript.trim()) {
    throw new Error('I could not hear a request clearly. Please try again.');
  }

  const toolCalls = filterToolCallsForAllowedDomains((await planningAdapter.plan([
    {
      role: 'system',
      content: buildPlannerSystemPrompt(contextPrompt),
    },
    {
      role: 'user',
      content: transcript,
    },
  ])).map(parseAiToolCall), allowedDomains);

  const readResults = toolCalls
    .filter((call) => call.operation === 'read')
    .map((call) => runReadTool(call, records[call.domain] ?? []));

  const actionDrafts = toolCalls
    .filter((call) => call.operation !== 'read')
    .map((call) => buildActionDraft(call));

  return {
    transcript,
    toolCalls,
    readResults,
    actionDrafts,
    assistantMessage: buildAssistantMessage(readResults, actionDrafts),
  };
}

export function filterToolCallsForAllowedDomains(
  toolCalls: AiToolCall[],
  allowedDomains?: readonly AiDomain[],
): AiToolCall[] {
  if (!allowedDomains) return toolCalls;
  const allowed = new Set<AiDomain>(allowedDomains);
  return toolCalls.filter((call) => allowed.has(call.domain));
}

export type ConfirmAiActionDraftsContext = Omit<AiMutationContext, 'confirmed'> & {
  applyMutationPlan: (plan: AiMutationPlan) => Promise<void>;
};

export async function confirmAiActionDrafts(
  drafts: AiActionDraft[],
  ctx: ConfirmAiActionDraftsContext,
) {
  const plans = drafts.map((draft) =>
    buildMutationPlan(draft, {
      ...ctx,
      confirmed: true,
    }),
  );

  for (const plan of plans) {
    await ctx.applyMutationPlan(plan);
  }

  return {
    ok: true,
    message: `Applied ${plans.length} Pacto AI action${plans.length === 1 ? '' : 's'}.`,
    plans,
  };
}

function buildPlannerSystemPrompt(contextPrompt: string) {
  return [
    'You are Pacto AI. You run fully on-device.',
    'Return only constrained tool calls for app data operations.',
    'Read operations may run automatically. Create, update, and delete operations must be previewed before confirmation.',
    contextPrompt,
  ].join('\n\n');
}

function buildAssistantMessage(readResults: AiToolResult[], actionDrafts: AiActionDraft[]) {
  if (actionDrafts.length > 0) {
    return `I prepared ${actionDrafts.length} action${actionDrafts.length === 1 ? '' : 's'} for review.`;
  }
  if (readResults.length > 0) {
    return readResults.map((result) => result.message).join('\n');
  }
  return 'I understood the request, but no app action was needed.';
}
