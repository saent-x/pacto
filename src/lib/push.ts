import { db } from './instant';
import type { SpaceMode } from './session';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound?: 'default';
  data?: Record<string, unknown>;
  channelId?: string;
};

/**
 * Fan out a push to every member of `spaceId` except `excludeUserId`.
 *
 * Uses Instant's client-side query to look up partner device tokens,
 * then POSTs a batch to Expo's push relay. Best-effort: never throws.
 *
 * Skip when `space.kind === 'solo'` — there's nobody else to notify.
 */
export async function sendPushToSpace(args: {
  spaceId: string;
  excludeUserId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data } = await (db as any).queryOnce({
      spaces: {
        $: { where: { id: args.spaceId } },
        memberships: {
          user: {
            devices: {},
          },
        },
      },
    });

    const space = data?.spaces?.[0];
    if (!space) return;

    const tokens: string[] = [];
    for (const m of space.memberships ?? []) {
      const u = m.user?.[0] ?? m.user; // accommodate either shape
      if (!u || u.id === args.excludeUserId) continue;
      const devices = u.devices ?? [];
      for (const d of devices) {
        if (typeof d?.expoPushToken === 'string' && d.expoPushToken.startsWith('ExponentPushToken')) {
          tokens.push(d.expoPushToken);
        }
      }
    }

    if (tokens.length === 0) return;

    const messages: ExpoMessage[] = tokens.map((to) => ({
      to,
      title: args.title,
      body: args.body,
      sound: 'default',
      channelId: 'default',
      data: args.data ?? {},
    }));

    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('[push] sendPushToSpace failed', e);
  }
}

export async function sendPushToUser(args: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data } = await (db as any).queryOnce({
      devices: {
        $: { where: { 'user.id': args.userId } },
        user: {},
      },
    });

    const tokens = ((data?.devices ?? []) as any[])
      .map((device) => device?.expoPushToken)
      .filter((token): token is string =>
        typeof token === 'string' && token.startsWith('ExponentPushToken'),
      );

    if (tokens.length === 0) return;

    const messages: ExpoMessage[] = tokens.map((to) => ({
      to,
      title: args.title,
      body: args.body,
      sound: 'default',
      channelId: 'default',
      data: args.data ?? {},
    }));

    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('[push] sendPushToUser failed', e);
  }
}

/**
 * Convenience wrapper for hook code: skips solo spaces and missing ids,
 * forwards `route` as `data.route` so taps deep-link via PushBootstrap.
 */
export async function notifySpaceMutation(args: {
  spaceId: string | null | undefined;
  spaceKind: SpaceMode | null | undefined;
  excludeUserId: string | null | undefined;
  title: string;
  body: string;
  route?: string;
}): Promise<void> {
  if (!args.spaceId || !args.excludeUserId) return;
  if (args.spaceKind === 'solo' || !args.spaceKind) return;
  await sendPushToSpace({
    spaceId: args.spaceId,
    excludeUserId: args.excludeUserId,
    title: args.title,
    body: args.body,
    data: args.route ? { route: args.route } : undefined,
  });
}
