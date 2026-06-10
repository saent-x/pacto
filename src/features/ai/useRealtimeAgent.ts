import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { RTCPeerConnection, RTCSessionDescription, mediaDevices } from './webrtc';
import { useAction, useConvex } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '@cvx/_generated/api';
import { useSpace } from '@/features/account/SpaceProvider';
import { AI_TOOLS, dispatchTool, localNowIso } from './tools';

export type AIMessage = { id: string; role: 'user' | 'assistant' | 'tool'; text: string; ok?: boolean };
export type AIStatus = 'idle' | 'connecting' | 'live' | 'error';

let _id = 0;
const nextId = () => `m${++_id}`;

// Safety cap on live time — mirrors Whisper's MAX_MS so a pocketed/forgotten
// session can't keep the mic hot and the billing meter running indefinitely.
const MAX_LIVE_MS = 5 * 60_000;

// Convex redacts plain server Error messages in production, so the rate limit is
// detected via ConvexError data (the message substring check is a dev fallback).
const friendlyError = (e: any): string => {
  const msg = String(e?.message ?? e);
  if ((e instanceof ConvexError && e.data === 'RATE_LIMITED') || msg.includes('RATE_LIMITED'))
    return 'A little fast — give it a minute and try again.';
  if (/permission/i.test(msg)) return 'Microphone is off for Pacto — enable it in Settings.';
  return "Couldn't reach the assistant — try again.";
};

// Anchor transcription + responses to the device language so gpt-realtime can't
// drift into a random language on short/ambiguous audio.
const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', hi: 'Hindi', ru: 'Russian', tr: 'Turkish', pl: 'Polish', sv: 'Swedish',
};
const deviceLang = (() => {
  try {
    return (Intl.DateTimeFormat().resolvedOptions().locale || 'en').split('-')[0].toLowerCase();
  } catch {
    return 'en';
  }
})();
const deviceLangName = LANG_NAMES[deviceLang] ?? 'English';

export function useRealtimeAgent() {
  const convex = useConvex();
  const mintToken = useAction(api.ai.realtimeToken);
  const { space, members } = useSpace();

  const pcRef = useRef<any>(null);
  const dcRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  // Web only: browsers don't auto-play remote WebRTC audio the way the native
  // session does — the remote track must be attached to an <audio> element.
  const audioElRef = useRef<any>(null);
  // Session generation — stop() bumps it so an in-flight start() knows it was
  // cancelled and must tear down instead of going live with the dock closed.
  const genRef = useRef(0);
  const capRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<AIStatus>('idle');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const push = (m: AIMessage) => setMessages((prev) => [...prev, m]);

  // In-progress streaming message ids (assistant + user), so deltas animate in.
  const streamIdRef = useRef<{ assistant: string | null; user: string | null }>({
    assistant: null,
    user: null,
  });

  // Append a streamed delta to the current message for `role`, creating it on first delta.
  const appendDelta = (role: 'assistant' | 'user', delta: string) => {
    if (!delta) return;
    let id = streamIdRef.current[role];
    if (!id) {
      id = nextId();
      streamIdRef.current[role] = id;
      setMessages((prev) => [...prev, { id: id!, role, text: delta }]);
    } else {
      const mid = id;
      setMessages((prev) => prev.map((m) => (m.id === mid ? { ...m, text: m.text + delta } : m)));
    }
  };

  // Finalize the current streaming message for `role`. The streamed deltas are the
  // source of truth; the final `full` text only overrides when actually present
  // (GA 'done'/'completed' events don't always repeat the transcript).
  const finalizeStream = (role: 'assistant' | 'user', full?: string) => {
    const id = streamIdRef.current[role];
    streamIdRef.current[role] = null;
    const text = (full ?? '').trim();
    setMessages((prev) => {
      if (id) {
        return prev.map((m) => (m.id === id ? { ...m, text: text || m.text.trim() } : m));
      }
      return text ? [...prev, { id: nextId(), role, text }] : prev;
    });
  };

  const sendEvent = (obj: unknown) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === 'open') dc.send(JSON.stringify(obj));
  };

  const handleEvent = useCallback(
    async (evt: any) => {
      switch (evt.type) {
        // User speech — stream the input transcription as it arrives.
        case 'conversation.item.input_audio_transcription.delta':
          appendDelta('user', evt.delta ?? '');
          break;
        case 'conversation.item.input_audio_transcription.completed':
          finalizeStream('user', evt.transcript);
          break;
        // Assistant speech — stream the spoken reply's transcript live.
        case 'response.output_audio_transcript.delta':
        case 'response.audio_transcript.delta':
          appendDelta('assistant', evt.delta ?? '');
          break;
        case 'response.output_audio_transcript.done':
        case 'response.audio_transcript.done':
          finalizeStream('assistant', evt.transcript);
          break;
        // Catches interrupted/cancelled responses (semantic_vad interrupt) so a
        // half-streamed assistant bubble is closed instead of orphaned.
        case 'response.done':
          finalizeStream('assistant');
          break;
        case 'response.function_call_arguments.done': {
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(evt.arguments || '{}');
          } catch {
            // leave empty
          }
          let result: Record<string, unknown>;
          try {
            result = space
              ? await dispatchTool(convex, space.id, evt.name, args)
              : { ok: false, error: 'no active space' };
          } catch (e: any) {
            result = { ok: false, error: String(e?.message ?? e) };
          }
          // list_* tools return no `ok` field — `!== false` treats them as success.
          push({ id: nextId(), role: 'tool', text: String(evt.name).replace(/_/g, ' '), ok: result.ok !== false });
          sendEvent({
            type: 'conversation.item.create',
            item: { type: 'function_call_output', call_id: evt.call_id, output: JSON.stringify(result) },
          });
          sendEvent({ type: 'response.create' });
          break;
        }
        case 'error':
          setError(evt.error?.message ?? 'Realtime error');
          break;
      }
    },
    [convex, space],
  );

  const stop = useCallback(() => {
    genRef.current++; // cancel any in-flight start()
    if (capRef.current) {
      clearTimeout(capRef.current);
      capRef.current = null;
    }
    try {
      streamRef.current?.getTracks?.().forEach((t: any) => t.stop());
    } catch {}
    try {
      dcRef.current?.close?.();
    } catch {}
    try {
      pcRef.current?.close?.();
    } catch {}
    if (audioElRef.current) {
      try {
        audioElRef.current.srcObject = null;
      } catch {}
    }
    streamRef.current = null;
    dcRef.current = null;
    pcRef.current = null;
    streamIdRef.current = { assistant: null, user: null };
    setStatus('idle');
  }, []);

  // End the session when the app backgrounds — iOS suspends the connection
  // anyway, which would otherwise leave the mic claimed, the billing meter
  // notionally running, and the hook reporting a stale 'live' status.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') stop();
    });
    return () => sub.remove();
  }, [stop]);

  const start = useCallback(async () => {
    if (status === 'connecting' || status === 'live') return;
    // Begin each live session clean so deltas can't append onto a prior session's bubble.
    streamIdRef.current = { assistant: null, user: null };
    setMessages([]);
    setStatus('connecting');
    setError(null);
    setMicDenied(false);
    // If stop() runs while we're awaiting below, the generation moves on: tear
    // down whatever this stale start() created locally (stop() may have already
    // nulled the refs) and return without ever going live.
    const gen = ++genRef.current;
    let pc: any = null;
    let dc: any = null;
    let stream: any = null;
    const teardown = () => {
      try {
        stream?.getTracks?.().forEach((t: any) => t.stop());
      } catch {}
      try {
        dc?.close?.();
      } catch {}
      try {
        pc?.close?.();
      } catch {}
    };
    try {
      const { value: token } = await mintToken({});
      if (gen !== genRef.current) return;

      pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;

      if (Platform.OS === 'web') {
        pc.addEventListener('track', (e: any) => {
          if (pcRef.current !== pc || !e.streams?.[0]) return;
          const el = (audioElRef.current ??= new (globalThis as any).Audio());
          el.autoplay = true;
          el.srcObject = e.streams[0];
          el.play?.().catch(() => {});
        });
      }

      stream = await mediaDevices.getUserMedia({ audio: true });
      if (gen !== genRef.current) {
        teardown();
        return;
      }
      streamRef.current = stream;
      stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));

      dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      // Spontaneous failure detection. The identity checks distinguish a
      // deliberate stop() (which nulls the refs synchronously) from a real
      // drop — react-native-webrtc fires 'closed' even for local pc.close().
      // 'disconnected' is spec-transient and often recovers, so it's not fatal;
      // the dc 'close' catches server-side session ends that close the channel
      // without ICE failing.
      pc.addEventListener('connectionstatechange', () => {
        if (pcRef.current !== pc) return; // user already ended this session
        const s = pc.connectionState;
        if (s === 'failed' || s === 'closed') {
          setError('Connection lost — tap to start again');
          stop();
        }
      });
      dc.addEventListener('close', () => {
        if (dcRef.current !== dc) return; // user already ended this session
        setError('Conversation ended — tap to start again');
        stop();
      });

      dc.addEventListener('open', () => {
        if (dcRef.current !== dc) return;
        // Arm the cap on open so it measures live time, not connect time.
        capRef.current = setTimeout(() => {
          setError('Live session ended after 5 minutes');
          stop();
        }, MAX_LIVE_MS);
        setStatus('live');
        const others = members.filter((m) => !m.isYou).map((m) => m.displayName);
        sendEvent({
          type: 'session.update',
          session: {
            type: 'realtime',
            instructions:
              `You are Pacto, a warm, concise voice assistant inside the Pacto app. ` +
              `The current space is "${space?.name ?? 'Personal'}" (${space?.type ?? 'solo'})` +
              (others.length ? `, shared with ${others.join(', ')}` : '') +
              `. The current date and time is ${localNowIso()} — when a reminder has a time, pass create_reminder an absolute atIso with this same UTC offset. ` +
              `When the user asks to add, create, schedule, log, complete, finish, update, or list something, CALL the matching tool. ` +
              `To complete/update existing items, refer to them by title — the tools look them up. ` +
              `After a tool succeeds, confirm in one short sentence. Keep replies to 1–2 sentences. ` +
              `You MUST respond ONLY in ${deviceLangName}. Even if a phrase is unclear or the audio is noisy, ` +
              `assume the user spoke ${deviceLangName} and reply in ${deviceLangName}. Never reply in any other language. ` +
              `Wait until the user has clearly finished their thought before responding — do not interrupt mid-sentence.`,
            tools: AI_TOOLS,
            tool_choice: 'auto',
            audio: {
              input: {
                // Pin Whisper to the device language so silence/noise can't be
                // misdetected as another language (the root of the wrong-language replies).
                transcription: { model: 'whisper-1', language: deviceLang },
                // Semantic VAD waits until the user is *semantically* done speaking
                // (not just a short pause), so the model stops cutting them off mid-sentence.
                turn_detection: { type: 'semantic_vad', eagerness: 'low', interrupt_response: true },
              },
            },
          },
        });
      });
      dc.addEventListener('message', (e: any) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch {
          // ignore non-JSON
        }
      });

      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      if (gen !== genRef.current) {
        teardown();
        return;
      }

      const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/sdp' },
      });
      const answerSdp = await sdpRes.text();
      if (gen !== genRef.current) {
        teardown();
        return;
      }
      if (!sdpRes.ok) throw new Error(`connect failed (${sdpRes.status}): ${answerSdp.slice(0, 200)}`);
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
      if (gen !== genRef.current) {
        teardown();
        return;
      }
    } catch (e: any) {
      if (gen !== genRef.current) return; // cancelled mid-flight — stop() already tore down
      // stop() BEFORE setStatus('error') so its 'idle' doesn't overwrite it.
      stop();
      if (/permission/i.test(String(e?.message ?? e))) setMicDenied(true);
      setError(friendlyError(e));
      setStatus('error');
    }
  }, [status, mintToken, members, space, handleEvent, stop]);

  const sendText = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    push({ id: nextId(), role: 'user', text: t });
    sendEvent({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: t }] },
    });
    sendEvent({ type: 'response.create' });
  }, []);

  return { status, messages, error, micDenied, start, stop, sendText };
}
