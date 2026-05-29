import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const inviteSource = readFileSync(
  join(process.cwd(), 'app/(auth)/invite.tsx'),
  'utf8',
);
const inviteCodeSource = readFileSync(
  join(process.cwd(), 'app/(auth)/invite-code.tsx'),
  'utf8',
);

describe('invite code input surfaces', () => {
  it('renders invite code slots as fully rounded capsules everywhere they appear', () => {
    for (const source of [inviteSource, inviteCodeSource]) {
      expect(source).toContain('INVITE_CODE_SLOT_SIZE = 52');
      expect(source).toContain('width: INVITE_CODE_SLOT_SIZE');
      expect(source).toContain('height: INVITE_CODE_SLOT_SIZE');
      expect(source).toContain('INVITE_CODE_SLOT_RADIUS = 999');
      expect(source).toContain('borderRadius: INVITE_CODE_SLOT_RADIUS');
    }
  });

  it('renders invite-code screen actions as fully rounded buttons', () => {
    expect(inviteCodeSource).toContain('INVITE_CODE_BUTTON_RADIUS = 999');
    expect(inviteCodeSource).toContain('borderRadius: INVITE_CODE_BUTTON_RADIUS');
    expect(inviteCodeSource).toContain('minHeight: 56');
    expect(inviteCodeSource).toContain("overflow: 'hidden'");
  });
});
