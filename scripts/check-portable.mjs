import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const portableRoot = join(root, 'dist', 'portable');
const requiredFiles = [
    'index.html',
    'README.txt',
    'logo.png',
    'css/custom.css',
    'css/prettify.css',
    'css/theme.min.css',
    'css/wet-boew.min.css',
    'src/budget.js',
    'src/mammoth.browser.js',
    'src/beautify-html.js',
    'src/prettify.js',
    'src/propel.bundle.js'
];

for (const relativePath of requiredFiles) {
    await access(join(portableRoot, relativePath));
}

const html = await readFile(join(portableRoot, 'index.html'), 'utf8');
const bundle = await readFile(join(portableRoot, 'src', 'propel.bundle.js'), 'utf8');
const theme = await readFile(join(portableRoot, 'css', 'theme.min.css'), 'utf8');

assertAbsent(html, 'type="module"', 'portable HTML still loads an ES module');
assertAbsent(html, 'src="src/propel.js"', 'portable HTML still loads the source entry point');
assertAbsent(html, 'assets/fontawesome/solid.svg#', 'portable HTML still loads an external SVG sprite');
assertPresent(html, 'src="src/propel.bundle.js"', 'portable HTML does not load the classic bundle');
assertPresent(html, '<symbol id="rotate-left"', 'portable HTML does not contain the inline icon sprite');
assertAbsent(bundle, 'assets/fontawesome/solid.svg#', 'portable bundle still loads an external SVG sprite');
assertAbsent(bundle, 'presetButtons.json', 'portable bundle still requests preset JSON');
assertAbsent(bundle, 'fetch(', 'portable bundle still performs a runtime fetch');
assertAbsent(html, 'run_prettify.js', 'portable HTML still loads the remote-capable Prettify loader');
assertPresent(html, "connect-src 'none'", 'portable HTML does not block connection APIs');
assertPresent(html, 'content="no-referrer"', 'portable HTML does not disable referrer disclosure');
assertAbsent(theme, 'url(https://', 'portable theme still references a remote URL');
assertAbsent(theme, 'url(http://', 'portable theme still references a remote URL');

console.log('Portable release checks passed.');

function assertAbsent(contents, search, message) {
    if (contents.includes(search)) throw new Error(message);
}

function assertPresent(contents, search, message) {
    if (!contents.includes(search)) throw new Error(message);
}
