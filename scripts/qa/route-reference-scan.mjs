#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../..', import.meta.url));

const retiredPatterns = [
  /\/\(tabs\)\/us\/(?:wishlists|milestones|notes)\b/,
  /\/us\/(?:wishlists|milestones|notes)\b/,
  /\/sheets\/(?:new-wish|new-milestone|new-note)\b/,
  /\buse(?:Wishlists|Milestones|LoveNotes)\b/,
];

const allowedFiles = new Set([
  'src/lib/space-actions.ts',
  'src/lib/base-solo-backfill.ts',
]);

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-cmo', '--exclude-standard', 'app', 'src'], {
    cwd: root,
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .filter(Boolean)
    .filter((path) => existsSync(join(root, path)))
    .filter((path) => !path.startsWith('src/test/'))
    .filter((path) => !allowedFiles.has(path));
}

const findings = [];
for (const file of trackedFiles()) {
  const abs = join(root, file);
  const text = readFileSync(abs, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const pattern of retiredPatterns) {
      if (pattern.test(line)) {
        findings.push({
          file: relative(root, abs),
          line: index + 1,
          text: line.trim(),
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Retired feature references found in active app code:');
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.text}`);
  }
  process.exit(1);
}

console.log('No retired feature route references found in active app code.');
