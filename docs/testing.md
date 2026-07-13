# Testing Propel

Run `npm test` for dependency-free unit tests and `npm run check` for syntax plus unit checks.

Serve the repository with any static HTTP server and open `test/browser.html` to run DOM characterization tests. The title changes to PASS or FAIL when complete.

Before merging a structural refactor, manually verify with `test/test-document-doc-to-html.docx`:

1. Import completes and language detection does not block conversion.
2. Live and code edits synchronize in both directions.
3. Undo and redo restore command and typing changes.
4. Add IDs, footnotes, spacing, split, and copy behave as before.
5. Table cleanup opens, supports selection and formatting, applies changes, and cancels safely.
6. Review counts, issue navigation, outline filters, and flags update after edits.
7. English/French switching changes relevant generated publishing text.

Browser tests are intentionally separate because Propel uses native DOM, selection, shadow DOM, file APIs, and `contenteditable` behavior that Node does not emulate accurately.
