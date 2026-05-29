// SEC-2: This endpoint is unauthenticated, so it must be a minimal liveness
// probe only. It deliberately returns NO env values, route lists, versions, or
// configuration details that would enable fingerprinting / route enumeration.
// It still returns 200 when the service can serve its admin-backed routes and
// 503 otherwise (the QA preflight pings this purely for reachability).
export function GET() {
  const healthy = Boolean(
    process.env.EXPO_PUBLIC_INSTANT_APP_ID &&
    process.env.INSTANT_ADMIN_TOKEN,
  );

  return Response.json({ ok: healthy }, { status: healthy ? 200 : 503 });
}
