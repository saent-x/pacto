import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ThemedSheet } from '@/src/components/ui/BottomSheet';

// `react-test-renderer` is available in tests but not typed in this project.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const modalSpy = vi.fn();

vi.mock('@/src/hooks/useColors', () => ({
  useColors: () => ({
    text: '#fff',
  }),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    mode: 'dark',
    C: {
      bgCard: '#211A15',
      bone: '#FFF9EE',
      line2: '#4D3E34',
      lineColor: '#3A3029',
    },
  }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

vi.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: ({ children, footerComponent, ...props }: { children?: React.ReactNode; footerComponent?: (props: any) => React.ReactNode }) => {
    modalSpy(props);
    return (
      <>
        {children}
        {footerComponent?.({ animatedFooterPosition: 0, bottomInset: 0 })}
      </>
    );
  },
  BottomSheetBackdrop: () => null,
  BottomSheetFooter: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  BottomSheetView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  BottomSheetScrollView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  BottomSheetTextInput: () => null,
}));

describe('ThemedSheet', () => {
  it('renders a fixed footer outside the body content', () => {
    let tree: any;

    act(() => {
      tree = TestRenderer.create(
        <ThemedSheet
          sheetRef={{ current: null }}
          footer={<>{'footer-action'}</>}
        >
          <>{'sheet-body'}</>
        </ThemedSheet>,
      );
    });

    const textNodes = tree!.root.findAll((node: any) => typeof node.children?.[0] === 'string');
    const orderedText = textNodes.map((node: any) => node.children.join(''));

    expect(orderedText).toEqual(['sheet-body', 'footer-action']);
  });

  it('keeps content panning enabled for scrollable sheets', () => {
    act(() => {
      TestRenderer.create(
        <ThemedSheet sheetRef={{ current: null }} scrollable>
          <>{'sheet-body'}</>
        </ThemedSheet>,
      );
    });

    const lastCall = modalSpy.mock.calls.at(-1)?.[0];
    expect(lastCall?.enableContentPanningGesture).toBe(true);
    expect(lastCall?.overDragResistanceFactor).toBe(6);
  });
});
