import React, { createContext, useContext, useState } from 'react';
import { View, StyleProp, ViewStyle, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useColors } from '../theme';
import { usePullRefresh } from '../lib/usePullRefresh';
import { Kick } from './Text';
import { RoundBtn } from './primitives';

// Gap below a screen header before content begins (also applied as the bottom
// margin of TopBar/SubBar, which the floating-header measurement folds into the
// scroll content's top padding).
export const HEADER_GAP = 30;

// QScreen shares its scroll offset so a fixed header can shrink its centered
// title as the content scrolls (matching the Today screen's pill).
const HeaderScroll = createContext<SharedValue<number> | null>(null);
const useHeaderScroll = () => useContext(HeaderScroll);

// Scrollable screen scaffold: horizontal padding 24, bottom clearance for the tab bar,
// optional decorative motif fixed behind the top of the content.
export function QScreen({
  children,
  header,
  motif,
  bg,
  contentStyle,
  keyboardAvoiding = false,
  loading = false,
  refreshable = true,
  onRefresh,
}: {
  children?: React.ReactNode;
  /** Fixed, transparent header (TopBar/SubBar) — floats above the scroll; content scrolls under it. */
  header?: React.ReactNode;
  motif?: React.ReactNode;
  bg?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Lift the scroll content above the keyboard. Opt-in for screens with text inputs. */
  keyboardAvoiding?: boolean;
  /** While true, the screen shows a centered spinner instead of its content — so partial
   *  data (zeroed counts, empty lists) never flashes before the queries resolve. */
  loading?: boolean;
  /** Enable pull-to-refresh on the scroll view (default on). */
  refreshable?: boolean;
  /** Extra work to run on pull-to-refresh; the spinner holds until it settles. */
  onRefresh?: () => void | Promise<void>;
}) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const [hdrH, setHdrH] = useState(insets.top + 56);
  const scrollY = useSharedValue(0);
  const onScrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const { refreshing, onRefresh: handleRefresh } = usePullRefresh(onRefresh);
  const scroll = (
    <Animated.ScrollView
      onScroll={onScrollHandler}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      refreshControl={
        refreshable ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
            progressViewOffset={header ? hdrH : insets.top}
          />
        ) : undefined
      }
      contentContainerStyle={[
        { paddingHorizontal: 24, paddingTop: header ? hdrH : 0, paddingBottom: 112 },
        contentStyle,
      ]}
    >
      {children}
    </Animated.ScrollView>
  );
  return (
    <View style={{ flex: 1, backgroundColor: bg ?? C.bg }}>
      {motif}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {scroll}
        </KeyboardAvoidingView>
      ) : (
        scroll
      )}
      {header ? (
        <HeaderScroll.Provider value={scrollY}>
          <View
            onLayout={(e) => setHdrH(e.nativeEvent.layout.height)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 24 }}
          >
            {header}
          </View>
        </HeaderScroll.Provider>
      ) : null}
    </View>
  );
}

export function TopBar({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        minHeight: insets.top + 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: HEADER_GAP,
      }}
    >
      <View style={{ flex: 1 }}>{left}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{right}</View>
    </View>
  );
}

export function SubBar({
  kicker,
  right,
  onBack,
}: {
  kicker: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollY = useHeaderScroll();
  // Shrink the centered title on scroll (no-op when used outside QScreen).
  const titleStyle = useAnimatedStyle(() => {
    const y = scrollY ? scrollY.value : 0;
    return { transform: [{ scale: interpolate(y, [0, 90], [1, 0.82], Extrapolation.CLAMP) }] };
  });
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        minHeight: insets.top + 52,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: HEADER_GAP,
      }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <RoundBtn name="chevronLeft" onPress={onBack ?? (() => router.back())} />
      </View>
      <Animated.View style={[{ flexShrink: 1 }, titleStyle]}>
        <Kick numberOfLines={1} style={{ textAlign: 'center', paddingHorizontal: 8 }}>
          {kicker}
        </Kick>
      </Animated.View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {right}
      </View>
    </View>
  );
}

export function QSection({
  label,
  action,
  style,
}: {
  label: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
        style,
      ]}
    >
      {typeof label === 'string' ? <Kick>{label}</Kick> : label}
      {action}
    </View>
  );
}
