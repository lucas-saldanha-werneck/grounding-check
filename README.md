# grounding-check

Independent demo, not affiliated with Jobgether (cliente não diz).

A small Node script that checks whether answers from a RAG system stick to the sources they cite. It runs offline and has no dependencies.

I built it after applying for an AI Solution Architect role. The posting asks for RAG, hallucination mitigation and prompt-injection safeguards. This is the cheapest version of those three checks I could think of.

## What it checks

For each answer, sentence by sentence:

- **uncited-sentence**: the sentence has no `[S1]`-style citation.
- **unknown-citation**: it cites a source id that is not in the input.
- **quote-not-in-source**: text in double quotes does not appear in the cited source (case and spacing are ignored).
- **number-not-in-source**: a number in the sentence does not appear in the cited source.

For each source: **injection-like-text** if it contains phrases such as "ignore previous instructions". That text would reach the model through retrieval, so it is worth a look before it does.

## Run it

Needs Node 20 or newer.

```
node src/cli.mjs examples/sample.json
node src/cli.mjs examples/sample.json --out report.md
npm test
```

Exit code is 1 when any problem is found, 0 when clean, 2 on bad usage.

Input is one JSON file with `sources` (`id`, `text`) and `answers` (`id`, `answer`). `examples/sample.json` is invented example data, with one good answer and four planted mistakes.

## What was tested

- 9 offline tests (`node --test`) cover each check on the example file: a clean answer, a wrong number, an invented quote, an uncited sentence, an unknown source id, an injected source, and case and spacing in quote matching.
- The same tests run in GitHub Actions on every push.

## What was not tested

- No real RAG output, real documents or real model answers. Only the invented example file.
- Number matching is plain text search. "30" would match inside "300", and "thirty" is not read as a number.
- Quote matching needs the exact words. A paraphrase in quotes is flagged, and a correct quote with a different meaning is not.
- The injection list is five regular expressions. It will miss anything phrased differently or in another language.
- It does not check whether a cited source actually supports the claim in meaning. That needs a human or a model judge.
