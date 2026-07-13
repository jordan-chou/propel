# Instructions for AI coding agents

These instructions apply to the entire repository. Propel is expected to be developed primarily with AI coding assistants, so leave the codebase easier for the next agent to understand and verify.

## Start every task with context

- Read `README.md` and the directly relevant files in `docs/` before changing architecture or behavior.
- Trace the actual browser entry point from `index.html` and `src/propel.js`; do not infer that an unreferenced file is active.
- Inspect `git status` and preserve unrelated user changes.
- Treat `src/mammoth.browser.js`, `src/beautify-html.js`, `src/prettify.js`, `src/run_prettify.js`, minified CSS, and Font Awesome assets as vendored code. Do not reformat or edit them during application work.

## Preserve behavior deliberately

- Do not combine a structural refactor with an unrequested publishing-rule change.
- Add characterization coverage before altering HTML transformations, synchronization, history, table behavior, or bilingual output.
- Preserve existing DOM output, command order, focus behavior, undo boundaries, and English/French behavior unless the task explicitly changes them.
- Never claim a browser workflow was tested unless it was actually exercised. State what remains for manual verification.

## Architectural boundaries

- `DocumentStore` owns canonical document state. Do not introduce another independent document state owner.
- Live/code/table editors and review/AI features consume or update the canonical document through established synchronization and mutation boundaries.
- Register user-invokable operations with stable IDs in `CommandRegistry`.
- Prefer stateless transformations with explicit inputs and structured results. Avoid module-global document state and direct access to unrelated UI elements.
- Keep analysis separate from rendering, provider adapters separate from AI proposal policy, and third-party conversion code behind adapters.
- Reduce `src/propel.js` through small, tested extractions; do not replace it with a large rewrite.

## Content-facing AI rules

- AI proposes; it does not directly mutate document HTML.
- Require structured, schema-validated responses tied to a document revision or fingerprint.
- Show a human-reviewable proposal/diff before applying content changes, and make accepted changes undoable.
- Send only explicitly selected context. Do not log document contents.
- Never place provider credentials in client-side code. Use a server-side authenticated adapter for remote providers.
- Treat accessibility semantics, alt text, table headers, and bilingual publishing output as human-reviewed decisions.

## Verification

- Run `npm run check` after JavaScript changes.
- Add/update tests under `test/unit/` for pure logic and `test/browser/` for DOM behavior.
- For editor, conversion, or table changes, use the checklist in `docs/testing.md` with the supplied DOCX fixture.
- Run `git diff --check` before handoff.
- Keep documentation and these instructions synchronized when commands, architecture, setup, or constraints change.

## Handoff quality

- Explain the outcome, tests run, and any browser/manual checks not run.
- Link to the most relevant changed files.
- Do not leave speculative abstractions, unused modules, debug logging, secrets, or generated dependency output behind.

