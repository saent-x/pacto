import React, {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { resolveEngine, loadEngine, saveEngine, type Engine } from './engine';
import { useWhisperAgent } from './useWhisperAgent';
import type { AIMessage } from './useRealtimeAgent';

type EngineState = {
  status: string;
  messages: AIMessage[];
  error: string | null;
  live: boolean;
};

type Bridge = {
  begin?: () => void;
  end?: () => void;
  start?: () => void;
  stop?: () => void;
  sendText?: (t: string) => void;
};

type AICtx = {
  engine: Engine;
  setEngine: (e: Engine) => void;
  /** 'hold' = press-and-hold (Whisper); 'live' = tap-to-converse (Realtime). */
  mode: 'hold' | 'live';
  active: boolean;
  state: EngineState;
  // UI-thread animation drivers:
  viz: SharedValue<number>; // 0/1 — recording (hold) or live (realtime)
  level: SharedValue<number>; // 0..1 — mic amplitude (Whisper)
  overlayP: SharedValue<number>; // 0..1 — overlay/tint fade
  // measured tab-pill width so the dock waveform lines up under the AI button:
  pillW: number;
  setPillW: (w: number) => void;
  // controls:
  begin: () => void; // hold start
  end: () => void; // hold end
  toggleLive: () => void; // realtime go-live / stop
  sendText: (t: string) => void;
  close: () => void;
};

const Ctx = createContext<AICtx | null>(null);
export const useAI = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAI must be used within AIControllerProvider');
  return c;
};

// Realtime host is lazy so react-native-webrtc only loads when that engine is active.
const RealtimeHost = lazy(() => import('./RealtimeHost'));

function WhisperHost({
  levelRef,
  bridgeRef,
  onState,
}: {
  levelRef: SharedValue<number>;
  bridgeRef: React.MutableRefObject<Bridge>;
  onState: (s: EngineState) => void;
}) {
  const a = useWhisperAgent(levelRef);
  useEffect(() => {
    bridgeRef.current = { begin: a.begin, end: a.end, sendText: a.sendText };
  }, [a.begin, a.end, a.sendText, bridgeRef]);
  useEffect(() => {
    onState({ status: a.status, messages: a.messages, error: a.error, live: a.status === 'recording' });
  }, [a.status, a.messages, a.error, onState]);
  return null;
}

export function AIControllerProvider({ children }: { children: React.ReactNode }) {
  const vizRef = useSharedValue(0);
  const levelRef = useSharedValue(0);
  const overlayPRef = useSharedValue(0);

  const bridgeRef = useRef<Bridge>({});
  const [engine, setEngineState] = useState<Engine>(() => resolveEngine(null));
  const [active, setActive] = useState(false);
  const [pillW, setPillW] = useState(0);
  const [state, setState] = useState<EngineState>({ status: 'idle', messages: [], error: null, live: false });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Hydrate the persisted/dev engine override after first paint.
  useEffect(() => {
    loadEngine().then(setEngineState);
  }, []);

  const onState = useCallback((s: EngineState) => setState(s), []);

  const mode: 'hold' | 'live' = engine === 'realtime' ? 'live' : 'hold';

  // Fade the overlay/tint with the active state.
  useEffect(() => {
    overlayPRef.set(withTiming(active ? 1 : 0, { duration: 240 }));
  }, [active, overlayPRef]);

  // Drive the recording/live visual from the actual agent state in BOTH modes —
  // so the ring/waveform follow Whisper recording start/stop (incl. the 30s
  // auto-end) and Realtime live, rather than the raw gesture-held flag.
  // Set instantly (0/1): the ring/waveform key off this as a boolean gate via
  // useAnimatedReaction — a ramped value would thrash those reactions.
  useEffect(() => {
    vizRef.set(state.live ? 1 : 0);
  }, [state.live, vizRef]);

  const begin = useCallback(() => {
    setActive(true);
    bridgeRef.current.begin?.();
  }, []);

  const end = useCallback(() => {
    bridgeRef.current.end?.();
  }, []);

  const toggleLive = useCallback(() => {
    setActive(true);
    if (stateRef.current.live) bridgeRef.current.stop?.();
    else bridgeRef.current.start?.();
  }, []);

  const sendText = useCallback((t: string) => bridgeRef.current.sendText?.(t), []);

  const close = useCallback(() => {
    setActive(false);
    vizRef.set(0);
    bridgeRef.current.end?.();
    bridgeRef.current.stop?.();
  }, [vizRef]);

  const setEngine = useCallback(
    (e: Engine) => {
      // Switching engines tears down any live session.
      bridgeRef.current.end?.();
      bridgeRef.current.stop?.();
      bridgeRef.current = {};
      setState({ status: 'idle', messages: [], error: null, live: false });
      vizRef.set(0);
      setEngineState(e);
      saveEngine(e);
    },
    [vizRef],
  );

  const value = useMemo<AICtx>(
    () => ({
      engine,
      setEngine,
      mode,
      active,
      state,
      viz: vizRef,
      level: levelRef,
      overlayP: overlayPRef,
      pillW,
      setPillW,
      begin,
      end,
      toggleLive,
      sendText,
      close,
    }),
    [engine, setEngine, mode, active, state, vizRef, levelRef, overlayPRef, pillW, begin, end, toggleLive, sendText, close],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {engine === 'realtime' ? (
        <Suspense fallback={null}>
          <RealtimeHost bridgeRef={bridgeRef} onState={onState} />
        </Suspense>
      ) : (
        <WhisperHost levelRef={levelRef} bridgeRef={bridgeRef} onState={onState} />
      )}
    </Ctx.Provider>
  );
}
