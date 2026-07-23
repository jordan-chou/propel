# Propel architecture

`DocumentStore` is the canonical document boundary. Editor views render from it and commands mutate it through the application controller. Commands are registered by stable identifiers and return structured results containing HTML, a summary, changes, warnings, and affected paths.

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

`src/ui/drawers.js` owns activity-drawer and shortcut-dialog visibility, focus restoration, keyboard trapping, and accessibility state. Review analysis and rendering remain outside the drawer controller.

`src/app/document-recovery.js` observes canonical revisions and coordinates
debounced recovery writes. `src/document/recovery-store.js` is the IndexedDB
adapter. Recovery snapshots are serialized copies only: neither module owns live
document state, and restoration returns HTML through `DocumentStore`.
