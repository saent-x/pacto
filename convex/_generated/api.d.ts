/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiGuard from "../aiGuard.js";
import type * as aiNode from "../aiNode.js";
import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as checkins from "../checkins.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as lib_notify from "../lib/notify.js";
import type * as lib_recurrence from "../lib/recurrence.js";
import type * as lib_spaces from "../lib/spaces.js";
import type * as members from "../members.js";
import type * as migrations from "../migrations.js";
import type * as migrationsNode from "../migrationsNode.js";
import type * as notifications from "../notifications.js";
import type * as reminders from "../reminders.js";
import type * as seed from "../seed.js";
import type * as spaces from "../spaces.js";
import type * as taskLists from "../taskLists.js";
import type * as tasks from "../tasks.js";
import type * as timetables from "../timetables.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiGuard: typeof aiGuard;
  aiNode: typeof aiNode;
  auth: typeof auth;
  calendar: typeof calendar;
  checkins: typeof checkins;
  http: typeof http;
  invites: typeof invites;
  "lib/notify": typeof lib_notify;
  "lib/recurrence": typeof lib_recurrence;
  "lib/spaces": typeof lib_spaces;
  members: typeof members;
  migrations: typeof migrations;
  migrationsNode: typeof migrationsNode;
  notifications: typeof notifications;
  reminders: typeof reminders;
  seed: typeof seed;
  spaces: typeof spaces;
  taskLists: typeof taskLists;
  tasks: typeof tasks;
  timetables: typeof timetables;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
