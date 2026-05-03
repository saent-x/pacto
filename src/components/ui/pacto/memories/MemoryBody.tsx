import { Linking, StyleSheet, Text } from 'react-native';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

const URL_RE = /(https?:\/\/[^\s]+)/g;

export function MemoryBody({ body }: { body: string }) {
  const { C } = useTheme();
  if (!body) return null;
  const parts = body.split(URL_RE);
  return (
    <Text style={[Typography.body, { color: C.inkColor }, styles.body]}>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <Text key={i} style={{ color: C.accent }} onPress={() => Linking.openURL(part).catch(() => {})}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({ body: { paddingHorizontal: 16, paddingTop: 8, lineHeight: 22 } });
