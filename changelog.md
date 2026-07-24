# Changelog

## July 15–24, 2026

This period includes 41 commits focused on Code-view tools, safer local editing and recovery, portable releases, table accessibility, and feedback.

### Code editing and workspace

- Added Code-view line navigation and find-and-replace, with keyboard controls, result navigation, replacement actions, and browser coverage.
- Virtualized Code-view syntax highlighting so only the visible region is rendered, improving performance on large documents.
- Added reciprocal caret indicators between Live and Code views to make the corresponding editing position easier to follow.
- Added a blank-document onboarding option.
- Fixed heading-level changes so the selected block receives the correct replacement tag.

### Local editing and document recovery

- Added browser-based document recovery backed by IndexedDB, including restore, ignore, and discard choices after an unexpected tab or browser closure.
- Normalized browser-generated markup from Live edits while preserving valid typing contexts and caret behavior.
- Removed empty paragraphs created during Live editing and empty anchors during cleanup without interrupting continued editing.

### Table cleanup and accessibility

- Added editable table ID suggestions derived from detected table numbers.
- Updated generated scoped-header IDs to incorporate the table ID and keep complex-table relationships easier to identify.
- Improved the locked table-scoping workflow and its control states while assigning header relationships.
- Added table-column deletion with compatible updates to selections and scoped headers.
- Preserved Live-view scroll position while opening and closing table cleanup, retained cleaned-table formatting when reopening, constrained wide previews, and refined financial-table footer markup.

### Components

- Changed the primary component workflow to insert previewed components at the current Live or Code caret, with editable placeholder content.
- Fixed the starter chart component template and updated the component-library documentation and tests for insertion behavior.

### Portable offline release

- Added a verified portable build that bundles the modular application into files that can run locally without an application server.
- Embedded data and icons needed at runtime, removed remote stylesheet dependencies from the portable output, and documented how to build and distribute release ZIPs.
- Kept generated `dist/portable/` artifacts out of version control so releases are regenerated from source.

### Feedback and support

- Added a structured Feedback dialog for reporting issues or suggesting improvements through GitHub or email.
- Prefilled reports with a privacy-safe browser and Propel environment summary, streamlined the form and GitHub templates, and corrected issue-form validation.
- Updated help guidance, feedback controls, and support contact information.

### Documentation and testing

- Expanded the README to describe the Finance Canada publishing workflow, portable downloads, document recovery, component insertion, and feedback.
- Updated the DOCX regression fixture and added unit and browser coverage for the new Code, recovery, feedback, Live-editing, and table behaviors.

## July 7–14, 2026

This period includes 108 commits focused on editing workflows, complex tables, reusable components, review tooling, performance, and application architecture.

### Editing and workspace

- Redesigned the application with a modern cool-blue interface, updated typography, Font Awesome icons, and a slimmer command rail.
- Added synchronized Live and Code views with click-to-sync navigation and improved caret and highlight alignment.
- Added responsive horizontal and vertical pane layouts, draggable splitter guides, snapping, and persistent pane sizing.
- Added numbered-list and indent/outdent controls plus keyboard navigation between parent and child elements.
- Expanded the OS-aware keyboard shortcut cheatsheet and improved its layout and accessibility.
- Improved document onboarding and loading feedback.
- Deferred expensive editor refresh work while the user is typing and reduced syntax-highlighting work to keep large documents responsive.
- Automatically closes open drawers, dialogs, and other transient UI when a new file is uploaded, leaving the new document in a clean workspace.

### Table cleanup and complex-table editing

- Added a full interactive Table Cleanup editor.
- Added multi-cell selection, row activation, bold formatting, financial formatting, French number formatting, and table-option controls.
- Synchronized navigation between the table editor and the corresponding table in Live view.
- Added Live-view table outlines and hover controls.
- Improved table caption suggestions by detecting useful nearby text more accurately.
- Added responsive table-editor layouts, persistent sizing, improved pagination, and a consistently visible preview scrollbar.
- Added support for moving selected row content into `tfoot`.
- Added interactive complex-table scoping that generates `id` and `headers` relationships for multi-level and `colspan` header structures.
- Shortened generated table-header IDs and stopped automatically activating `colspan` rows.
- Combined related table configuration changes into unified undo/history actions.
- Improved handling of tables converted into reusable components.
- Fixed Live-view table overlays so their edit and conversion controls receive clicks reliably.
- Clarified and emphasized the table editor's component-conversion control.

### Component libraries

- Added a **Convert to component** workflow for selected Live or Code content.
- Added component conversion from Live-view tables and the table editor.
- Added starter components for boxes, notices, figures, quotes, and single- and two-chart layouts.
- Added smart mapping for headings, quotes, figures, charts, authors, citations, and accessible text versions.
- Expanded chart conversion to support stored custom templates and source tables containing all chart content in a single cell.
- Added WET/Canada.ca-styled component previews.
- Added creation and deletion of custom components.
- Added versioned JSON library import and export with browser persistence.
- Added validation that rejects scripts, event handlers, embedded documents, and JavaScript URLs.
- Added English and French default labels during smart conversion.

See [Component libraries](docs/component-libraries.md) for the library format and conversion behavior.

### Review and reporting

- Grouped related Review findings and added error, warning, and total counts.
- Added links from Review findings to affected document content.
- Added visual flags in the document while the Review panel is open.
- Added suggested-command buttons when an automated fix is available.
- Added detection of tables that have not gone through cleanup.
- Made the Report outline responsive and linked headings to their workspace content.
- Added selectable report-outline presets.
- Removed the older H1-splitting command.

### Language and DOCX handling

- Added automatic English/French detection from DOCX metadata and synchronized it with Propel's language setting.
- Extracted language handling into a dedicated, tested conversion module.
- Improved French number formatting in table cleanup.
- Added language-aware labels generated by component conversion.

### Undo, history, and feedback

- Added document and table-editor undo buffers.
- Added toast notifications for commands and cleanup operations.
- Improved undo boundaries so related table-option changes behave as one action.
- Improved focus and selection preservation across editor operations.

### Architecture and maintainability

- Introduced `DocumentStore` as the canonical document-state owner.
- Added stable command registration through `CommandRegistry`.
- Separated document cleanup, conversion, review analysis, table modeling, UI storage, drawer behavior, language detection, and Live-editor integration into focused modules.
- Extracted a dedicated table-editor controller and other helpers from `src/propel.js`.
- Added Mammoth conversion and WET Live-editor adapters.
- Removed experimental content-facing AI scaffolding; Propel remains local and does not transmit document content.
- Added developer documentation for architecture, testing, vendored dependencies, legacy code, and AI-assisted development.

See [Architecture](docs/architecture.md) and the [README](README.md) for current design and development guidance.

### Testing and quality

- Added dependency-free unit-test infrastructure and the `npm run check` command.
- Added unit tests for command registration, language detection, source mapping, storage, non-breaking spaces, component libraries, deferred editor work, and table caption suggestions.
- Added real-browser characterization tests for commands and table behavior.
- Added DOCX regression and web-component reference fixtures.
- Documented the browser regression checklist in [Testing](docs/testing.md).
- Fixed issues involving copied HTML, semantic `strong`/`em` output, table bold selection, financial formatting, portrait-mode dialogs, double scrollbars, footers, component-combination markup, Live table overlay clicks, and file-upload UI cleanup.
