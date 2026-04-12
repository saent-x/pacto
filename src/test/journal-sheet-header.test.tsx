import React from 'react';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';

import { sheet } from '@/src/components/ui/sheetStyles';
import { CreateEntrySheet } from '@/src/components/journal/CreateEntrySheet';

// `react-test-renderer` is available in tests but not typed in this project.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

vi.mock('@/src/components/ui', () => ({
  ThemedSheet: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  BottomSheetTextInput: (props: any) => <input {...props} />,
}));

vi.mock('@/src/hooks/useColors', () => ({
  useColors: () => ({
    journal: '#a87258',
    primary: '#b68c72',
    primaryMuted: '#f3e6dc',
    journalLight: '#f4e8df',
    ink: '#221b16',
    text: '#221b16',
    textSecondary: '#6b5f52',
    textTertiary: '#8a7e72',
    fog: '#998b7d',
    haze: '#7d7065',
    dim: '#c9b8aa',
    white: '#ffffff',
  }),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    mode: 'light',
  }),
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
}));

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

vi.mock('@10play/tentap-editor', () => ({
  editorHtml: '<html><head></head><body></body></html>',
  RichText: () => null,
  useEditorBridge: () => ({
    getHTML: vi.fn(async () => '<p>Body</p>'),
    setContent: vi.fn(),
    blur: vi.fn(),
  }),
  useBridgeState: () => ({}),
  TenTapStartKit: [],
}));

vi.mock('@/src/components/journal/MarkdownText', () => ({
  MarkdownText: () => null,
}));

describe('CreateEntrySheet header', () => {
  it('uses the shared bottom-sheet header styles', () => {
    let tree: any;

    act(() => {
      tree = TestRenderer.create(
        <CreateEntrySheet
          sheetRef={{ current: null }}
          onSave={vi.fn(async () => {})}
        />,
      );
    });

    const label = tree.root.findByProps({ children: 'NEW ENTRY' });
    const todayLabel = format(new Date(), 'EEEE, MMMM d');
    const date = tree.root.findByProps({ children: todayLabel });
    expect(label.props.style[0]).toBe(sheet.sheetLabel);
    expect(date.props.style[0]).toBe(sheet.dateDisplay);

    expect(StyleSheet.flatten(date.props.style)).toMatchObject(
      StyleSheet.flatten(sheet.dateDisplay),
    );
  });

  it('uses the shared bottom-sheet title input style', () => {
    let tree: any;

    act(() => {
      tree = TestRenderer.create(
        <CreateEntrySheet
          sheetRef={{ current: null }}
          onSave={vi.fn(async () => {})}
        />,
      );
    });

    const titleInput = tree.root.findByProps({ placeholder: 'Give it a title...' });

    expect(titleInput.props.style[0]).toBe(sheet.titleInput);
    expect(StyleSheet.flatten(titleInput.props.style)).toMatchObject(
      StyleSheet.flatten(sheet.titleInput),
    );
  });
});
