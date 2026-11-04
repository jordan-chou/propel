# Vendored browser dependencies

The following generated distributions are third-party code and are not application modules:

- `src/mammoth.browser.js` — Mammoth.js 1.9.0 browser distribution used for DOCX conversion.
- `src/beautify-html.js` — HTML beautifier distribution.
- `src/prettify.js` and `src/run_prettify.js` — Google Code Prettify distributions.
- `assets/gcweb/` — GCWeb 19.7.1 (2026-10-08), compiled with WET-BOEW 4.0.98, from the [official distribution](https://github.com/wet-boew/GCWeb/releases/download/v19.7.1/themes-dist-19.7.1-gcweb.zip). Includes unchanged `GCWeb/css/theme.min.css`, the deprecated compatibility `wet-boew.min.css`, upstream license notices, and locally referenced fonts/images available in the archive. Directory layout preserves upstream relative URLs. Used by the Live editor and component previews; WET JavaScript plugins are not loaded.

  Canada.ca served GCWeb 19.7.0 when checked on 2026-11-01. Propel uses the stable 19.7.1 replacement because upstream withdrew the unstable 19.7.0 release. The upstream stylesheet references `GCWeb/assets/default-avatar.png`, which is absent from the release archive; the wizard-specific avatar is included at its upstream path. Remote fonts/images remain blocked by CSP and are stripped from the portable stylesheet, as before.
- `assets/fontawesome/` — Font Awesome Free 7.3.1 solid SVG symbol subset and license, sourced from the [official 7.3.1 solid icons](https://github.com/FortAwesome/Font-Awesome/tree/7.3.1/svgs/solid).

Keep upgrades to these files isolated from Propel refactors. Record the upstream
version and source URL when the distributions are next upgraded. The exact
upstream versions of the HTML beautifier and Google Code Prettify distributions
remain unknown and should be identified or replaced during their next isolated
vendor upgrade.
