import React, { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import { applyMutationPlan, buildActionDraft, parseAiToolCall } from './tools';
import {
  confirmAiActionDrafts,
  filterToolCallsForAllowedDomains,
  processAiAudioTurn,
} from './assistantLoop';
import { AI_MODEL_PACKS } from './modelRegistry';
import { getAiModelStorageStatus } from './modelManager';
import { createLlamaRnPlanningAdapter, createWhisperRnAdapter } from './runtime';
import { createInitialAiTurn, reduceAiTurn } from './state';
import type {
  AiActionDraft,
  AiDomain,
  AiTargetOwnerMap,
  AiTargetSpaceMap,
  AiToolCall,
  AiTurn,
} from './types';
import { getLocalAiDateKey } from './date';
import { db, id } from '@/src/lib/instant';

type AiAssistantContextValue = {
  turn: AiTurn;
  startVoiceTurn: () => void;
  processAudioRecording: (audioUri: string) => Promise<void>;
  submitTranscriptForPlanning: (transcript: string, toolCalls?: unknown[]) => void;
  queueActionDrafts: (toolCalls: unknown[]) => AiActionDraft[];
  confirmPendingActions: () => void;
  cancelPendingActions: () => void;
  resetAssistant: () => void;
};

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export function AiAssistantProvider({
  children,
  processAudioRecording,
  contextPrompt,
  records,
  allowedDomains,
  mutationContext,
}: {
  children: React.ReactNode;
  processAudioRecording?: (audioUri: string) => Promise<void>;
  contextPrompt?: string;
  records?: Partial<Record<AiDomain, unknown[]>>;
  allowedDomains?: readonly AiDomain[];
  mutationContext?: {
    coupleId: string | null;
    personalSpaceId?: string | null;
    sharedSpaceId?: string | null;
    assignableUserIds?: string[];
    relationSpaceById?: Record<string, string | null | undefined>;
    targetSpaceById?: AiTargetSpaceMap;
    targetOwnerById?: AiTargetOwnerMap;
    userId: string | null;
  };
}) {
  const [turn, dispatch] = useReducer(reduceAiTurn, undefined, () =>
    createInitialAiTurn(`turn-${Date.now()}`),
  );
  const confirmingRef = useRef(false);

  const startVoiceTurn = useCallback(() => {
    dispatch({ type: 'reset' });
    dispatch({ type: 'startRecording' });
  }, []);

  const queueActionDrafts = useCallback(
    (toolCalls: unknown[]) => {
      const parsedCalls = filterToolCallsForAllowedDomains(
        toolCalls.map(parseAiToolCall),
        allowedDomains,
      );
      const drafts = parsedCalls.map((call) => buildActionDraft(call));
      dispatch({ type: 'awaitConfirmation', actions: drafts });
      return drafts;
    },
    [allowedDomains],
  );

  const submitTranscriptForPlanning = useCallback(
    (transcript: string, toolCalls: unknown[] = []) => {
      dispatch({ type: 'transcriptionComplete', transcript });
      dispatch({ type: 'thinking' });
      const parsedCalls = filterToolCallsForAllowedDomains(
        toolCalls.map(parseAiToolCall),
        allowedDomains,
      );
      const readCalls = parsedCalls.filter((call) => call.operation === 'read');
      const mutationCalls = parsedCalls.filter(
        (call): call is AiToolCall & { operation: 'create' | 'update' | 'delete' } =>
          call.operation !== 'read',
      );

      if (mutationCalls.length > 0) {
        const drafts = mutationCalls.map((call) => buildActionDraft(call));
        dispatch({
          type: 'assistantMessage',
          body: 'I can do that after you confirm the preview.',
        });
        dispatch({ type: 'awaitConfirmation', actions: drafts });
        return;
      }

      dispatch({
        type: 'complete',
        body:
          readCalls.length > 0
            ? 'I found the matching information and will show it here.'
            : 'I heard you. The local model planner is ready for this request.',
      });
    },
    [allowedDomains],
  );

  const processRecording = useCallback(
    async (audioUri: string) => {
      if (processAudioRecording) {
        await processAudioRecording(audioUri);
        return;
      }

      dispatch({ type: 'submitAudio' });
      try {
        const result = await processAiAudioTurn({
          audioUri,
          contextPrompt: contextPrompt ?? buildDefaultContextPrompt(),
          records: records ?? {},
          allowedDomains,
          ...(await createDefaultLocalAdapters()),
        });
        dispatch({ type: 'transcriptionComplete', transcript: result.transcript });
        dispatch({ type: 'thinking' });
        if (result.assistantMessage) {
          dispatch({ type: 'assistantMessage', body: result.assistantMessage });
        }
        if (result.actionDrafts.length > 0) {
          dispatch({ type: 'awaitConfirmation', actions: result.actionDrafts });
        } else {
          dispatch({ type: 'complete' });
        }
      } catch (error) {
        dispatch({
          type: 'error',
          message: error instanceof Error ? error.message : 'Pacto AI could not process that recording.',
        });
      }
    },
    [allowedDomains, contextPrompt, processAudioRecording, records],
  );

  const confirmPendingActions = useCallback(() => {
    if (turn.pendingActions.length === 0) return;
    if (confirmingRef.current) return;
    const coupleId = mutationContext?.coupleId;
    const userId = mutationContext?.userId;
    if (!coupleId || !userId) {
      dispatch({ type: 'error', message: 'Pacto AI needs an active space before it can apply actions.' });
      return;
    }

    confirmingRef.current = true;
    dispatch({ type: 'applyConfirmedActions' });
    confirmAiActionDrafts(turn.pendingActions, {
      coupleId,
      personalSpaceId: mutationContext?.personalSpaceId ?? null,
      sharedSpaceId: mutationContext?.sharedSpaceId ?? null,
      assignableUserIds: mutationContext?.assignableUserIds,
      relationSpaceById: mutationContext?.relationSpaceById,
      targetSpaceById: mutationContext?.targetSpaceById,
      targetOwnerById: mutationContext?.targetOwnerById,
      userId,
      now: Date.now(),
      idFactory: id,
      applyMutationPlan: (plan) => applyMutationPlan(db as any, plan),
    })
      .then((result) => {
        dispatch({ type: 'complete', body: result.message });
      })
      .catch((error) => {
        dispatch({
          type: 'error',
          message: error instanceof Error ? error.message : 'Pacto AI could not apply those actions.',
        });
      })
      .finally(() => {
        confirmingRef.current = false;
      });
  }, [
    mutationContext?.coupleId,
    mutationContext?.personalSpaceId,
    mutationContext?.assignableUserIds,
    mutationContext?.relationSpaceById,
    mutationContext?.sharedSpaceId,
    mutationContext?.targetOwnerById,
    mutationContext?.targetSpaceById,
    mutationContext?.userId,
    turn.pendingActions,
  ]);

  const cancelPendingActions = useCallback(() => {
    dispatch({ type: 'complete', body: 'Cancelled.' });
  }, []);

  const resetAssistant = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const value = useMemo(
    () => ({
      turn,
      startVoiceTurn,
      processAudioRecording: processRecording,
      submitTranscriptForPlanning,
      queueActionDrafts,
      confirmPendingActions,
      cancelPendingActions,
      resetAssistant,
    }),
    [
      cancelPendingActions,
      confirmPendingActions,
      queueActionDrafts,
      resetAssistant,
      startVoiceTurn,
      processRecording,
      submitTranscriptForPlanning,
      turn,
    ],
  );

  return <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>;
}

async function createDefaultLocalAdapters() {
  const speechPack = AI_MODEL_PACKS.find((pack) => pack.id === 'whisper-tiny-en');
  const llmPack = AI_MODEL_PACKS.find((pack) => pack.id === 'qwen3-0.6b-instruct-q4');
  if (!speechPack || !llmPack) {
    throw new Error('Pacto AI model registry is incomplete.');
  }

  const [speechStatus, llmStatus] = await Promise.all([
    getAiModelStorageStatus(speechPack),
    getAiModelStorageStatus(llmPack),
  ]);
  if (speechStatus.status !== 'downloaded' || llmStatus.status !== 'downloaded') {
    throw new Error('AI setup required. Download the local voice and reasoning models before using Pacto AI.');
  }

  return {
    transcriptionAdapter: await createWhisperRnAdapter(speechStatus.localUri),
    planningAdapter: await createLlamaRnPlanningAdapter(llmStatus.localUri),
  };
}

function buildDefaultContextPrompt() {
  return [
    `today: ${getLocalAiDateKey()}`,
    `timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'}`,
    'records: use read tools for app data; do not assume unavailable records.',
  ].join('\n');
}

export function useAiAssistant() {
  const value = useContext(AiAssistantContext);
  if (!value) {
    throw new Error('useAiAssistant must be used inside AiAssistantProvider');
  }
  return value;
}
