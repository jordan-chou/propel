# Propel

Propel is a browser-based Word-to-HTML conversion and editing tool. It converts `.doc` and `.docx` documents with Mammoth.js, helps editors clean and enhance the generated markup, and produces HTML suitable for Canada.ca/WET publishing workflows.

The application runs locally in the browser and currently has no production build step or application server.

## What Propel does

- Imports Word documents and converts them to HTML.
- Detects English or French metadata from DOCX files when available.
- Provides synchronized live and code editing views.
- Adds stable IDs to headings, tables, and figures.
- Generates publishing markup for footnotes.
- Corrects language-specific non-breaking spaces.
- Cleans and interactively edits complex tables.
- Reports structural issues such as missing IDs, empty links, heading-level skips, unclean tables, and missing image `alt` attributes.
- Supports document and table-editor undo/redo.
- Splits documents by first-level headings and copies the resulting HTML.

## Running locally

Propel uses ES modules and must be served over HTTP rather than opened directly with a `file:` URL.

From the repository root, start any static web server. For example, if Python is available:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/` and upload a Word document. No `npm install` is required for the current application or unit tests.

## Testing

Run syntax checks and dependency-free unit tests:

```sh
npm run check
```

Run only the unit tests:

```sh
npm test
```

DOM behavior is tested in a real browser. While serving the repository, open `/test/browser.html`; its title and page output report PASS or FAIL. Before merging editor or conversion changes, also follow the manual regression checklist in [docs/testing.md](docs/testing.md).

## Project structure

```text
index.html                 Application shell and dialogs
css/                       Application and vendored styles
src/propel.js              Browser composition and remaining UI orchestration
src/app/                   Application-level coordination
src/commands/              Publishing transformations and command registry
src/conversion/            DOCX/Mammoth integration
src/document/              Canonical document state and cleanup
src/review/                Document analysis
src/table-editor/          Table-editor model and feature modules
src/ui/                    Shared browser UI utilities
src/ai/                    Provider-neutral AI proposal boundary
test/unit/                 Node unit tests
test/browser/              Real-browser characterization tests
docs/                      Architecture, testing, legacy, and vendor notes
```

See [docs/architecture.md](docs/architecture.md) for dependency direction and architectural rules. Third-party distributions are described in [docs/vendor.md](docs/vendor.md); they should not be reformatted or mixed into application refactors.

## Architecture principles

The internal document root managed by `DocumentStore` is the canonical document. The live editor, code editor, table editor, review panel, and future AI features are views or clients of that state—not competing sources of truth.

Commands use stable identifiers through `CommandRegistry`. New transformations should accept explicit input and options and return structured output such as HTML, changes, warnings, and affected paths. A transformation should not reach into unrelated page controls or retain the current document in module-global state.

Refactors should be incremental and compatibility-preserving. Add characterization tests before changing publishing algorithms, especially for English/French typography, footnotes, table structure, editor synchronization, and undo history.

## AI-assisted development

Most future programming is expected to be performed with tools such as Codex and GitHub Copilot. Repository-specific instructions are therefore checked in at:

- [AGENTS.md](AGENTS.md), for Codex and compatible coding agents.
- [.github/copilot-instructions.md](.github/copilot-instructions.md), for GitHub Copilot.

AI-generated changes are held to the same standard as human changes: inspect the relevant execution path, preserve existing behavior unless a behavior change is requested, add or update tests, run `npm run check`, and report browser interactions that were not actually exercised. Generated code should fit the existing architecture instead of adding another state owner or bypassing the command/document boundaries.

## Future content-facing AI

Propel may eventually connect document content to an AI provider. This is separate from using AI to develop Propel.

The existing `src/ai/` layer treats content AI as a proposal system:

1. Propel creates a revisioned document snapshot and explicitly selected context.
2. A provider returns a structured proposal rather than directly editing HTML.
3. Propel validates the schema and document revision.
4. The user reviews the proposal or diff.
5. An accepted change enters normal document history and remains undoable.

Provider credentials must not be placed in browser source. Production provider calls should use an authenticated server-side adapter. Document content should be minimized, deliberately selected, and excluded from logs; privacy and retention requirements must be decided before enabling remote content processing.

## Adding a feature

1. Determine whether the feature is a transformation, analysis, editor interaction, or UI concern.
2. Put deterministic rules in a focused module rather than `propel.js`.
3. Register user-invokable operations with a stable command ID.
4. Mutate the canonical document through its established boundary and create one meaningful undo entry.
5. Add unit tests for pure logic and browser tests for DOM behavior.
6. Check both English and French behavior where generated language or typography is involved.
7. Run `npm run check` and the relevant browser smoke tests.

## Current constraints

- Some UI and table-editor orchestration remains in the large `src/propel.js` module and should be extracted gradually, with characterization coverage.
- Browser selection, shadow DOM, file input, and `contenteditable` behavior cannot be fully validated by the Node test suite.
- Some older, unreferenced implementations remain documented in [docs/legacy.md](docs/legacy.md) pending a separately reviewed removal.
- Exact upstream versions of older vendored distributions were not recorded historically.

## Accessibility and publishing care

Propel manipulates publishing markup, so visually plausible output is not sufficient. Preserve semantic heading order, link purpose, table header relationships, footnote navigation, keyboard behavior, focus restoration, accessible names, and valid English/French publishing text. AI-suggested alt text, table semantics, or structural changes always require human review.
