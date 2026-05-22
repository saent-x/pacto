import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const signInSource = readFileSync(
  join(process.cwd(), 'app/(auth)/sign-in.tsx'),
  'utf8',
);
const googleAuthSource = readFileSync(
  join(process.cwd(), 'src/lib/auth-google.ts'),
  'utf8',
);

describe('sign-in production surface', () => {
  it('keeps production auth actions and excludes dev prefill UI', () => {
    expect(signInSource).toContain('Continue with Apple');
    expect(signInSource).toContain('Continue with Google');
    expect(signInSource).not.toMatch(/Dev:|prefill test email|test email/i);
  });

  it('uses a native-friendly full-height scroll surface', () => {
    expect(signInSource).toContain('contentInsetAdjustmentBehavior="automatic"');
    expect(signInSource).toContain('showsVerticalScrollIndicator={false}');
    expect(signInSource).toContain('flexGrow: 1');
  });

  it('keeps auth button labels full-width to avoid Android text clipping', () => {
    expect(signInSource).toContain('styles.buttonLabel');
    expect(signInSource).toContain("width: '100%'");
    expect(signInSource).toContain("textAlign: 'center'");
    expect(signInSource).toContain('includeFontPadding: false');
  });

  it('uses native Google sign-in clients on iOS and Android', () => {
    expect(signInSource).toContain('signInWithGoogle');
    expect(googleAuthSource).toContain("import('@react-native-google-signin/google-signin')");
    expect(googleAuthSource).toContain('google-ios');
    expect(googleAuthSource).toContain('google-android');
    expect(googleAuthSource).toContain('db.auth.signInWithIdToken');
  });
});
