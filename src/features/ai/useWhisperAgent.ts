import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { withTiming, type SharedValue } from 'react-native-reanimated';
import { useAction } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { useSpace } from '@/features/account/SpaceProvider';
import { normMeter } from './VoiceViz';
import type { AIMessage } from './useRealtimeAgent';

export type WhisperStatus = 'idle' | 'recording' | 'thinking' | 'error';

let _wid = 0;
const nextId = () => `w${++_wid}`;

const MAX_MS = 30000; // safety cap: auto-end a held recording after 30s
const MIN_MS = 650; // tap opens the overlay; a real voice turn needs a short hold
const POLL_MS = 100;

// Device language anchors Whisper transcription + the reply language.
const deviceLang = (() => {
  try {
    return (Intl.DateTimeFormat().resolvedOptions().locale || 'en').split('-')[0].toLowerCase();
  } catch {
    return 'en';
  }
})();

/**
 * Press-and-hold Whisper agent. `begin()` on touch-down, `end()` on release.
 * Records → transcribes (Whisper) → replies (gpt-4o-mini tool loop). Writes live
 * mic amplitude into `level` (0..1) for the waveform.
 */
export function useWhisperAgent(levelRef?: SharedValue<number>) {
  const runTurn = useAction(api.aiNode.whisperTurn);
  const { space } = useSpace();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });

  const [status, setStatus] = useState<WhisperStatus>('idle');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<AIMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef(false);
  const wantRef = useRef(false); // synchronous intent — survives begin()'s awaits
  const startedRef = useRef(0);
  const grantedRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (levelRef) levelRef.set(withTiming(0, { duration: 160 }));
  }, [levelRef]);

  const historyFrom = () =>
    messagesRef.current
      .filter((m) => m.role !== 'tool')
      .slice(-6)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

  const end = useCallback(async () => {
    wantRef.current = false; // cancel any in-flight begin()
    clearPoll();
    if (!recordingRef.current) return; // not actually recording yet — begin() self-cancels
    recordingRef.current = false;
    const elapsed = Date.now() - startedRef.current;
    try {
      await recorder.stop();
    } catch {}
    if (elapsed < MIN_MS) {
      setStatus('idle');
      return;
    }
    setStatus('thinking');
    // expo-audio may not have repopulated uri on the first tick after stop().
    let uri = recorder.uri;
    for (let i = 0; i < 6 && !uri; i++) {
      await new Promise((r) => setTimeout(r, 60));
      uri = recorder.uri;
    }
    if (!uri || !space) {
      if (!uri) setError("Didn't catch that — try holding a moment longer.");
      setStatus('idle');
      return;
    }
    try {
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const res = await runTurn({ spaceId: space.id, audioBase64, lang: deviceLang, history: historyFrom() });
      setMessages((prev) => {
        const next = [...prev];
        if (res.transcript) next.push({ id: nextId(), role: 'user', text: res.transcript });
        if (res.reply) next.push({ id: nextId(), role: 'assistant', text: res.reply });
        return next;
      });
      setStatus('idle');
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setStatus('idle');
    }
  }, [recorder, space, runTurn, clearPoll]);

  // Latest end() for the safety-cap timer.
  const endRef = useRef(end);
  useEffect(() => {
    endRef.current = end;
  }, [end]);

  const begin = useCallback(async () => {
    if (recordingRef.current) return;
    wantRef.current = true; // intent set synchronously, before any await
    setError(null);
    try {
      if (!grantedRef.current) {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) {
          setError('Microphone permission is needed.');
          setStatus('error');
          return;
        }
        grantedRef.current = true;
      }
      if (!wantRef.current) return; // released during permission prompt
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!wantRef.current) return; // released while configuring audio
      await recorder.prepareToRecordAsync();
      if (!wantRef.current) return; // released while preparing
      recorder.record();
      if (!wantRef.current) {
        // released in the final gap before we could mark recording active
        try {
          await recorder.stop();
        } catch {}
        return;
      }
      recordingRef.current = true;
      setStatus('recording');
      startedRef.current = Date.now();

      clearPoll();
      pollRef.current = setInterval(() => {
        let db = -160;
        try {
          const st = recorder.getStatus();
          db = typeof st.metering === 'number' ? st.metering : -160;
        } catch {}
        if (levelRef) levelRef.set(withTiming(normMeter(db), { duration: POLL_MS + 20 }));
        if (Date.now() - startedRef.current >= MAX_MS) {
          clearPoll();
          endRef.current();
        }
      }, POLL_MS);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setStatus('error');
    }
  }, [recorder, levelRef, clearPoll]);

  const sendText = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || !space) return;
      clearPoll();
      recordingRef.current = false;
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: t }]);
      setStatus('thinking');
      try {
        const res = await runTurn({ spaceId: space.id, text: t, lang: deviceLang, history: historyFrom() });
        if (res.reply) setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: res.reply }]);
        setStatus('idle');
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setStatus('idle');
      }
    },
    [space, runTurn, clearPoll],
  );

  useEffect(
    () => () => {
      clearPoll();
      try {
        recorder.stop();
      } catch {}
    },
    [recorder, clearPoll],
  );

  return { status, messages, error, begin, end, sendText };
}
