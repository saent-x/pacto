import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { withTiming, type SharedValue } from 'react-native-reanimated';
import { useAction } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '@cvx/_generated/api';
import { useSpace } from '@/features/account/SpaceProvider';
import { normMeter } from './VoiceViz';
import { localNowIso, deviceTz } from './tools';
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

// Convex redacts plain server Error messages in production, so the rate limit is
// detected via ConvexError data (the message substring check is a dev fallback).
const friendlyError = (e: any): string => {
  if ((e instanceof ConvexError && e.data === 'RATE_LIMITED') || String(e?.message ?? e).includes('RATE_LIMITED'))
    return 'A little fast — give it a minute and try again.';
  return "Couldn't reach the assistant — try again.";
};

// Restore playback routing after recording (allowsRecording keeps the whole app
// in the record category) and deactivate the session so audio we interrupted
// (music/podcasts) is notified to resume.
const releaseAudioSession = () =>
  setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    .then(() => setIsAudioActiveAsync(false))
    .catch(() => {});

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
  const [micDenied, setMicDenied] = useState(false);
  const [capped, setCapped] = useState(false); // last recording hit the 30s cap

  const messagesRef = useRef<AIMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef(false);
  const wantRef = useRef(false); // synchronous intent — survives begin()'s awaits
  const genRef = useRef(0); // cancel() bumps it — a stale end() must not send a billed turn
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
    const gen = genRef.current; // a cancel() during the awaits below strands this turn
    wantRef.current = false; // cancel any in-flight begin()
    clearPoll();
    if (!recordingRef.current) {
      // not actually recording yet — begin() self-cancels, but it may already
      // have armed recording mode, so restore playback routing either way
      releaseAudioSession();
      return;
    }
    recordingRef.current = false;
    const elapsed = Date.now() - startedRef.current;
    try {
      await recorder.stop();
    } catch {}
    // Release now, not after the slow network turn — a late allowsRecording:false
    // would force-stop a quickly-started next recording.
    releaseAudioSession();
    if (genRef.current !== gen) return; // dismissed — cancel() already reset status
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
    if (genRef.current !== gen) return;
    if (!uri || !space) {
      if (!uri) setError("Didn't catch that — try holding a moment longer.");
      setStatus('idle');
      return;
    }
    try {
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (genRef.current !== gen) return; // dismissed — don't run a billed turn
      const res = await runTurn({
        spaceId: space.id,
        audioBase64,
        lang: deviceLang,
        history: historyFrom(),
        nowIso: localNowIso(),
        tz: deviceTz,
      });
      if (genRef.current !== gen) return;
      setMessages((prev) => {
        const next = [...prev];
        if (res.transcript) next.push({ id: nextId(), role: 'user', text: res.transcript });
        if (res.reply) next.push({ id: nextId(), role: 'assistant', text: res.reply });
        return next;
      });
      setStatus('idle');
    } catch (e: any) {
      if (genRef.current !== gen) return;
      setError(friendlyError(e));
      setStatus('idle');
    }
  }, [recorder, space, runTurn, clearPoll]);

  // Latest end() for the safety-cap timer.
  const endRef = useRef(end);
  useEffect(() => {
    endRef.current = end;
  }, [end]);

  // Dismissal cancels: drop the recording and strand any in-flight end() turn
  // instead of sending a half-finished utterance as a billed turn.
  const cancel = useCallback(() => {
    genRef.current++;
    wantRef.current = false;
    clearPoll();
    if (recordingRef.current) {
      recordingRef.current = false;
      try {
        recorder.stop();
      } catch {}
    }
    releaseAudioSession();
    setStatus('idle');
  }, [recorder, clearPoll]);

  const begin = useCallback(async () => {
    if (recordingRef.current) return;
    wantRef.current = true; // intent set synchronously, before any await
    setError(null);
    setCapped(false);
    setMicDenied(false);
    try {
      if (!grantedRef.current) {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) {
          // iOS never re-prompts once denied — the only fix is the Settings app.
          setMicDenied(!perm.canAskAgain);
          setError(
            perm.canAskAgain
              ? 'Microphone permission is needed.'
              : 'Microphone is off for Pacto — enable it in Settings.',
          );
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
          // The finger is still down — a haptic is the only cue the cap hit.
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          setCapped(true);
          endRef.current();
        }
      }, POLL_MS);
    } catch {
      if (!wantRef.current) {
        // released mid-setup — end() may have already reset the audio mode
        // under us, which is not an error worth surfacing
        setStatus('idle');
        return;
      }
      setError("Couldn't start the mic — try again.");
      setStatus('error');
    }
  }, [recorder, levelRef, clearPoll]);

  const sendText = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || !space) return;
      clearPoll();
      recordingRef.current = false;
      setCapped(false);
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: t }]);
      setStatus('thinking');
      try {
        const res = await runTurn({
          spaceId: space.id,
          text: t,
          lang: deviceLang,
          history: historyFrom(),
          nowIso: localNowIso(),
          tz: deviceTz,
        });
        if (res.reply) setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: res.reply }]);
        setStatus('idle');
      } catch (e: any) {
        setError(friendlyError(e));
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
      releaseAudioSession();
    },
    [recorder, clearPoll],
  );

  return { status, messages, error, micDenied, capped, begin, end, cancel, sendText };
}
