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
