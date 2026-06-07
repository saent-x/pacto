import { action } from './_generated/server';
import { internal } from './_generated/api';

// Mints a short-lived OpenAI Realtime ephemeral client secret. The real
// OPENAI_API_KEY stays on the Convex deployment and never reaches the client.
// Gated behind authentication + a per-user rate limit: each mint hits OpenAI's
// paid endpoint and returns a credential that bills our account, so an
// unauthenticated or runaway caller must never reach the fetch below.
export const realtimeToken = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.aiGuard.guard, {
      kind: 'realtime',
      limit: 30,
      windowMs: 60_000,
    });
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set on the Convex deployment');
    const model = 'gpt-realtime';
    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: { type: 'realtime', model } }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Realtime token mint failed (${res.status}): ${t.slice(0, 300)}`);
    }
    const data = (await res.json()) as { value?: string; client_secret?: { value?: string } };
    const value = data.value ?? data.client_secret?.value;
    if (!value) throw new Error('No ephemeral token in Realtime response');
    return { value, model };
  },
});
