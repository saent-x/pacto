import React from 'react';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/src/lib/theme';

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

// expo-blur ships a .js entry with un-compiled JSX → vite's import-analysis
// rejects it. Transitively reached via ScreenHeader.tsx → WarmBlock.tsx.
vi.mock('expo-blur', () => ({
  BlurView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@expo/vector-icons', () => ({
  Feather: ({ name }: { name: string }) => <Text>{`feather:${name}`}</Text>,
}));

// Import after mocks so the Feather + Haptics imports inside ScreenHeader.tsx resolve.
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { ScreenHeader as CouplScreenHeader } from '@/src/components/ui/atoms';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

function render(el: React.ReactElement) {
  let tree: any;
  act(() => {
    tree = TestRenderer.create(<ThemeProvider>{el}</ThemeProvider>);
  });
  return tree.toJSON();
}

describe('ScreenHeader — both variants coexist', () => {
  it('ui/ScreenHeader.tsx — gold accent, no back', () => {
    expect(
      render(<ScreenHeader eyebrow="01 · HOME" title="Home" accent="gold" />),
    ).toMatchSnapshot();
  });

  it('ui/ScreenHeader.tsx — with back btn + action + wavy accent', () => {
    expect(
      render(
        <ScreenHeader
          title="Tasks"
          accent="wavy"
          back={{ onPress: () => {} }}
          action={{ icon: 'plus', onPress: () => {} }}
          meta={<Text>4 open</Text>}
        />,
      ),
    ).toMatchSnapshot();
  });

  it('atoms::ScreenHeader (CouplScreenHeader) — title only', () => {
    expect(
      render(<CouplScreenHeader title="Journal" />),
    ).toMatchSnapshot();
  });

  it('atoms::ScreenHeader (CouplScreenHeader) — eyebrow + meta + custom accent', () => {
    expect(
      render(
        <CouplScreenHeader
          eyebrow="03 · JOURNAL"
          title="Today"
          accent="#f0c050"
          meta="12 entries"
          underlineColor="#f0c050"
        />,
      ),
    ).toMatchSnapshot();
  });

  it('divergence guard — the two headers render distinct trees', () => {
    const A = render(<ScreenHeader title="Same" />);
    const B = render(<CouplScreenHeader title="Same" />);
    expect(JSON.stringify(A)).not.toBe(JSON.stringify(B));
  });
});
