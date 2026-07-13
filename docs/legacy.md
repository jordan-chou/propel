# Legacy candidates

`src/table-cleanup.js` is an older standalone implementation. It is not referenced by `index.html` or any ES module. The active implementation is `src/commands/table-cleanup.js` plus the table-editor code. It remains in place for this compatibility-preserving branch and can be deleted in a separately reviewed removal commit.

`src/commands/send-to-table-cleanup.js` is likewise unreferenced. No runtime code was redirected to it during this refactor.
