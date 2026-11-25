import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkAll, checkAnswer, scanSource, toMarkdown } from '../src/check.mjs';

const sample = JSON.parse(readFileSync(new URL('../examples/sample.json', import.meta.url)));
const res = checkAll(sample);
const byId = (id) => res.answers.find((a) => a.id === id).issues;

test('good answer has no issues', () => assert.deepEqual(byId('a1-good'), []));
test('wrong number is flagged', () => {
  assert.equal(byId('a2-wrong-number')[0].type, 'number-not-in-source');
  assert.equal(byId('a2-wrong-number')[0].detail, '60');
});
test('invented quote is flagged', () => assert.equal(byId('a3-bad-quote')[0].type, 'quote-not-in-source'));
test('uncited sentence is flagged, cited one is not', () => {
  const t = byId('a4-uncited').map((i) => i.type);
  assert.deepEqual(t, ['uncited-sentence']);
});
test('unknown citation id is flagged', () => assert.equal(byId('a5-unknown-source')[0].type, 'unknown-citation'));
test('injection-like text in a source is flagged', () => {
  assert.equal(res.sourceIssues.length, 1);
  assert.equal(res.sourceIssues[0].source, 'S3');
});
test('clean source has no injection flag', () => assert.deepEqual(scanSource(sample.sources[0]), []));
test('quote match ignores case and spacing', () => {
  const m = new Map([['S1', { id: 'S1', text: 'Pay  within\n30 days.' }]]);
  assert.deepEqual(checkAnswer({ answer: 'It says "PAY within 30 days" [S1].' }, m), []);
});
test('markdown summary counts problems', () => {
  assert.match(toMarkdown(res), /Answers checked: 5\. With problems: 4\. Sources flagged: 1\./);
});
