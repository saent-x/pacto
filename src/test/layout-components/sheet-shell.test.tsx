import React from 'react';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

const { routerBack, overlineSpy, displaySpy, roundBtnSpy } = vi.hoisted(() => ({
  routerBack: vi.fn(),
  overlineSpy: vi.fn(),
  displaySpy: vi.fn(),
  roundBtnSpy: vi.fn(),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: { coal: '#161210', gold: '#E4B24A' },
    F: {},
    mode: 'dark',
    setMode: () => undefined,
  }),
}));

vi.mock('expo-router', () => ({
  router: { back: routerBack },
}));

vi.mock('@/src/components/ui/atoms', () => ({
  Overline: (props: any) => {
    overlineSpy(props);
    return React.createElement(Text, null, props.children);
  },
  Display: (props: any) => {
    displaySpy(props);
    return React.createElement(Text, null, props.children);
  },
  RoundBtn: (props: any) => {
    roundBtnSpy(props);
    return null;
  },
}));

import { SheetShell } from '@/src/components/ui/SheetShell';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('SheetShell', () => {
  it('renders eyebrow, title, children, and footer; close button calls router.back', () => {
    overlineSpy.mockClear();
    displaySpy.mockClear();
    roundBtnSpy.mockClear();
    routerBack.mockClear();

    let tree: any;
    act(() => {
      tree = TestRenderer.create(
        <SheetShell eyebrow="NEW" title="New task" footer={<Text>FOOTER</Text>}>
          <Text>BODY</Text>
        </SheetShell>,
      );
    });

    const overlineCall = overlineSpy.mock.calls.at(-1)?.[0];
    expect(overlineCall?.children).toBe('NEW');
    expect(overlineCall?.color).toBe('#E4B24A');

    const displayCall = displaySpy.mock.calls.at(-1)?.[0];
    expect(displayCall?.children).toBe('New task');
    expect(displayCall?.size).toBe(28);

    const roundBtnCall = roundBtnSpy.mock.calls.at(-1)?.[0];
    expect(roundBtnCall?.icon).toBe('x');
    expect(roundBtnCall?.size).toBe(36);
    roundBtnCall?.onPress();
    expect(routerBack).toHaveBeenCalledTimes(1);

    const bodyTexts = tree.root.findAllByType(Text).map((n: any) =>
      Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? ''),
    );
    expect(bodyTexts).toContain('BODY');
    expect(bodyTexts).toContain('FOOTER');
  });

  it('omits eyebrow and title when not provided', () => {
    overlineSpy.mockClear();
    displaySpy.mockClear();

    act(() => {
      TestRenderer.create(
        <SheetShell>
          <Text>BODY</Text>
        </SheetShell>,
      );
    });

    expect(overlineSpy).not.toHaveBeenCalled();
    expect(displaySpy).not.toHaveBeenCalled();
  });

  it('honors custom eyebrowColor', () => {
    overlineSpy.mockClear();

    act(() => {
      TestRenderer.create(
        <SheetShell eyebrow="HOT" eyebrowColor="#FF00FF">
          <Text>BODY</Text>
        </SheetShell>,
      );
    });

    expect(overlineSpy.mock.calls.at(-1)?.[0]?.color).toBe('#FF00FF');
  });
});
