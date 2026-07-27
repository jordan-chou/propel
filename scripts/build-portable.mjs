import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(root, 'dist', 'portable');
const outputSource = join(outputRoot, 'src');

const classicScripts = [
    'budget.js',
    'mammoth.browser.js',
    'beautify-html.js',
    'prettify.js'
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputSource, { recursive: true });
await cp(join(root, 'css'), join(outputRoot, 'css'), { recursive: true });
await cp(join(root, 'assets'), join(outputRoot, 'assets'), { recursive: true });
await cp(join(root, 'logo.png'), join(outputRoot, 'logo.png'));

for (const filename of classicScripts) {
    const sourcePath = join(root, 'src', filename);
    const outputPath = join(outputSource, filename);
    await writeFile(outputPath, await readFile(sourcePath, 'utf8'));
}

await build({
    entryPoints: [join(root, 'src', 'propel.js')],
    outfile: join(outputSource, 'propel.bundle.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    legalComments: 'none'
});

const bundlePath = join(outputSource, 'propel.bundle.js');
const bundle = (await readFile(bundlePath, 'utf8'))
    .replaceAll('assets/fontawesome/solid.svg#', '#');
await writeFile(bundlePath, bundle);

const themePath = join(outputRoot, 'css', 'theme.min.css');
const theme = stripRemoteCssResources(await readFile(themePath, 'utf8'));
await writeFile(themePath, theme);

const sourceHtml = await readFile(join(root, 'index.html'), 'utf8');
const svgSprite = makeInlineSvgSprite(await readFile(join(root, 'assets', 'fontawesome', 'solid.svg'), 'utf8'));
const portableHtml = sourceHtml
    .replace('<body>', `<body>\n    ${svgSprite}`)
    .replaceAll('assets/fontawesome/solid.svg#', '#')
    .replace(
        '<script type="module" src="src/propel.js"></script>',
        '<script src="src/propel.bundle.js"></script>'
    );
await writeFile(join(outputRoot, 'index.html'), portableHtml);

const readme = `Propel portable release
========================

Open index.html in a supported browser. All application files are contained in
this folder and document conversion runs locally in the browser.

Keep the folder contents together. Moving only index.html will prevent its
styles and scripts from loading. Browser policy can still disable JavaScript on
file:// pages; in that case, contact the secured-network administrator.
`;
await writeFile(join(outputRoot, 'README.txt'), readme);

console.log(`Portable release written to ${outputRoot}`);

function makeInlineSvgSprite(svg) {
    return svg
        .replace('<svg xmlns="http://www.w3.org/2000/svg">', '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:none">')
        .trim();
}

function stripRemoteCssResources(css) {
    return css
        .replace(/@import\s+url\(https?:\/\/[^)]*\);?/gi, '')
        .replace(/url\(https?:\/\/[^)]*\)/gi, 'none');
}
