import { ConvexReactClient } from "convex/react";

let client: ConvexReactClient | undefined;

export function createConvexClient(
  convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL,
) {
  if (!convexUrl) {
    throw new Error("EXPO_PUBLIC_CONVEX_URL is required.");
  }

  return new ConvexReactClient(convexUrl);
}

export function getConvexClient() {
  client ??= createConvexClient();
  return client;
}
