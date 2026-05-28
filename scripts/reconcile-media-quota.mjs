#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const COMMANDS = new Set(['dry-run', 'apply']);

export function buildMediaQuotaReconciliation(spaces, options = {}) {
  const idFactory = options.idFactory ?? defaultId;
  const actions = [];
  const summary = {
    spaces: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
    unchanged: 0,
  };

  for (const space of Array.isArray(spaces) ? spaces : []) {
    if (!space?.id) continue;
    summary.spaces += 1;
    const bytesUsed = attachmentBytesForSpace(space);
    const quotaRows = relationArray(space.mediaQuota).filter((quota) => quota?.id);
    const beforeActions = actions.length;

    if (quotaRows.length === 0) {
      actions.push({
        type: 'create',
        spaceId: space.id,
        quotaId: idFactory(),
        bytesUsed,
      });
      summary.creates += 1;
      continue;
    }

    const canonicalQuota = quotaRows[0];
    const previousBytesUsed = positiveNumberOrZero(canonicalQuota.bytesUsed);
    if (previousBytesUsed !== bytesUsed) {
      actions.push({
        type: 'update',
        spaceId: space.id,
        quotaId: canonicalQuota.id,
        previousBytesUsed,
        bytesUsed,
      });
      summary.updates += 1;
    }

    for (const duplicateQuota of quotaRows.slice(1)) {
      actions.push({
        type: 'delete',
        spaceId: space.id,
        quotaId: duplicateQuota.id,
      });
      summary.deletes += 1;
    }

    if (actions.length === beforeActions) {
      summary.unchanged += 1;
    }
  }

  return { summary, actions };
}

export function buildMediaQuotaReconciliationTransactions(db, actions, timestamp = Date.now()) {
  return actions.map((action) => {
    if (action.type === 'delete') {
      return db.tx.mediaQuotaUsage[action.quotaId].delete();
    }
    return db.tx.mediaQuotaUsage[action.quotaId]
      .update({ bytesUsed: action.bytesUsed, updatedAt: timestamp })
      .link({ space: action.spaceId });
  });
}

export async function runMediaQuotaReconciliation({
  db,
  mode,
  timestamp = Date.now(),
  idFactory = defaultId,
}) {
  const data = await db.query({
    spaces: {
      memories: {
        attachments: {},
      },
      mediaQuota: {},
    },
  });
  const plan = buildMediaQuotaReconciliation(data?.spaces ?? [], { idFactory });
  const txns = buildMediaQuotaReconciliationTransactions(db, plan.actions, timestamp);

  let txId = null;
  if (mode === 'apply' && txns.length > 0) {
    const result = await db.transact(txns);
    txId = result?.['tx-id'] ?? null;
  }

  return {
    mode,
    summary: plan.summary,
    opCount: txns.length,
    txId,
    actions: plan.actions,
  };
}

function attachmentBytesForSpace(space) {
  let total = 0;
  for (const memory of relationArray(space.memories)) {
    for (const attachment of relationArray(memory?.attachments)) {
      total += positiveNumberOrZero(attachment?.mediaSize);
    }
  }
  return total;
}

function relationArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function positiveNumberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function defaultId() {
  return randomUUID();
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find((arg) => COMMANDS.has(arg)) ?? 'dry-run';
  const writeEvidence = args.includes('--write-evidence');

  loadDotEnvFiles();
  const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;
  const adminToken = process.env.INSTANT_ADMIN_TOKEN;
  if (!appId || !adminToken) {
    throw new Error('Missing EXPO_PUBLIC_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN.');
  }
  if (mode === 'apply') {
    assertStagingWriteGuard(appId);
  }

  const { init, id: instantId } = await import('@instantdb/admin');
  const db = init({ appId, adminToken });
  const result = await runMediaQuotaReconciliation({ db, mode, idFactory: instantId });
  const output = { ...result, appId };
  if (writeEvidence) {
    writeEvidenceFile('media-quota-reconcile', output);
  }
  console.log(JSON.stringify(output, null, 2));
}

function assertStagingWriteGuard(appId) {
  if (process.env.COUPL_QA_ENV !== 'staging') {
    throw new Error('Refusing quota writes without COUPL_QA_ENV=staging.');
  }
  if (process.env.COUPL_QA_CONFIRM_APP_ID !== appId) {
    throw new Error('Refusing quota writes unless COUPL_QA_CONFIRM_APP_ID exactly matches EXPO_PUBLIC_INSTANT_APP_ID.');
  }
  if (process.env.COUPL_QA_ALLOW_STAGING_WRITES !== '1') {
    throw new Error('Refusing quota writes without COUPL_QA_ALLOW_STAGING_WRITES=1.');
  }
}

function writeEvidenceFile(prefix, result) {
  const dir = join(process.cwd(), 'docs/qa/evidence');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  writeFileSync(join(dir, `${prefix}-${stamp}.json`), `${JSON.stringify(result, null, 2)}\n`);
}

function loadDotEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function isMainModule() {
  return import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
