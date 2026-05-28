import { db } from './db';

type DeleteAccountResponse = { ok?: boolean; error?: string };

type DeleteAccountBody = {
  // Kept for compatibility with legacy clients.
  userId?: string;

  // Optional deletion context that helps the server recover when membership rows
  // are not included in the permissioned query shape.
  membershipId?: string | null;
  spaceId?: string | null;
  isLastMember?: boolean;
  personalMembershipId?: string | null;
  personalSpaceId?: string | null;
  sharedMembershipId?: string | null;
  sharedSpaceId?: string | null;
  sharedIsLastMember?: boolean;
};

export async function deleteAccountFromServer(body: DeleteAccountBody = {}): Promise<void> {
  const apiBase = apiBaseUrl();
  if (!apiBase) {
    throw new Error('Account deletion requires EXPO_PUBLIC_API_URL.');
  }

  if (typeof (db as any).getAuth !== 'function') {
    throw new Error('Account deletion requires a signed-in session.');
  }

  const auth = await (db as any).getAuth().catch(() => null);
  const token = auth?.refresh_token ?? auth?.token;
  if (!token) {
    throw new Error('Account deletion requires a signed-in session.');
  }

  const response = await fetch(`${apiBase}/api/account`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error =
      typeof (payload as DeleteAccountResponse)?.error === 'string'
        ? ((payload as DeleteAccountResponse).error as string)
        : 'Account deletion failed.';
    throw new Error(error);
  }
}

function apiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : null;
}
