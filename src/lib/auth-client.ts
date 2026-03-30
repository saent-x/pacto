import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createAuthClient } from "better-auth/react";

const baseURL = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
const rawScheme = Constants.expoConfig?.scheme;
const scheme = (Array.isArray(rawScheme) ? rawScheme[0] : rawScheme) ?? "coupl";

if (!baseURL) {
  throw new Error("EXPO_PUBLIC_CONVEX_SITE_URL is required.");
}

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: scheme,
      storage: SecureStore,
    }),
    convexClient(),
  ],
});
