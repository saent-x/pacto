import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Display, Overline, RoundBtn } from './atoms';

export function SheetShell({
  eyebrow,
  eyebrowColor,
  title,
  children,
  footer,
}: {
  eyebrow?: string;
  eyebrowColor?: string;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { C } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: C.coal }}
      contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <View style={{ flex: 1 }}>
          {!!eyebrow && <Overline color={eyebrowColor ?? C.gold}>{eyebrow}</Overline>}
          {!!title && (
            <Display size={28} style={{ marginTop: eyebrow ? 4 : 0 }}>
              {title}
            </Display>
          )}
        </View>
        <RoundBtn icon="x" size={36} onPress={() => router.back()} />
      </View>
      {children}
      {footer && <View style={{ marginTop: 28 }}>{footer}</View>}
    </ScrollView>
  );
}
