import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_LAYOUT = join(__dirname, '..', '..', '..', 'app', '_layout.tsx');

describe('root notification route header', () => {
  it('uses the shared app back icon instead of the native link back control', () => {
    const src = readFileSync(ROOT_LAYOUT, 'utf8');
    const notificationsRoute = src.match(
      /<Stack\.Screen\s+name="notifications"[\s\S]*?\/>/,
    )?.[0] ?? '';

    expect(src).toContain("@/src/components/ui/HeaderLeft");
    expect(notificationsRoute).toContain('headerLeft: () => <HeaderLeft mode="back" />');
  });

  it('hides the floating Pacto AI launcher on auth and onboarding routes', () => {
    const src = readFileSync(ROOT_LAYOUT, 'utf8');

    expect(src).toContain('useSegments');
    expect(src).toContain('shouldShowFloatingPactoLauncher(segments)');
    expect(src).toContain("segments[0] === '(auth)'");
    expect(src).toContain("segment.startsWith('onboarding')");
  });

  it('hides the floating Pacto AI launcher on modal and notification routes', () => {
    const src = readFileSync(ROOT_LAYOUT, 'utf8');

    expect(src).toContain("segments[0] === 'sheets'");
    expect(src).toContain("segments[0] === 'notifications'");
  });
});
