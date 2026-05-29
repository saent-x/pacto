import React from 'react';
import { Text, View } from 'react-native';
import { describe, expect, it } from 'vitest';

import { ThemeProvider } from '@/src/lib/theme';
import {
  Avatar,
  Badge,
  BlockCard,
  PactoRings,
  DarkCard,
  DateSectioned,
  Display,
  IconTile,
  Overline,
  Pill,
  PrimaryButton,
  ProgressRing,
  RoundBtn,
  ScreenHeader,
  SectionHeader,
  StickyDate,
  TripleRing,
  WavyUnderline,
} from '@/src/components/ui/atoms';

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

describe('atoms snapshots', () => {
  it('Avatar — default', () => {
    expect(render(<Avatar letter="A" />)).toMatchSnapshot();
  });

  it('Avatar — custom size + colors + border', () => {
    expect(
      render(<Avatar letter="M" size={48} bg="#ff0" color="#000" border="#f0f" />),
    ).toMatchSnapshot();
  });

  it('Overline — default', () => {
    expect(render(<Overline>Hello</Overline>)).toMatchSnapshot();
  });

  it('Display — numeric size', () => {
    expect(render(<Display size={40}>Tasks</Display>)).toMatchSnapshot();
  });

  it('BlockCard — static', () => {
    expect(
      render(
        <BlockCard>
          <Text>Card body</Text>
        </BlockCard>,
      ),
    ).toMatchSnapshot();
  });

  it('BlockCard — pressable', () => {
    expect(
      render(
        <BlockCard onPress={() => {}}>
          <Text>Press me</Text>
        </BlockCard>,
      ),
    ).toMatchSnapshot();
  });

  it('DarkCard — default', () => {
    expect(
      render(
        <DarkCard>
          <Text>Dark body</Text>
        </DarkCard>,
      ),
    ).toMatchSnapshot();
  });

  it('DarkCard — borderless + custom padding', () => {
    expect(
      render(
        <DarkCard border={false} padding={24}>
          <Text>No border</Text>
        </DarkCard>,
      ),
    ).toMatchSnapshot();
  });

  it('Pill — inactive md', () => {
    expect(render(<Pill>Tag</Pill>)).toMatchSnapshot();
  });

  it('Pill — active sm', () => {
    expect(
      render(
        <Pill active size="sm">
          Active
        </Pill>,
      ),
    ).toMatchSnapshot();
  });

  it('Badge — default', () => {
    expect(render(<Badge>New</Badge>)).toMatchSnapshot();
  });

  it('IconTile — default', () => {
    expect(render(<IconTile icon="bell" />)).toMatchSnapshot();
  });

  it('IconTile — custom size + palette', () => {
    expect(
      render(<IconTile icon="heart" size={48} radius={16} bg="#402" color="#fdd" />),
    ).toMatchSnapshot();
  });

  it('PrimaryButton — enabled, no icon', () => {
    expect(render(<PrimaryButton>Save</PrimaryButton>)).toMatchSnapshot();
  });

  it('PrimaryButton — disabled with icon', () => {
    expect(
      render(
        <PrimaryButton disabled icon="check">
          Locked
        </PrimaryButton>,
      ),
    ).toMatchSnapshot();
  });

  it('RoundBtn — default border', () => {
    expect(render(<RoundBtn icon="plus" />)).toMatchSnapshot();
  });

  it('RoundBtn — borderless + custom size', () => {
    expect(
      render(<RoundBtn icon="x" size={56} border={null} bg="#111" color="#fff" />),
    ).toMatchSnapshot();
  });

  it('ProgressRing — default', () => {
    expect(render(<ProgressRing />)).toMatchSnapshot();
  });

  it('ProgressRing — with label + custom colors', () => {
    expect(
      render(<ProgressRing size={120} stroke={10} value={0.5} label="50%" colors={['#f00', '#0f0']} />),
    ).toMatchSnapshot();
  });

  it('TripleRing — default', () => {
    expect(render(<TripleRing />)).toMatchSnapshot();
  });

  it('TripleRing — custom values', () => {
    expect(
      render(<TripleRing size={140} values={[0.3, 0.6, 0.9]} stroke={8} gap={4} />),
    ).toMatchSnapshot();
  });

  it('SectionHeader — label only', () => {
    expect(render(<SectionHeader label="Today" />)).toMatchSnapshot();
  });

  it('SectionHeader — with action', () => {
    expect(
      render(<SectionHeader label="Today" action={<Text>All</Text>} />),
    ).toMatchSnapshot();
  });

  it('WavyUnderline — default', () => {
    expect(render(<WavyUnderline />)).toMatchSnapshot();
  });

  it('WavyUnderline — custom width + color + opacity', () => {
    expect(
      render(<WavyUnderline width={200} color="#ff00ff" opacity={0.3} />),
    ).toMatchSnapshot();
  });

  it('ScreenHeader — title only', () => {
    expect(render(<ScreenHeader title="Tasks" />)).toMatchSnapshot();
  });

  it('ScreenHeader — eyebrow + meta + custom accent', () => {
    expect(
      render(
        <ScreenHeader
          eyebrow="02 · TASKS"
          title="Today"
          accent="#f0c050"
          meta="4 open"
          underlineColor="#f0c050"
        />,
      ),
    ).toMatchSnapshot();
  });

  it('StickyDate — static label', () => {
    expect(render(<StickyDate label="Today" count={3} />)).toMatchSnapshot();
  });

  it('StickyDate — collapsible open', () => {
    expect(
      render(<StickyDate label="Yesterday" count={7} collapsible open onToggle={() => {}} />),
    ).toMatchSnapshot();
  });

  it('StickyDate — collapsible closed', () => {
    expect(
      render(<StickyDate label="Older" count={12} collapsible open={false} onToggle={() => {}} />),
    ).toMatchSnapshot();
  });

  it('DateSectioned — two sections, both open', () => {
    expect(
      render(
        <DateSectioned
          maxOpen={3}
          sections={[
            { label: 'Today', items: ['a', 'b'] },
            { label: 'Yesterday', items: ['c'] },
          ]}
          renderItem={(item) => <Text key={item as string}>{item as string}</Text>}
        />,
      ),
    ).toMatchSnapshot();
  });

  it('DateSectioned — third section auto-collapsed', () => {
    expect(
      render(
        <DateSectioned
          maxOpen={2}
          sections={[
            { label: 'Today', items: ['a'] },
            { label: 'Yesterday', items: ['b'] },
            { label: 'Older', items: ['c', 'd', 'e'] },
          ]}
          renderItem={(item) => <Text key={item as string}>{item as string}</Text>}
        />,
      ),
    ).toMatchSnapshot();
  });

  it('PactoRings — default', () => {
    expect(render(<PactoRings />)).toMatchSnapshot();
  });

  it('PactoRings — custom size + colors', () => {
    expect(
      render(<PactoRings size={64} opacity={0.8} a="#f00" b="#00f" />),
    ).toMatchSnapshot();
  });

  it('contains a View for composition sanity', () => {
    // Sanity check: the test infra can round-trip a plain RN view
    // alongside the atoms — catches setup issues early.
    expect(
      render(
        <View>
          <Overline>group</Overline>
        </View>,
      ),
    ).toMatchSnapshot();
  });
});
