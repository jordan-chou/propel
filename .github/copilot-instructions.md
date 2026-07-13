# GitHub Copilot instructions for Propel

Propel is a browser-based Word-to-HTML editor for Canada.ca/WET publishing. Read `README.md`, `AGENTS.md`, and relevant `docs/` files before proposing broad changes.

- Preserve behavior during refactors; do not silently change publishing HTML, bilingual rules, accessibility semantics, editor synchronization, focus, or undo history.
- `DocumentStore` is the canonical document boundary. Do not create competing document state.
- Use stable `CommandRegistry` IDs for user-invokable operations.
- Prefer focused, stateless transformations with explicit inputs and structured results. Keep DOM rendering and UI controls outside transformation logic.
- Add Node tests for pure logic and real-browser tests for DOM, selection, shadow DOM, file, and `contenteditable` behavior.
- Run `npm run check` and `git diff --check`. Follow `docs/testing.md` for editor/conversion changes.
- Do not edit or reformat vendored JS/CSS or Font Awesome assets during application work.
- Propel has no content-facing AI integration. Do not add AI API clients, provider keys, remote document processing, or document-content telemetry unless explicitly requested as a separately reviewed feature. Copilot is used only to assist development.
- Reduce `src/propel.js` incrementally; avoid framework or whole-application rewrites without an explicit request and migration plan.
- Update documentation when setup, commands, architecture, or constraints change.
