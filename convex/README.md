# Convex Setup

This directory holds the Convex backend for Coupl, including the Better Auth
component mounted on the Convex site deployment.

## Local development

- Run `npm run convex:dev` to start the Convex dev server and keep generated
  code in sync.
- Run `npm run convex:deploy` to deploy the backend when the schema and
  functions are ready.
- Convex generates files under `convex/_generated/`; they are local build
  output and should be treated as generated code.

## Auth foundation

- `auth.config.ts` configures Convex to trust Better Auth JWTs.
- `http.ts` mounts the Better Auth routes on the Convex deployment.
- `betterAuth/` contains the local component definition, Better Auth options,
  adapter exports, and generated schema for the Convex integration.
- The Expo app should set `EXPO_PUBLIC_CONVEX_SITE_URL`, and Convex should have
  `BETTER_AUTH_SECRET` configured before running the auth handlers.
