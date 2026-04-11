import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { sheet } from '@/src/components/ui/sheetStyles';
import { CreateCheckInSheet } from '@/src/components/checkIns/CreateCheckInSheet';
import { CreateLoveNoteSheet } from '@/src/components/loveNotes/CreateLoveNoteSheet';
import { CreateWishlistItemSheet } from '@/src/components/wishlists/CreateWishlistItemSheet';
import { CreateWishlistSheet } from '@/src/components/wishlists/CreateWishlistSheet';

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
    primary: '#b68c72',
    primaryMuted: '#f3e6dc',
    mood: '#8AAF7B',
    moodLight: '#eef6ea',
    wishlists: '#c4977a',
    wishlistsLight: '#f5ebe4',
    ink: '#221b16',
    text: '#221b16',
    textSecondary: '#6b5f52',
    textTertiary: '#8a7e72',
    fog: '#998b7d',
    haze: '#7d7065',
  }),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    mode: 'light',
  }),
}));

vi.mock('date-fns', () => ({
  format: () => 'Saturday, April 11',
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

function render(element: React.ReactElement) {
  let tree: any;
  act(() => {
    tree = TestRenderer.create(element);
  });
  return tree;
}

describe('Create sheet uniformity', () => {
  it('keeps the check-in sheet on the shared two-line header contract', () => {
    const tree = render(
      <CreateCheckInSheet sheetRef={{ current: null }} onSave={vi.fn(async () => {})} />,
    );

    const label = tree.root.findByProps({ children: 'NEW CHECK-IN' });
    const date = tree.root.findByProps({ children: 'Saturday, April 11' });

    expect(label.props.style[0]).toBe(sheet.sheetLabel);
    expect(date.props.style[0]).toBe(sheet.dateDisplay);
  });

  it('keeps the love note sheet on the shared two-line header contract', () => {
    const tree = render(
      <CreateLoveNoteSheet sheetRef={{ current: null }} onSave={vi.fn(async () => {})} />,
    );

    const label = tree.root.findByProps({ children: 'NEW NOTE' });
    const date = tree.root.findByProps({ children: 'Saturday, April 11' });

    expect(label.props.style[0]).toBe(sheet.sheetLabel);
    expect(date.props.style[0]).toBe(sheet.dateDisplay);
  });

  it('keeps the wishlist item sheet on the shared title and header contract', () => {
    const tree = render(
      <CreateWishlistItemSheet sheetRef={{ current: null }} onSave={vi.fn(async () => {})} />,
    );

    const label = tree.root.findByProps({ children: 'DROP A HINT' });
    const date = tree.root.findByProps({ children: 'Saturday, April 11' });
    const titleInput = tree.root.findByProps({ placeholder: 'What do you wish for?' });

    expect(label.props.style[0]).toBe(sheet.sheetLabel);
    expect(date.props.style[0]).toBe(sheet.dateDisplay);
    expect(titleInput.props.style[0]).toBe(sheet.titleInput);
  });

  it('keeps the wishlist sheet on the shared title and header contract', () => {
    const tree = render(
      <CreateWishlistSheet sheetRef={{ current: null }} onSave={vi.fn(async () => {})} />,
    );

    const label = tree.root.findByProps({ children: 'NEW LIST' });
    const date = tree.root.findByProps({ children: 'Saturday, April 11' });
    const titleInput = tree.root.findByProps({ placeholder: 'Name your list...' });

    expect(label.props.style[0]).toBe(sheet.sheetLabel);
    expect(date.props.style[0]).toBe(sheet.dateDisplay);
    expect(titleInput.props.style[0]).toBe(sheet.titleInput);
  });
});
