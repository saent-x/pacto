import type { ConvexReactClient } from 'convex/react';

// Web fork: Expo push tokens are iOS/Android-only, and importing
// expo-notifications pulls native modules the web bundle doesn't have
// (ExpoPushTokenManager) — so the whole registrar is forked out. The in-app
// notifications screen reads plain Convex data and is unaffected.
export function useRegisterPushNotifications() {}

export async function unregisterPushToken(_convex: ConvexReactClient) {}
