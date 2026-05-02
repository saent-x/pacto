import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { CURRENCIES, usePreferences } from '@/src/lib/preferences';

export default function CurrencySheet() {
  const { C } = useTheme();
  const { currencyCode, setCurrencyCode } = usePreferences();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
    );
  }, [query]);

  const onPick = (code: string) => {
    Haptics.selectionAsync().catch(() => undefined);
    setCurrencyCode(code);
    router.back();
  };

  return (
    <SheetShell eyebrow="CURRENCY" title="currency">
      <View
        style={[
          styles.search,
          { backgroundColor: C.bgCard, borderColor: C.lineColor },
        ]}
      >
        <Icon name="filter" size={16} color={C.ink3} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by code, country, or name…"
          placeholderTextColor={C.ink3}
          autoCapitalize="characters"
          style={[
            styles.searchInput,
            { color: C.inkColor, fontFamily: Typography.geistFont },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card padded={false} style={{ marginTop: 14 }}>
          {filtered.map((c, i) => {
            const sel = c.code === currencyCode;
            return (
              <Pressable
                key={c.code}
                onPress={() => onPick(c.code)}
                style={[
                  styles.row,
                  i < filtered.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: C.lineColor }
                    : null,
                ]}
              >
                <Text style={styles.flag}>{c.flag}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        Typography.bodyMedium,
                        { color: C.inkColor },
                      ]}
                    >
                      {c.name}
                    </Text>
                    <Text
                      style={[
                        Typography.mono,
                        { color: C.ink3, fontSize: 12 },
                      ]}
                    >
                      {c.code} · {c.symbol}
                    </Text>
                  </View>
                  <Text
                    style={[Typography.caption, { color: C.ink3, marginTop: 2 }]}
                  >
                    {c.country}
                  </Text>
                </View>
                {sel ? (
                  <Icon name="check" size={18} color={C.accent} strokeWidth={2.4} />
                ) : null}
              </Pressable>
            );
          })}
        </Card>
        {filtered.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={[Typography.caption, { color: C.ink3 }]}>
              No matches for "{query}"
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  flag: {
    fontSize: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
});
