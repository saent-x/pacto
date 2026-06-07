'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { Id } from './_generated/dataModel';
import { ActionCtx } from './_generated/server';

// Roughly 4MB of base64 (~3MB of audio) — generous for a short voice turn, but
// bounds per-call Whisper cost and request size.
const MAX_AUDIO_B64 = 4_000_000;
// Keep only the most recent turns so prompt-token cost per call stays bounded.
const MAX_HISTORY = 10;

// Chat-completions tool format (mirrors src/features/ai/tools.ts AI_TOOLS).
const TOOLS = [
  { type: 'function', function: { name: 'create_task', description: 'Create a task in the space.', parameters: { type: 'object', properties: { title: { type: 'string' }, priority: { type: 'string', enum: ['low', 'med', 'high'] } }, required: ['title'] } } },
  { type: 'function', function: { name: 'create_reminder', description: 'Create a reminder.', parameters: { type: 'object', properties: { title: { type: 'string' }, when: { type: 'string' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'create_checkin', description: 'Log a mood check-in.', parameters: { type: 'object', properties: { mood: { type: 'string', enum: ['rough', 'low', 'okay', 'steady', 'good', 'great'] }, note: { type: 'string' } }, required: ['mood'] } } },
  { type: 'function', function: { name: 'create_timetable', description: 'Create a timetable/routine.', parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'complete_task', description: 'Mark a task done (toggle) by its title.', parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'complete_reminder', description: 'Mark a reminder done by its title.', parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'list_tasks', description: "List the space's tasks (open and done).", parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_reminders', description: "List the space's reminders.", parameters: { type: 'object', properties: {} } } },
];

const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', hi: 'Hindi', ru: 'Russian', tr: 'Turkish', pl: 'Polish', sv: 'Swedish',
};

const norm = (s: string) => s.toLowerCase().trim();
function findByTitle<T extends { title?: string }>(items: T[], title: string): T | undefined {
  const t = norm(title);
  return (
    items.find((i) => norm(i.title ?? '') === t) ||
    items.find((i) => norm(i.title ?? '').includes(t)) ||
    items.find((i) => t.includes(norm(i.title ?? '')))
  );
}

async function execTool(ctx: ActionCtx, spaceId: Id<'spaces'>, name: string, args: Record<string, any>) {
  switch (name) {
    case 'create_task':
      await ctx.runMutation(api.tasks.createTask, { spaceId, title: String(args.title), priority: args.priority, dueLabel: 'Today' });
      return { ok: true, created: 'task', title: args.title };
    case 'create_reminder':
      await ctx.runMutation(api.reminders.createReminder, { spaceId, title: String(args.title), whenLabel: args.when });
      return { ok: true, created: 'reminder', title: args.title };
    case 'create_checkin':
      await ctx.runMutation(api.checkins.createCheckin, { spaceId, mood: String(args.mood), note: args.note });
      return { ok: true, created: 'checkin', mood: args.mood };
    case 'create_timetable':
      await ctx.runMutation(api.timetables.createTimetable, { spaceId, title: String(args.title), items: [] });
      return { ok: true, created: 'timetable', title: args.title };
    case 'complete_task': {
      const tasks = await ctx.runQuery(api.tasks.listTasks, { spaceId });
      const match = findByTitle(tasks ?? [], String(args.title));
      if (!match) return { ok: false, error: `No task matching "${args.title}"` };
      await ctx.runMutation(api.tasks.toggleTask, { taskId: match._id });
      return { ok: true, completed: 'task', title: match.title };
    }
    case 'complete_reminder': {
      const reminders = await ctx.runQuery(api.reminders.listReminders, { spaceId });
      const match = findByTitle(reminders ?? [], String(args.title));
      if (!match) return { ok: false, error: `No reminder matching "${args.title}"` };
      await ctx.runMutation(api.reminders.toggleReminder, { reminderId: match._id });
      return { ok: true, completed: 'reminder', title: match.title };
    }
    case 'list_tasks': {
      const tasks = await ctx.runQuery(api.tasks.listTasks, { spaceId });
      return { tasks: (tasks ?? []).map((t) => ({ title: t.title, done: t.done })) };
    }
    case 'list_reminders': {
      const reminders = await ctx.runQuery(api.reminders.listReminders, { spaceId });
      return { reminders: (reminders ?? []).map((r) => ({ title: r.title, done: r.done, when: r.whenLabel })) };
    }
    default:
      return { ok: false, error: `unknown tool ${name}` };
  }
}

// Whisper engine: transcribe audio (Whisper) + run a gpt-4o-mini text agent with
// tool-calling. Cheaper than Realtime; returns transcript + reply.
export const whisperTurn = action({
  args: {
    spaceId: v.id('spaces'),
    audioBase64: v.optional(v.string()),
    text: v.optional(v.string()),
    lang: v.optional(v.string()),
    history: v.optional(v.array(v.object({ role: v.string(), content: v.string() }))),
  },
  handler: async (ctx, { spaceId, audioBase64, text, lang, history }) => {
    // Gate BEFORE any paid OpenAI call: authenticate, confirm the caller is a
    // member of the space, and apply a per-user rate limit. Previously the only
    // membership check happened transitively inside the tool mutations, which
    // run AFTER Whisper + GPT calls were already billed.
    await ctx.runMutation(internal.aiGuard.guard, {
      kind: 'whisper',
      limit: 20,
      windowMs: 60_000,
      spaceId,
    });
    if (audioBase64 && audioBase64.length > MAX_AUDIO_B64) throw new Error('AUDIO_TOO_LARGE');
    const trimmedHistory = (history ?? []).slice(-MAX_HISTORY);

    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const langName = LANG_NAMES[lang ?? ''] ?? 'English';

    // 1) Transcribe (Whisper) or use the provided text.
    let transcript = (text ?? '').trim();
    if (audioBase64) {
      // Node Buffer via globalThis (avoids node-global typing in the app tsc).
      const buf = (globalThis as any).Buffer.from(audioBase64, 'base64');
      const form = new FormData();
      form.append('file', new Blob([buf], { type: 'audio/m4a' }), 'audio.m4a');
      form.append('model', 'whisper-1');
      // Pin Whisper to the device language so noise can't be misdetected as another language.
      if (lang) form.append('language', lang);
      const tr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      if (!tr.ok) throw new Error(`Whisper failed (${tr.status}): ${(await tr.text()).slice(0, 200)}`);
      transcript = ((await tr.json()) as { text?: string }).text?.trim() ?? '';
    }
    if (!transcript) return { transcript: '', reply: "I didn't catch that." };

    // 2) Space context for the system prompt.
    const cx = await ctx.runQuery(api.spaces.currentContext, {});
    const others = (cx?.members ?? []).filter((m: any) => !m.isYou).map((m: any) => m.displayName);
    const system =
      `You are Pacto, a warm, concise assistant inside the Pacto app. ` +
      `The current space is "${cx?.space?.name ?? 'Personal'}" (${cx?.space?.type ?? 'solo'})` +
      (others.length ? `, shared with ${others.join(', ')}` : '') +
      `. When the user asks to add/create/schedule/log/complete/finish/update/list something, CALL the matching tool. ` +
      `To complete or update existing items, refer to them by title — the tools look them up. ` +
      `After a tool succeeds, confirm in one short sentence. Keep replies to 1–2 sentences. ` +
      `You MUST reply ONLY in ${langName}. Never reply in any other language.`;

    const msgs: any[] = [
      { role: 'system', content: system },
      ...trimmedHistory,
      { role: 'user', content: transcript },
    ];

    // 3) Tool-calling loop.
    let reply = '';
    for (let i = 0; i < 5; i++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: msgs, tools: TOOLS, tool_choice: 'auto', temperature: 0.3 }),
      });
      if (!res.ok) throw new Error(`Chat failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as any;
      const m = data.choices?.[0]?.message;
      if (!m) break;
      msgs.push(m);
      if (m.tool_calls?.length) {
        for (const tc of m.tool_calls) {
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch {}
          let result;
          try {
            result = await execTool(ctx, spaceId, tc.function.name, args);
          } catch (e: any) {
            result = { ok: false, error: String(e?.message ?? e) };
          }
          msgs.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }
      reply = m.content ?? '';
      break;
    }
    return { transcript, reply };
  },
});
