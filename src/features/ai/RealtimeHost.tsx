import React, { useEffect, useRef } from 'react';
import { useRealtimeAgent, type AIMessage } from './useRealtimeAgent';

type Bridge = {
  start?: () => void;
  stop?: () => void;
  sendText?: (t: string) => void;
};

type EngineState = { status: string; messages: AIMessage[]; error: string | null; live: boolean };

// Headless host: runs the Realtime WebRTC agent and bridges its controls + state
// up to the AI controller. Lazy-imported so webrtc only loads for this engine.
export default function RealtimeHost({
  bridgeRef,
  onState,
}: {
  bridgeRef: React.MutableRefObject<Bridge>;
  onState: (s: EngineState) => void;
}) {
  const a = useRealtimeAgent();

  useEffect(() => {
    bridgeRef.current = { start: a.start, stop: a.stop, sendText: a.sendText };
  }, [a.start, a.stop, a.sendText, bridgeRef]);

  useEffect(() => {
    onState({ status: a.status, messages: a.messages, error: a.error, live: a.status === 'live' });
  }, [a.status, a.messages, a.error, onState]);

  // Tear down the session ONLY on unmount (engine switch / app exit). Depending on
  // `a` (a fresh object each render) would call stop() on every state update and
  // kill the live session the instant it connects.
  const stopRef = useRef(a.stop);
  useEffect(() => {
    stopRef.current = a.stop;
  }, [a.stop]);
  useEffect(() => () => stopRef.current(), []);

  return null;
}
