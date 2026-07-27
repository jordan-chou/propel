# Propel

Propel is a browser-based Word-to-HTML conversion and editing tool. It converts `.doc` and `.docx` documents with Mammoth.js, helps editors clean and enhance the generated markup, and produces HTML suitable for Canada.ca/WET publishing workflows.

The cleanup process was designed for the Finance Canada Web and Publishing Team and reflects its work preparing accessible, bilingual content for Canada.ca. Propel can also support other publishing teams with similar Word-to-web workflows.

The application runs entirely in the browser. It can be used from GitHub Pages,
downloaded as a portable offline release, or served locally from the source
repository. A production build is only needed to create the portable release.

## What Propel does

- Imports Word documents and converts them to HTML, or starts with a blank document for direct editing.
- Detects English or French metadata from DOCX files when available.
- Provides synchronized Live and Code editing views with reciprocal caret guidance.
- Adds line navigation and find-and-replace tools to Code view.
- Adds stable IDs to headings, tables, and figures.
- Generates publishing markup for footnotes.
- Corrects language-specific non-breaking spaces.
- Inserts previewable component snippets with editable placeholder text in Live or Code view.
- Cleans and interactively edits financial and complex tables, including their headers, footers, rows, columns, formatting, and accessibility relationships.
- Reports structural issues such as missing IDs, empty links, heading-level skips, unclean tables, and missing image `alt` attributes.
- Supports document and table-editor undo/redo.
- Offers structured problem reports and improvement requests through GitHub, with email options for detailed feedback or a short note.

## Using Propel

For the simplest option, visit [Propel on GitHub Pages](https://jordan-chou.github.io/propel/).
No installation is required; upload a Word document or start with a blank
document directly in the browser.

> **Privacy:** Propel does not send or collect your documents or editing data.
> Files are processed locally, and any recovery copies or preferences are
> stored only in your browser.

### Portable offline release

For offline use or secured networks, download the portable ZIP from the
[latest GitHub release](https://github.com/jordan-chou/propel/releases/latest).
The portable release uses classic local scripts, embeds data that would
otherwise require a runtime request, inlines its SVG icon sprite, and removes
remote stylesheet resources. Every GitHub release will include a ZIP containing
this bundled portable version.

Extract the entire archive, then double-click `index.html` in the extracted
folder. Keep the extracted files together; no installation or local server is
required.

#### Creating a release bundle

Install the development dependency and generate the release:

```sh
npm install
npm run verify:portable
```

The generated folder is `dist/portable/`. Package the complete folder as a
clearly labelled portable ZIP and attach it to the corresponding GitHub release.
The folder is ignored by Git and should be regenerated for each release rather
than edited manually.

Managed browsers can disable JavaScript on `file://` pages as an organizational
policy. The portable build avoids application-level CORS requests, but it cannot
override such a browser policy. Preferences stored by a `file://` page can also
vary by browser and by the file's location, so component libraries should be
exported when they need to move with the release.

### Localhost server

Alternatively, run Propel from the source repository using a local HTTP server.
The modular source application must be served over HTTP because browsers apply
origin checks to JavaScript modules loaded from `file://` URLs. From the
repository root, Python's built-in server is a simple option:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/` and upload a Word document. No `npm install`
is required for the current application or unit tests.

## Component libraries

Place the cursor in Live or Code view and choose **Insert component** to preview and insert a reusable HTML snippet. The inserted component includes editable placeholder text and does not replace highlighted document content. Tables can still be converted from their Live view hover control or with **Convert current table to component** in the table editor; those table actions use the source table to populate the chosen component. Chart text versions receive an editable placeholder rather than copied source-table content.

The starter library includes boxes, chart and figure layouts, a two-chart layout, and a quote. The component modal can also:

- Create components from a name, description, and HTML template containing exactly one `{{content}}` slot.
- Preview placeholder-filled insertion or source-table conversion output.
- Delete components while preserving at least one library entry.
- Import and export versioned JSON libraries from the ellipsis menu.

Custom libraries and locally created components are stored in browser `localStorage` under `propel.componentLibrary`, so they persist between sessions for the same browser and origin. Clearing site data removes this saved library. See [docs/component-libraries.md](docs/component-libraries.md) for the file format and insertion behavior.

## Table cleanup workflow

The table cleanup workflow was built around the Finance Canada Web and Publishing Team's requirements for turning Word tables—particularly financial tables—into accessible Canada.ca/WET markup. Cleanup remains an editor-controlled process: Propel prepares and previews the table, but changes are committed to the document only when the editor chooses **Apply** or **Apply and next**.

Within the table editor, an editor can:

- Review every table without losing its place in the Live document.
- Use detected table numbers, titles, and units as caption suggestions, and derive editable table IDs from table numbers.
- Apply financial alignment or French number formatting.
- Select and format cells, identify header and highlighted rows, merge cells, and indent hierarchical labels.
- Add footers or move selected source and note rows into a full-width `tfoot`.
- Delete selected rows or columns.
- Generate and inspect explicit `id` and `headers` relationships for complex, multi-level tables.
- Enter a locked scoping mode that disables unrelated editing controls while painting parent-to-child header relationships.
- Undo or redo table changes, cancel safely, and reopen a cleaned table without discarding its formatting.

## Local browser storage

Propel periodically saves the current canonical HTML to an IndexedDB database named
`propel-document-recovery`. After an unexpected browser or tab closure, returning
to Propel offers to restore, ignore, or discard the most recent compatible local
copy. Live or Code input is synchronized before a page-hide save is requested.
Recovery copies remain in the current browser and origin, are not transmitted by
Propel, and are removed when discarded or when the document is empty. Propel
retains only the latest recovery copy. Recovery can be disabled, or the saved
copy deleted immediately, from the Information panel.

Propel also stores the following JSON-encoded values in `localStorage`. They remain on the current browser and origin between sessions; they are not transmitted by Propel.

| Key | Purpose |
| --- | --- |
| `propel.componentLibrary` | The active imported or locally edited component library, including created and deleted components. Invalid stored data falls back to the starter library. |
| `propel.documentRecoveryEnabled` | Whether Propel may retain one local document-recovery copy in IndexedDB. Disabling it deletes the saved copy. |
| `propel.livePaneWidthRatio` | The selected width ratio between the synchronized Live and Code editor panes. |
| `propel.tableEditorSize` | The table editor’s saved width or height for its current responsive layout. |

Clearing the site’s browser data removes these values and document recovery copies.
Propel currently does not use cookies.

## Security and network access

Word conversion, editing, review, and recovery run locally in the browser.
Propel has no document API, analytics, telemetry, or automatic upload. Its
browser security policy blocks connection APIs, remote runtime resources,
embedded documents, form submission, inline script, and referrer disclosure.
Document HTML is sanitized before it can be rendered or saved for recovery.

Following a document link or choosing a Feedback destination is an explicit
external action. Publishing URLs remain in copied HTML but cannot load as
remote resources inside Propel. See [Security and privacy](docs/security.md) for
the threat model, storage controls, portable-build guarantees, and limitations.

The onboarding card uses `sessionStorage` under `propel.onboardingDismissed`.
Starting with a blank file hides the card for the current browser tab session,
including page reloads; it returns in a new session. The current recovery stream
identifier is stored in the same tab session under `propel.recoveryDraftId`, so a
reload reconnects to that tab’s saved copy.

## Feedback and issue reporting

Choose **Feedback** in Propel's header, or open **Information > Feedback**. Select issue or suggestion, add a short title and the essential details, then continue in either GitHub Issues or email. Propel prefills that entry and a privacy-safe environment summary in the selected destination; users only need to review, revise, and send.

GitHub requires an account. Email drafts are addressed to [web@fin.gc.ca](mailto:web@fin.gc.ca?cc=jordan.chou@fin.gc.ca&subject=Propel%20feedback), with `jordan.chou@fin.gc.ca` copied. Propel does not include the current URL or hostname. Do not include document content, personal or protected information, credentials, internal URLs, or full local file paths.

The application version is stored in `src/app/app-info.js`. Update `PROPEL_VERSION` when preparing a tagged release.

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
