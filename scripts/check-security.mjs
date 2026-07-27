import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(root, 'index.html'), 'utf8');
const requiredPolicy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'"
];

requiredPolicy.forEach(directive =>
    assertPresent(html, directive, `index.html is missing CSP directive: ${directive}`)
);
assertPresent(html, 'content="no-referrer"', 'index.html does not disable referrer disclosure');
assertAbsent(html, 'src="src/run_prettify.js"', 'index.html still loads the remote-capable Prettify loader');
assertAbsent(html, /<(?:script|link|img|iframe)\b[^>]*(?:src|href)=["']https?:/i, 'index.html contains a remote runtime asset');

const sourceFiles = await listJavaScriptFiles(join(root, 'src'));
const excludedVendoredFiles = new Set([
    'beautify-html.js',
    'mammoth.browser.js',
    'prettify.js',
    'run_prettify.js'
]);
const networkPrimitive = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*(?:\(|\b)/;

for (const path of sourceFiles) {
    if (excludedVendoredFiles.has(path.split('/').pop())) continue;
    const source = await readFile(path, 'utf8');
    if (networkPrimitive.test(source)) {
        throw new Error(`${path.slice(root.length + 1)} contains an outbound network primitive`);
    }
}

const documentStore = await readFile(join(root, 'src', 'document', 'document-store.js'), 'utf8');
assertPresent(documentStore, 'replaceWithSanitizedHTML', 'DocumentStore replacements do not use the sanitizer');
assertPresent(documentStore, 'sanitizeDocumentTree', 'DocumentStore mutations do not use the sanitizer');

console.log('Security boundary checks passed.');

async function listJavaScriptFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return listJavaScriptFiles(path);
        return entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
    }));
    return nested.flat();
}

function assertPresent(contents, search, message) {
    if (typeof search === 'string' ? !contents.includes(search) : !search.test(contents)) {
        throw new Error(message);
    }
}

function assertAbsent(contents, search, message) {
    if (typeof search === 'string' ? contents.includes(search) : search.test(contents)) {
        throw new Error(message);
    }
}
