#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { checkAll, toMarkdown } from './check.mjs';

const [file, flag, out] = process.argv.slice(2);
if (!file) {
  console.error('usage: grounding-check <input.json> [--out report.md]');
  process.exit(2);
}
const result = checkAll(JSON.parse(readFileSync(file, 'utf8')));
const md = toMarkdown(result);
if (flag === '--out' && out) writeFileSync(out, md);
else process.stdout.write(md);
const problems = result.answers.some((a) => a.issues.length) || result.sourceIssues.length;
process.exit(problems ? 1 : 0);
