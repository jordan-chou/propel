# Propel architecture

`DocumentStore` is the canonical document boundary. Editor views render from it and commands mutate it through the application controller. Commands are registered by stable identifiers and return structured results containing HTML, a summary, changes, warnings, and affected paths.

Canonical replacements and mutations are sanitized by
`src/document/security.js` before `DocumentStore` publishes the new revision.
Code and Live synchronization use the same sanitizer before directly updating
the canonical root. The application Content Security Policy remains an
independent browser-enforced boundary around rendered views.

## Dependency direction

```text
UI and editors -> application controller -> document store
                                |-> command registry -> transformations
Review analyzer -> structured issues -> review renderer
Conversion adapter -> document store
```

Third-party browser distributions remain isolated from application modules and should be upgraded independently with their version and license recorded.

## UI controllers

`src/table-editor/controller.js` owns table-editor UI state, selection, sizing, caption suggestions, and table-editor history. It consumes table transformations and commits through callbacks supplied by `propel.js`; it does not own canonical document state or register document commands.

`src/commands/table-cell.js` converts table cells and normalizes whole-cell bold
formatting. Cleanup, Header row, and scoping use this shared transformation.
Header row requests bold headers; cleanup applies its row-header weight option;
scoping preserves existing weight. Header cells use default bold or `fnt-nrml`,
and bold data cells use `strong`. Partial emphasis and authored attributes are
retained. Generic tag-renaming utilities do not change formatting.
Cleanup and scoping share a content check from the same module: a first body
cell with multiple paragraphs or a list remains a data cell. Cleanup preserves
paragraphs in these structured cells so later scoping can apply the same rule.
Explicit column header rows still use header cells.

`src/ui/drawers.js` owns activity-drawer and shortcut-dialog visibility, focus restoration, keyboard trapping, and accessibility state. Review analysis and rendering remain outside the drawer controller.

`src/app/document-recovery.js` observes canonical revisions and coordinates
debounced recovery writes. `src/document/recovery-store.js` is the IndexedDB
adapter. Recovery snapshots are serialized copies only: neither module owns live
document state, and restoration returns HTML through `DocumentStore`.

`src/ui/code-editor.js` adapts the local CodeMirror view to the existing Code
textarea's value, selection, focus, and event boundary. Wrapped-line indentation
is a rendering style only; it adds no source whitespace. Editor changes flow
through the existing input synchronization and document history. CodeMirror's
private undo history is cleared so Propel remains responsible for undo/redo.
