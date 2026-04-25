import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { ThemedSheet } from '@/src/components/ui/BottomSheet';
import { useTheme } from '@/src/lib/theme';

export type ActionMenuItem = {
  key: string;
  label: string;
  icon: IconName;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
};

export type ActionMenuPayload = {
  title?: string;
  subtitle?: string;
  actions: ActionMenuItem[];
};

type Ctx = {
  open: (payload: ActionMenuPayload) => void;
  close: () => void;
};

const ActionMenuCtx = createContext<Ctx | null>(null);

export function ActionMenuProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<BottomSheetModal | null>(null);
  const [payload, setPayload] = useState<ActionMenuPayload | null>(null);

  const open = useCallback((next: ActionMenuPayload) => {
    setPayload(next);
    requestAnimationFrame(() => {
      sheetRef.current?.present();
    });
  }, []);

  const close = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const value = useMemo<Ctx>(() => ({ open, close }), [open, close]);

  return (
    <ActionMenuCtx.Provider value={value}>
      {children}
      <ActionMenuSheet
        sheetRef={sheetRef}
        payload={payload}
        onDismiss={() => setPayload(null)}
      />
    </ActionMenuCtx.Provider>
  );
}

export function useActionMenu(): Ctx {
  const ctx = useContext(ActionMenuCtx);
  if (!ctx) {
    return {
      open: () => undefined,
      close: () => undefined,
    };
  }
  return ctx;
}

function ActionMenuSheet({
  sheetRef,
  payload,
  onDismiss,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  payload: ActionMenuPayload | null;
  onDismiss: () => void;
}) {
  const { C, F } = useTheme();

  const handleAction = useCallback(
    async (action: ActionMenuItem) => {
      if (action.disabled) return;
      Haptics.notificationAsync(
        action.destructive
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
      sheetRef.current?.dismiss();
      // Defer so the dismiss animation starts before downstream UI (Alert,
      // navigation) takes the foreground.
      setTimeout(() => {
        void Promise.resolve(action.onPress());
      }, 80);
    },
    [sheetRef],
  );

  return (
    <ThemedSheet sheetRef={sheetRef} onDismiss={onDismiss}>
      {payload ? (
        <View testID="action-menu-content">
          {payload.title || payload.subtitle ? (
            <View style={styles.headerWrap}>
              {payload.title ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: C.bone,
                    fontFamily: F.bodyBold,
                    fontSize: 14,
                    letterSpacing: 0.4,
                  }}
                >
                  {payload.title}
                </Text>
              ) : null}
              {payload.subtitle ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: C.fog,
                    fontFamily: F.body,
                    fontSize: 11,
                    letterSpacing: 0.6,
                    marginTop: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  {payload.subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={{ gap: 6 }}>
            {payload.actions.map((action) => {
              const tone = action.destructive ? C.error : C.bone;
              return (
                <Pressable
                  key={action.key}
                  testID={`action-menu-item-${action.key}`}
                  onPress={() => void handleAction(action)}
                  disabled={action.disabled}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    backgroundColor: pressed ? C.cardHi : C.card,
                    borderWidth: 1,
                    borderColor: C.line,
                    opacity: action.disabled ? 0.4 : 1,
                  })}
                >
                  <Icon name={action.icon} size={18} color={tone} strokeWidth={2} />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: F.bodyBold,
                      fontSize: 15,
                      color: tone,
                    }}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingBottom: 14,
    marginBottom: 6,
  },
});
