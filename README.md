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
- Converts selected Live or Code content with previewable, importable component libraries.
- Cleans and interactively edits complex tables.
- Reports structural issues such as missing IDs, empty links, heading-level skips, unclean tables, and missing image `alt` attributes.
- Supports document and table-editor undo/redo.

## Running locally

The modular source application must be served over HTTP because browsers apply
origin checks to JavaScript modules loaded from `file://` URLs. From the
repository root, Python's built-in server is a simple option:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/` and upload a Word document. No `npm install` is required for the current application or unit tests.

## Portable offline release

Propel can also be packaged for offline use on secured networks. The portable
release uses classic local scripts, embeds data that would otherwise require a
runtime request, inlines its SVG icon sprite, and removes remote stylesheet
resources. Users launch it by double-clicking `index.html`; no local server is
required.

Install the development dependency and generate the release:

```sh
npm install
npm run verify:portable
```

The generated folder is `dist/portable/`. Copy that whole folder to the target
computer and open `dist/portable/index.html`. The folder is ignored by Git and
should be regenerated for each release rather than edited manually.

Managed browsers can disable JavaScript on `file://` pages as an organizational
policy. The portable build avoids application-level CORS requests, but it cannot
override such a browser policy. Preferences stored by a `file://` page can also
vary by browser and by the file's location, so component libraries should be
exported when they need to move with the release.

## Component libraries

Select content in Live or Code view and choose **Convert to component** to preview and apply a reusable HTML component. Tables can also be converted from their Live view hover control or with **Convert current table to component** in the table editor. Converted source tables are removed from the table-editor pagination list, including tables retained inside chart text versions for accessibility.

The starter library includes boxes, chart and figure layouts, a two-chart layout, and a quote. The component modal can also:

- Create components from a name, description, and HTML template containing exactly one `{{content}}` slot.
- Preview highlighted content and component output before conversion.
- Delete components while preserving at least one library entry.
- Import and export versioned JSON libraries from the ellipsis menu.

Custom libraries and locally created components are stored in browser `localStorage` under `propel.componentLibrary`, so they persist between sessions for the same browser and origin. Clearing site data removes this saved library. See [docs/component-libraries.md](docs/component-libraries.md) for the file format and supported smart-conversion modes.

## Local browser storage

Propel stores the following JSON-encoded values in `localStorage`. They remain on the current browser and origin between sessions; they are not transmitted by Propel.

| Key | Purpose |
| --- | --- |
| `propel.componentLibrary` | The active imported or locally edited component library, including created and deleted components. Invalid stored data falls back to the starter library. |
| `propel.livePaneWidthRatio` | The selected width ratio between the synchronized Live and Code editor panes. |
| `propel.tableEditorSize` | The table editor’s saved width or height for its current responsive layout. |

Clearing the site’s browser data removes these values and restores their defaults. Propel currently does not use cookies.

The onboarding card uses `sessionStorage` under `propel.onboardingDismissed`. Starting with a blank file hides the card for the current browser tab session, including page reloads; it returns in a new session.

## Philosophy

Propel is intended to keep document conversion and editing simple, understandable, and under the user's control. It should never perform destructive or drastic changes without explicit user intervention. When a change could significantly alter content or structure, Propel should make the action clear and leave the decision to the user.

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
scripts/                   Portable build and artifact checks
test/unit/                 Node unit tests
test/browser/              Real-browser characterization tests
docs/                      Architecture, testing, legacy, and vendor notes
```

See [docs/architecture.md](docs/architecture.md) for dependency direction and architectural rules. Third-party distributions are described in [docs/vendor.md](docs/vendor.md); they should not be reformatted or mixed into application refactors.

## Architecture principles

The internal document root managed by `DocumentStore` is the canonical document. The live editor, code editor, table editor, and review panel are views or clients of that state—not competing sources of truth.

Commands use stable identifiers through `CommandRegistry`. New transformations should accept explicit input and options and return structured output such as HTML, changes, warnings, and affected paths. A transformation should not reach into unrelated page controls or retain the current document in module-global state.

Refactors should be incremental and compatibility-preserving. Add characterization tests before changing publishing algorithms, especially for English/French typography, footnotes, table structure, editor synchronization, and undo history.

## AI-assisted development

Most future programming is expected to be performed with tools such as Codex and GitHub Copilot. Repository-specific instructions are therefore checked in at:

- [AGENTS.md](AGENTS.md), for Codex and compatible coding agents.
- [.github/copilot-instructions.md](.github/copilot-instructions.md), for GitHub Copilot.

AI-generated changes are held to the same standard as human changes: inspect the relevant execution path, preserve existing behavior unless a behavior change is requested, add or update tests, run `npm run check`, and report browser interactions that were not actually exercised. Generated code should fit the existing architecture instead of adding another state owner or bypassing the command/document boundaries.

## AI connectivity

Propel does not contain an AI provider integration, AI API endpoint, API key handling, document-upload mechanism, or AI content-processing feature. References to Codex and Copilot in this repository describe development tools only; they are not part of the running application.

Any future proposal to send document content to an AI service must be treated as a new, explicitly reviewed feature with privacy, security, consent, retention, accessibility, and server-side credential requirements. It must not be introduced incidentally during ordinary development.

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
