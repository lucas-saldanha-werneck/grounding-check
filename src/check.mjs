// Offline grounding checks for RAG answers. No network, no dependencies.

const norm = (s) => s.toLowerCase().replace(/[“”"']/g, '"').replace(/\s+/g, ' ').trim();

const INJECTION = [
  /ignore (all |any )?(previous|prior|above) (instructions|rules)/i,
  /disregard (the )?(system|previous) (prompt|instructions)/i,
  /you are now\b/i,
  /reveal (your |the )?(system prompt|secrets?|api key)/i,
  /as the (ai|assistant|reviewer),? you must/i,
];

export function scanSource(source) {
  return INJECTION.filter((re) => re.test(source.text)).map((re) => ({
    type: 'injection-like-text',
    source: source.id,
    detail: `matches ${re}`,
  }));
}

function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

const citeRe = /\[(S[\w-]+)\]/g;
const quoteRe = /"([^"]{4,})"/g;
const numRe = /\b\d[\d.,]*%?/g;

export function checkAnswer(answer, sourcesById) {
  const issues = [];
  for (const sent of sentences(answer.answer)) {
    const cites = [...sent.matchAll(citeRe)].map((m) => m[1]);
    const bare = sent.replace(citeRe, '').trim();
    if (cites.length === 0) {
      issues.push({ type: 'uncited-sentence', detail: bare });
      continue;
    }
    const known = [];
    for (const id of cites) {
      if (sourcesById.has(id)) known.push(id);
      else issues.push({ type: 'unknown-citation', detail: id });
    }
    const pool = known.map((id) => norm(sourcesById.get(id).text));
    for (const m of bare.matchAll(quoteRe)) {
      const q = norm(m[1]);
      if (pool.length && !pool.some((t) => t.includes(q))) {
        issues.push({ type: 'quote-not-in-source', detail: m[1], cited: known });
      }
    }
    const unquoted = bare.replace(quoteRe, '');
    for (const m of unquoted.matchAll(numRe)) {
      const n = m[0].replace(/[.,]$/, '');
      if (pool.length && !pool.some((t) => t.includes(n))) {
        issues.push({ type: 'number-not-in-source', detail: n, cited: known });
      }
    }
  }
  return issues;
}

export function checkAll(data) {
  const sourcesById = new Map(data.sources.map((s) => [s.id, s]));
  const sourceIssues = data.sources.flatMap(scanSource);
  const answers = data.answers.map((a) => ({ id: a.id, issues: checkAnswer(a, sourcesById) }));
  return { sourceIssues, answers };
}

export function toMarkdown(result) {
  const bad = result.answers.filter((a) => a.issues.length);
  const lines = [
    '# Grounding report',
    '',
    `Answers checked: ${result.answers.length}. With problems: ${bad.length}. Sources flagged: ${new Set(result.sourceIssues.map((i) => i.source)).size}.`,
    '',
  ];
  for (const i of result.sourceIssues) lines.push(`- source ${i.source}: ${i.type} (${i.detail})`);
  for (const a of result.answers) {
    lines.push('', `## ${a.id}: ${a.issues.length ? 'PROBLEMS' : 'ok'}`);
    for (const i of a.issues) lines.push(`- ${i.type}: ${i.detail}${i.cited ? ` (cited ${i.cited.join(', ')})` : ''}`);
  }
  return lines.join('\n') + '\n';
}
