import { httpRouter } from "convex/server";
import type { CreateAuth } from "@convex-dev/better-auth";
import { authComponent, createAuth } from "./betterAuth/auth";
import type { DataModel } from "./_generated/dataModel";

const http = httpRouter();

// Better Auth exposes a broader baseURL type than Convex's route helper expects.
authComponent.registerRoutes(http, createAuth as CreateAuth<DataModel>);

export default http;
