import { createElement } from 'react';
import { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingPager, type PagerPage } from '@/src/components/ui/pacto/OnboardingPager';

vi.mock('@/src/components/ui/pacto', () => ({
  HeaderBrand: ({ title }: { title: string }) => createElement('Text', null, title),
}));
vi.mock('@/src/components/ui/pacto/PulsingDot', () => ({ PulsingDot: () => null }));
vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => createElement('Text', null, name),
}));

const TestRenderer = require('react-test-renderer');

const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];

const pages: PagerPage[] = [
  { key: 'a', eyebrow: 'A', title: 'one.', body: 'b1', accent: '#f00', visual: null },
  { key: 'b', eyebrow: 'B', title: 'two.', body: 'b2', accent: '#0f0', visual: null },
];

describe('OnboardingPager', () => {
  it('calls onFinish from the last page CTA', async () => {
    const onFinish = vi.fn();
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(OnboardingPager, { pages: [pages[1]], onFinish, onSkip: vi.fn() }),
      );
    });
    await act(async () => {
      findByTestID(renderer.root, 'intro-next').props.onPress();
    });
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('calls onSkip from the skip control', async () => {
    const onSkip = vi.fn();
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(OnboardingPager, { pages, onFinish: vi.fn(), onSkip }),
      );
    });
    await act(async () => {
      findByTestID(renderer.root, 'intro-skip').props.onPress();
    });
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
