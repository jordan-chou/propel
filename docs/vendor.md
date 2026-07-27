# Vendored browser dependencies

The following generated distributions are third-party code and are not application modules:

- `src/mammoth.browser.js` — Mammoth.js 1.9.0 browser distribution used for DOCX conversion.
- `src/beautify-html.js` — HTML beautifier distribution.
- `src/prettify.js` and `src/run_prettify.js` — Google Code Prettify distributions.
- `css/wet-boew.min.css` and `css/theme.min.css` — WET/GCWeb 9.3.0 theme distributions; the bundled theme also identifies Bootstrap 3.4.1.
- `assets/fontawesome/` — Font Awesome Free 7.3.1 solid SVG symbol subset and license, sourced from the [official 7.3.1 solid icons](https://github.com/FortAwesome/Font-Awesome/tree/7.3.1/svgs/solid).

Keep upgrades to these files isolated from Propel refactors. Record the upstream
version and source URL when the distributions are next upgraded. The exact
upstream versions of the HTML beautifier and Google Code Prettify distributions
remain unknown and should be identified or replaced during their next isolated
vendor upgrade.
