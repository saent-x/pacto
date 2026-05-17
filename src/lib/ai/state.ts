import type { AiActionDraft, AiAssistantMessage, AiAssistantState, AiTurn } from './types';

export type AiAssistantEvent =
  | { type: 'startRecording' }
  | { type: 'submitAudio' }
  | { type: 'transcriptionComplete'; transcript: string }
  | { type: 'thinking' }
  | { type: 'assistantMessage'; body: string }
  | { type: 'awaitConfirmation'; actions: AiActionDraft[] }
  | { type: 'applyConfirmedActions' }
  | { type: 'complete'; body?: string }
  | { type: 'error'; message: string }
  | { type: 'reset' };

export function createInitialAiTurn(id: string, now = Date.now()): AiTurn {
  return {
    id,
    state: 'idle',
    transcript: null,
    messages: [],
    pendingActions: [],
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function reduceAiTurn(turn: AiTurn, event: AiAssistantEvent): AiTurn {
  const now = Date.now();

  if (event.type === 'reset') {
    return createInitialAiTurn(turn.id, now);
  }

  if (event.type === 'assistantMessage') {
    return {
      ...turn,
      messages: [...turn.messages, createMessage('assistant', event.body, now)],
      updatedAt: now,
    };
  }

  if (event.type === 'complete') {
    const messages = event.body
      ? [...turn.messages, createMessage('assistant', event.body, now)]
      : turn.messages;
    return {
      ...turn,
      state: 'complete',
      messages,
      pendingActions: [],
      error: null,
      updatedAt: now,
    };
  }

  if (event.type === 'error') {
    return {
      ...turn,
      state: 'error',
      error: event.message,
      messages: [...turn.messages, createMessage('system', event.message, now)],
      updatedAt: now,
    };
  }

  if (event.type === 'transcriptionComplete') {
    return {
      ...turn,
      state: 'thinking',
      transcript: event.transcript,
      messages: [...turn.messages, createMessage('user', event.transcript, now)],
      error: null,
      updatedAt: now,
    };
  }

  if (event.type === 'awaitConfirmation') {
    return {
      ...turn,
      state: 'awaitingConfirmation',
      pendingActions: event.actions,
      error: null,
      updatedAt: now,
    };
  }

  const nextState = ({
    startRecording: 'recording',
    submitAudio: 'transcribing',
    thinking: 'thinking',
    applyConfirmedActions: 'applying',
  } as const)[event.type] satisfies AiAssistantState;

  return {
    ...turn,
    state: nextState,
    error: null,
    updatedAt: now,
  };
}

function createMessage(
  from: AiAssistantMessage['from'],
  body: string,
  createdAt: number,
): AiAssistantMessage {
  return {
    id: `${from}-${createdAt}-${body.length}`,
    from,
    body,
    createdAt,
  };
}
