# Propel architecture

`DocumentStore` is the canonical document boundary. Editor views render from it and commands mutate it through the application controller. Commands are registered by stable identifiers and return structured results containing HTML, a summary, changes, warnings, and affected paths.

AI is a proposal layer, not a document editor. Providers receive an explicit snapshot and selected context. Responses must use a supported structured action, target the current revision, pass validation, and be shown for user review before document edits are applied. Provider credentials must remain in a server-side adapter and document content must not be logged.

## Dependency direction

```text
UI and editors -> application controller -> document store
                                |-> command registry -> transformations
                                |-> AI proposal service -> provider adapter
Review analyzer -> structured issues -> review renderer
Conversion adapter -> document store
```

Third-party browser distributions remain isolated from application modules and should be upgraded independently with their version and license recorded.
