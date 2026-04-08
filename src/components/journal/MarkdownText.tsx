import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { marked } from 'marked';

import { defaultSystemFonts } from 'react-native-render-html';

import { Spacing } from '@/src/constants/spacing';
import { Typography } from '@/src/constants/typography';
import { useColors } from '@/src/hooks/useColors';

const SYSTEM_FONTS = [
  ...defaultSystemFonts,
  'DMSans_400Regular',
  'DMSans_400Regular_Italic',
  'DMSans_500Medium',
  'DMSans_500Medium_Italic',
  'DMSans_600SemiBold',
  'Newsreader_300Light_Italic',
  'Newsreader_400Regular',
];

/** Strip all markdown/HTML to plain text for preview lines */
export function toPlainMarkdownPreview(value: string) {
  return value
    // Strip HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-zA-Z]+;/g, ' ')
    // Strip markdown syntax
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convert markdown to HTML if it isn't already HTML */
function ensureHtml(source: string): string {
  const isHtml = /<[a-z][\s\S]*>/i.test(source);
  if (isHtml) return source;
  const result = marked.parse(source, { async: false, breaks: true });
  return typeof result === 'string' ? result : source;
}

export function MarkdownText({
  value,
  numberOfLines,
}: {
  value: string;
  numberOfLines?: number;
}) {
  const C = useColors();
  const { width } = useWindowDimensions();
  const source = value.trim().length > 0 ? value : ' ';

  // Plain text preview — for list items, card previews etc.
  if (numberOfLines !== undefined) {
    return (
      <Text numberOfLines={numberOfLines} style={[styles.previewText, { color: C.textSecondary }]}>
        {toPlainMarkdownPreview(source)}
      </Text>
    );
  }

  // Convert markdown to HTML, then render with RenderHTML.
  // This handles both stored-as-markdown and stored-as-HTML content.
  const html = useMemo(() => ensureHtml(source), [source]);

  return (
    <View pointerEvents="none">
      <RenderHTML
        contentWidth={Math.max(width - 64, 0)}
        source={{ html }}
        systemFonts={SYSTEM_FONTS}
        tagsStyles={{
          body: {
            ...Typography.body,
            color: C.textSecondary,
            lineHeight: 24,
            marginTop: 0,
          },
          p: {
            marginTop: 0,
            marginBottom: Spacing.sm,
          },
          h1: {
            ...Typography.heading,
            color: C.textSecondary,
            marginTop: 0,
            marginBottom: Spacing.sm,
          },
          h2: {
            ...Typography.subheading,
            color: C.textSecondary,
            marginTop: 0,
            marginBottom: Spacing.sm,
          },
          h3: {
            ...Typography.subheading,
            fontSize: 15,
            color: C.textSecondary,
            marginTop: 0,
            marginBottom: Spacing.sm,
          },
          blockquote: {
            borderLeftWidth: 3,
            borderLeftColor: C.journal,
            paddingLeft: Spacing.md,
            marginLeft: 0,
            marginRight: 0,
            marginTop: 0,
            marginBottom: Spacing.sm,
            color: C.textSecondary,
          },
          ul: { marginTop: 0, marginBottom: Spacing.sm },
          ol: { marginTop: 0, marginBottom: Spacing.sm },
          li: {
            ...Typography.body,
            color: C.textSecondary,
            lineHeight: 24,
          },
          strong: {
            fontFamily: 'DMSans_700Bold',
            fontWeight: '700' as any,
            color: C.textSecondary,
          },
          b: {
            fontFamily: 'DMSans_700Bold',
            fontWeight: '700' as any,
            color: C.textSecondary,
          },
          em: {
            fontFamily: 'DMSans_400Regular_Italic',
            fontStyle: 'italic' as any,
            color: C.textSecondary,
          },
          i: {
            fontFamily: 'DMSans_400Regular_Italic',
            fontStyle: 'italic' as any,
            color: C.textSecondary,
          },
          u: {
            textDecorationLine: 'underline',
            textDecorationColor: C.journal,
          },
          s: { textDecorationLine: 'line-through' },
          del: { textDecorationLine: 'line-through' },
          strike: { textDecorationLine: 'line-through' },
          code: {
            ...Typography.captionMedium,
            color: C.text,
            backgroundColor: C.card,
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
          },
          pre: {
            ...Typography.captionMedium,
            color: C.text,
            backgroundColor: C.card,
            borderRadius: 10,
            padding: Spacing.md,
            marginTop: 0,
            marginBottom: Spacing.sm,
          },
          a: {
            color: C.primary,
            textDecorationLine: 'underline',
          },
          hr: {
            backgroundColor: C.border,
            height: 1,
            marginVertical: Spacing.md,
          },
        } as any}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  previewText: {
    ...Typography.small,
    lineHeight: 20,
  },
});
