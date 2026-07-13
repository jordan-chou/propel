# Vendored browser dependencies

The following generated distributions are third-party code and are not application modules:

- `src/mammoth.browser.js` — Mammoth.js browser distribution used for DOCX conversion.
- `src/beautify-html.js` — HTML beautifier distribution.
- `src/prettify.js` and `src/run_prettify.js` — Google Code Prettify distributions.
- `css/wet-boew.min.css` and `css/theme.min.css` — WET/theme distributions.
- `assets/fontawesome/` — Font Awesome sprite and license.

Keep upgrades to these files isolated from Propel refactors. Record the upstream version and source URL when the distributions are next upgraded; the current repository does not contain enough metadata to infer exact versions safely.
