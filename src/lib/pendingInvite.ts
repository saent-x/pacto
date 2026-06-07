import * as SecureStore from 'expo-secure-store';

// A join code captured from a deep link before the user is ready to redeem it
// (e.g. they tapped pacto://join/ABC123 while signed out). Consumed after auth.
const KEY = 'pacto.pendingInvite';

export const setPendingInvite = (code: string) =>
  SecureStore.setItemAsync(KEY, code).catch(() => {});

export const getPendingInvite = () => SecureStore.getItemAsync(KEY).catch(() => null);

export const clearPendingInvite = () => SecureStore.deleteItemAsync(KEY).catch(() => {});

// Extracts the code from any Pacto join URL form:
//   pacto://join/ABC123
//   exp+pacto://expo-development-client/--/join/ABC123
//   https://…/join/ABC123
export function parseJoinCode(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:^|[/:])join\/([A-Za-z0-9-]{3,})/);
  return m ? m[1].toUpperCase() : null;
}

// Human-readable message for a redeemInvite error.
export function inviteErrorMessage(err: unknown): string {
  const msg = String((err as any)?.message ?? '');
  if (msg.includes('INVALID_CODE')) return 'That invite code is not valid.';
  if (msg.includes('EXPIRED')) return 'That invite has expired.';
  if (msg.includes('FULL')) return 'That space is already full.';
  if (msg.includes('INACTIVE')) return 'That invite is no longer active.';
  return 'Could not join with that code.';
}
