# Testing Propel

Run `npm test` for dependency-free unit tests and `npm run check` for syntax plus unit checks.

Run `npm run verify:portable` to rebuild `dist/portable/` and verify that the
offline entry point contains no ES-module script, runtime `fetch`, remote
Prettify loader, remote stylesheet resource, or external SVG sprite reference.
For release verification, open `dist/portable/index.html` directly from the
filesystem in each supported managed browser and complete the checklist below.

Serve the repository with any static HTTP server and open `test/browser.html` to run DOM characterization tests. The title changes to PASS or FAIL when complete.

Before merging a structural refactor, manually verify with `test/test-document-doc-to-html.docx`:

1. Import completes and language detection does not block conversion.
2. Live and code edits synchronize in both directions.
3. Undo and redo restore command and typing changes.
4. Add IDs, footnotes, spacing, and copy behave as before.
5. Table cleanup opens, supports selection and formatting, applies changes, and cancels safely.
6. Review counts, issue navigation, outline filters, and flags update after edits.
7. English/French switching changes relevant generated publishing text.
8. Reload after editing, restore the offered browser recovery copy, and confirm
   Live/Code content, document language, and undo history start in the recovered
   state. Repeat once with **Discard recovery copy**.

Browser tests are intentionally separate because Propel uses native DOM, selection, shadow DOM, file APIs, and `contenteditable` behavior that Node does not emulate accurately.
