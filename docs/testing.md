# Testing Propel

Run `npm test` for dependency-free unit tests and `npm run check` for syntax plus unit checks.

Run `npm run verify:portable` to rebuild `dist/portable/` and verify that the
offline entry point contains no ES-module script, runtime `fetch`, remote
stylesheet resource, or external SVG sprite reference. Run
`npm run check:security` to verify the served entry point's CSP, referrer
policy, sanitizer boundary, and lack of application network primitives.
For release verification, open `dist/portable/index.html` directly from the
filesystem in each supported managed browser and complete the checklist below.

Serve the repository with any static HTTP server and open `test/browser.html` to run DOM characterization tests. The title changes to PASS or FAIL when complete.

Before merging a structural refactor, manually verify with `test/test-document-doc-to-html.docx`:

1. Import completes, language detection does not block conversion, and the tab
   title uses the first non-empty `h1` or falls back to the imported filename.
2. Live and code edits synchronize in both directions.
   Convert a paragraph to each list type in Live view and confirm Code view
   contains no empty paragraphs around the list. Check surrounding text,
   inline formatting, and undo/redo.
   Empty a list item, then press Backspace again: its bullet or number should
   disappear, typing should continue at the caret, and undo/redo should restore
   and remove the item in both Live and Code views.
   Press Enter at the end of a list item. The new empty item should appear as
   `<li></li>` in Code view, with its caret placeholder kept only in Live view.
   Switch views and try undo/redo, then continue typing in that empty item.
   Confirm intentional line breaks inside populated items remain in Code view.
   In Code view, paste a long indented line and narrow the pane. Wrapped rows
   should align with its first non-whitespace character, and copying should
   preserve the original source. Check click/drag selection, typing, Tab and
   Shift+Tab, find/replace, go to line, scrolling, and reciprocal caret guidance.
   Repeat with tabs, French accented text, unbroken URLs, and a trailing newline.
   Very deep indentation is visually capped at half the pane width.
   At 960px and 1024px viewport widths, verify Live sits above Code with a
   horizontal draggable divider. At 1025px in landscape, verify the panes sit
   side by side with a vertical divider. Portrait and mobile layouts should
   retain their existing stacking behavior.
3. Undo and redo restore command and typing changes.
4. Add IDs, footnotes, spacing, and copy behave as before.
5. Indent a table row header through `ml-2`, `ml-3`, `ml-4`, and `ml-5`, then outdent to no wrapper. Confirm bold state, complex header relationships, undo/redo, and Apply preserve the selected level.
   Table cleanup opens, supports selection and formatting, applies changes, and cancels safely.
   Confirm **Dark header background** starts on. Turn it off, promote a body row
   to a header, and change Financial table or Complex scoping; header rows should
   remain without `bg-dark` and `text-white`. Check undo/redo, Copy table HTML,
   Apply, and Cancel. Turning the switch back on restores both classes.
   Also try a first body cell with multiple paragraphs or a list: it should
   remain `td` with its paragraphs/list intact after option changes and Apply.
   In complex scoping it should receive column and applicable section headers,
   without becoming a header for adjacent cells; switching to simple scoping
   must leave it without a `scope` attribute.
   Turning off Complex scoping must remove header-cell IDs and explicit
   `headers` relationships while retaining the table ID and header `scope`
   attributes. Check undo/redo and Apply, then turn it back on and confirm
   all regenerated `headers` references point to existing header IDs.
6. Review counts, issue navigation, outline filters, and flags update after edits.
7. English/French switching changes relevant generated publishing text.
8. Reload after editing, restore the offered browser recovery copy, and confirm
   Live/Code content, document language, contextual tab title, and undo history
   start in the recovered state. Repeat once with **Discard recovery copy**.
9. In **Information**, disable local recovery and confirm the saved copy is
   deleted and no recovery prompt appears after another edit and reload.
10. Import a document containing an Outlook Safe Links URL. Confirm in Live
    and Code views that the `href` becomes the destination from its `url`
    query parameter, retaining destination query parameters and fragments.
    Link text should stay unchanged. The shared Standard cleanup transformation
    is also covered by the browser tests; its button is currently commented
    out in `index.html`.

Browser tests are intentionally separate because Propel uses native DOM, selection, shadow DOM, file APIs, and `contenteditable` behavior that Node does not emulate accurately.
