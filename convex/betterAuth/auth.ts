import { expo } from "@better-auth/expo";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

const appScheme = "coupl";

function getEnvWithFallback(
  name: "BETTER_AUTH_SECRET" | "CONVEX_SITE_URL",
  fallback: string,
) {
  return process.env[name] ?? fallback;
}

function getTrustedOrigins() {
  return [
    `${appScheme}://`,
    `${appScheme}://*`,
    ...(process.env.NODE_ENV === "development"
      ? [
          "exp://",
          "exp://**",
          "exp://192.168.*.*:*/**",
        ]
      : []),
  ];
}

export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  },
);

export const createAuthOptions = (
  ctx: GenericCtx<DataModel>
): BetterAuthOptions => ({
    appName: "Coupl",
    baseURL: getEnvWithFallback("CONVEX_SITE_URL", "https://example.convex.site"),
    secret: getEnvWithFallback(
      "BETTER_AUTH_SECRET",
      "convex-build-placeholder-secret",
    ),
    trustedOrigins: getTrustedOrigins(),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [expo(), convex({ authConfig })],
  });

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
