import { createBodyFtnTags, replaceFootnoteSection } from '../../src/commands/footnote-generator.js';
import { cleanupTable, defaultTableCleanupOptions } from '../../src/commands/table-cleanup.js';
import { fixNbspHTML } from '../../src/commands/nbsp.js';
import { getCellsInRange } from '../../src/table-editor/model.js';
import { toggleCellBold, toggleCellsBold, toggleRowsActive } from '../../src/table-editor/formatting.js';
import {
    applyTableScopes,
    hasHeaderRelationship,
    preserveExistingHeaderRelationships,
    setManualHeaderRelationship
} from '../../src/table-editor/scoping.js';
import { renameTag } from '../../src/commands/table-cleanup.js';
import { createDrawerControllers } from '../../src/ui/drawers.js';
import { applyBlockFormat } from '../../src/ui/block-format.js';
import { ensureRootTextBlockForInput, preserveParagraphsOnEnter } from '../../src/ui/live-editing.js';
import { renameTag as renameElementTag } from '../../src/util.js';
import { createOnboardingController } from '../../src/ui/onboarding.js';
import { createRecoveryPrompt } from '../../src/ui/recovery-prompt.js';
import {
    createTableEditorController,
    runPreservingElementScroll,
    shouldRunInitialTableCleanup
} from '../../src/table-editor/controller.js';
import { isCleanedTable } from '../../src/review/analyzer.js';
import { moveRowsToTableFooter } from '../../src/table-editor/footer.js';
import { deleteSelectedTableColumns } from '../../src/table-editor/columns.js';
import {
    createWetLiveEditor,
    focusWetLiveEditorFromHost,
    isWetLiveEditorOverlayTarget
} from '../../src/ui/wet-live-editor.js';
import { buildElementSourceMap } from '../../src/app/editor-source-map.js';
import { getLiveCaretForSourceIndex, getSourceIndexForLiveCaret } from '../../src/app/reciprocal-caret.js';
import {
    captureLiveEditBaseline,
    normalizeLiveEditClone
} from '../../src/document/live-edit-normalization.js';
import {
    isUnsafeDocumentUrl,
    replaceWithSanitizedHTML,
    sanitizeDocumentTree
} from '../../src/document/security.js';
import { DocumentStore } from '../../src/document/document-store.js';
import {
    createDocumentRecoveryStore,
    DOCUMENT_RECOVERY_SCHEMA_VERSION
} from '../../src/document/recovery-store.js';
import { runStandardCleanup } from '../../src/document/cleanup.js';
import { createCodeHighlightViewport, getLineStarts } from '../../src/ui/code-highlight-viewport.js';
import { createCodeFindController } from '../../src/ui/code-find.js';
import {
    buildBugReportUrl,
    buildFeedbackEmailUrl,
    buildFeatureRequestUrl,
    createFeedbackComposer
} from '../../src/support/feedback.js';

const tests = [];
function test(name, run) { tests.push({ name, run }); }
function equal(actual, expected) { if (actual !== expected) throw new Error(`Expected ${expected}; received ${actual}`); }

test('renameTag preserves attributes and children without leaving the old element', () => {
    const host = document.createElement('div');
    host.innerHTML = '<h2 id="overview" class="topic">Overview <em>details</em></h2>';

    const renamed = renameElementTag(host.firstElementChild, 'h3');

    equal(renamed.outerHTML, '<h3 id="overview" class="topic">Overview <em>details</em></h3>');
    equal(host.querySelectorAll('h2').length, 0);
});

test('block formatting renames the selected heading without leaving an empty old heading', () => {
    const host = document.createElement('div');
    host.innerHTML = '<h2 id="overview">Overview</h2><p>Body</p>';
    document.body.append(host);
    const headingText = host.querySelector('h2').firstChild;
    const range = document.createRange();
    range.setStart(headingText, 3);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    applyBlockFormat(host, selection, 'h3');

    equal(host.innerHTML, '<h3 id="overview">Overview</h3><p>Body</p>');
    selection.removeAllRanges();
    host.remove();
});

test('block formatting renames every block covered by a selection', () => {
    const host = document.createElement('div');
    host.innerHTML = '<h2>First</h2><h3>Second</h3><p>Body</p>';
    document.body.append(host);
    const range = document.createRange();
    range.setStart(host.children[0].firstChild, 2);
    range.setEnd(host.children[1].firstChild, 4);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    applyBlockFormat(host, selection, 'h4');

    equal(host.innerHTML, '<h4>First</h4><h4>Second</h4><p>Body</p>');
    selection.removeAllRanges();
    host.remove();
});

test('block formatting ignores whitespace at element-selection boundaries', () => {
    const host = document.createElement('div');
    host.innerHTML = '\n<h2>First</h2>\n<h3>Second</h3>\n';
    document.body.append(host);
    const range = document.createRange();
    range.setStart(host, 1);
    range.setEnd(host, 4);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    applyBlockFormat(host, selection, 'h4');

    equal(host.querySelectorAll('h4').length, 2);
    equal(host.querySelectorAll('h2, h3').length, 0);
    selection.removeAllRanges();
    host.remove();
});

test('Enter preserves a heading while creating a following paragraph', () => {
    const live = document.createElement('div');
    live.contentEditable = 'true';
    live.innerHTML = '<h2>Heading</h2>';
    document.body.append(live);
    live.focus();
    const range = document.createRange();
    range.selectNodeContents(live.firstElementChild);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    let prevented = false;

    preserveParagraphsOnEnter({
        key: 'Enter',
        currentTarget: live,
        preventDefault: () => { prevented = true; }
    });
    document.execCommand('insertParagraph', false, null);

    equal(prevented, false);
    equal(live.innerHTML, '<h2>Heading</h2><p><br></p>');
    selection.removeAllRanges();
    live.remove();
});

test('typing at the Live editor root starts a paragraph', () => {
    const host = document.createElement('div');
    host.setAttribute('contenteditable', 'true');
    document.body.append(host);
    const live = createWetLiveEditor(host);
    live.focus();
    const range = document.createRange();
    range.setStart(live, 0);
    range.collapse(true);
    const selection = live.getRootNode().getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    ensureRootTextBlockForInput({ inputType: 'insertText', defaultPrevented: false }, live, selection);
    document.execCommand('insertText', false, 'Text');

    equal(live.innerHTML, '<p>Text</p>');
    selection.removeAllRanges();
    host.remove();
});

test('typing alongside root phrasing content wraps the complete run in a paragraph', () => {
    const live = document.createElement('div');
    live.contentEditable = 'true';
    live.innerHTML = 'Before <strong>bold</strong>';
    document.body.append(live);
    live.focus();
    const range = document.createRange();
    range.setStart(live.firstChild, live.firstChild.length);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    ensureRootTextBlockForInput({ inputType: 'insertText', defaultPrevented: false }, live, selection);
    document.execCommand('insertText', false, 'text ');

    equal(live.innerHTML, '<p>Before text&nbsp;<strong>bold</strong></p>');
    selection.removeAllRanges();
    live.remove();
});

test('typing inside semantic and component containers keeps their context', () => {
    const live = document.createElement('div');
    live.innerHTML = '<h2>Heading</h2><div class="component">Label</div>';
    document.body.append(live);
    const selection = window.getSelection();

    for (const container of live.children) {
        const range = document.createRange();
        range.selectNodeContents(container);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        equal(
            ensureRootTextBlockForInput({ inputType: 'insertText', defaultPrevented: false }, live, selection),
            null
        );
    }

    equal(live.innerHTML, '<h2>Heading</h2><div class="component">Label</div>');
    selection.removeAllRanges();
    live.remove();
});

test('standard cleanup removes all empty anchors while preserving element content', () => {
    const host = document.createElement('div');
    host.innerHTML = [
        '<p><a href="#unused"></a><a href="#blank"> &nbsp; </a></p>',
        '<a id="destination"></a><a name="legacy-destination"></a>',
        '<a href="/chart"><img src="chart.png" alt="Chart"></a>',
        '<a href="/icon"><span class="icon"></span></a>'
    ].join('');

    const changes = runStandardCleanup(host);

    equal(changes.emptyAnchors, 4);
    equal(host.querySelectorAll('a').length, 2);
    equal(host.querySelector('#destination') === null, true);
    equal(host.querySelector('a[name="legacy-destination"]') === null, true);
    equal(host.querySelector('a[href="/chart"] img') !== null, true);
    equal(host.querySelector('a[href="/icon"] .icon') !== null, true);
});

test('document sanitization removes executable markup without discarding publishing content', () => {
    const isolatedDocument = document.implementation.createHTMLDocument('Sanitizer test');
    const host = isolatedDocument.createElement('div');
    const report = replaceWithSanitizedHTML(host, [
        '<h2 onclick="alert(1)">Heading</h2>',
        '<script>document.body.textContent = "unsafe"</script>',
        '<iframe src="https://example.invalid/embed"></iframe>',
        '<img src="https://example.invalid/chart.png" onerror="alert(2)" alt="Chart">',
        '<a href="java&#x0a;script:alert(3)">Unsafe link</a>',
        '<a href="https://example.com" target="_blank">External link</a>',
        '<form action="https://example.invalid/collect"><input name="detail"></form>'
    ].join(''));

    equal(host.querySelector('script, iframe'), null);
    equal(host.querySelector('h2').hasAttribute('onclick'), false);
    equal(host.querySelector('img').getAttribute('src'), 'https://example.invalid/chart.png');
    equal(host.querySelector('img').hasAttribute('onerror'), false);
    equal(host.querySelector('a').hasAttribute('href'), false);
    equal(host.querySelector('a[target="_blank"]').getAttribute('rel'), 'noopener noreferrer');
    equal(host.querySelector('form').hasAttribute('action'), false);
    equal(report.removedElements, 2);
    equal(report.removedAttributes, 4);
    equal(report.hardenedLinks, 1);
});

test('document sanitization covers nested SVG, root attributes, and obfuscated URL schemes', () => {
    const host = document.createElement('div');
    host.setAttribute('onfocus', 'alert(1)');
    host.setAttribute('style', 'background: url(javascript:alert(2))');
    host.innerHTML = '<svg><script>alert(3)</script><a href="vbscript:alert(4)">Unsafe</a></svg>';

    const report = sanitizeDocumentTree(host, { includeRoot: true });

    equal(host.hasAttribute('onfocus'), false);
    equal(host.hasAttribute('style'), false);
    equal(host.querySelector('script'), null);
    equal(host.querySelector('a').hasAttribute('href'), false);
    equal(report.removedElements, 1);
    equal(report.removedAttributes, 3);
    equal(isUnsafeDocumentUrl(' java\nscript:alert(1) '), true);
    equal(isUnsafeDocumentUrl('file:///Users/example/private.png'), true);
    equal(isUnsafeDocumentUrl('https://example.com'), false);
});

test('DocumentStore sanitizes replacements and command mutations before publishing', () => {
    const host = document.createElement('div');
    const changes = [];
    const store = new DocumentStore(host);
    store.subscribe(change => changes.push(change.type));

    store.replaceHTML('<p onmouseover="alert(1)">Safe text</p><object data="https://example.invalid"></object>');
    equal(host.innerHTML, '<p>Safe text</p>');

    store.mutate('Unsafe mutation', root => {
        root.firstElementChild.setAttribute('onclick', 'alert(2)');
        root.insertAdjacentHTML('beforeend', '<script>alert(3)</script>');
    });
    equal(host.innerHTML, '<p>Safe text</p>');
    equal(changes.join(','), 'replace,mutation');
});

test('Live edit normalization removes browser-created presentation spans', () => {
    const live = document.createElement('div');
    live.innerHTML = '<p>Before</p>';
    const baseline = captureLiveEditBaseline(live);
    const artifact = document.createElement('span');
    artifact.setAttribute('style', 'font-family: Arial; font-size: 16px; font-weight: 400;');
    artifact.textContent = ' after';
    live.firstElementChild.append(artifact);
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<p>Before after</p>');
});

test('Live edit normalization converts browser-created semantic styles', () => {
    const live = document.createElement('div');
    live.innerHTML = '<p>Before</p>';
    const baseline = captureLiveEditBaseline(live);
    const artifact = document.createElement('span');
    artifact.setAttribute('style', 'font-weight: 700; font-style: italic;');
    artifact.textContent = 'formatted';
    live.firstElementChild.append(artifact);
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<p>Before<strong><em>formatted</em></strong></p>');
});

test('Live edit normalization preserves authored styles and meaningful spans', () => {
    const live = document.createElement('div');
    live.innerHTML = '<p style="text-align: center"><span class="wb-inv" lang="fr" style="color: red">Texte</span></p>';
    const baseline = captureLiveEditBaseline(live);
    live.firstElementChild.style.textAlign = 'right';
    live.querySelector('span').style.color = 'blue';
    const accessibleSpan = document.createElement('span');
    accessibleSpan.lang = 'en';
    accessibleSpan.style.fontFamily = 'Arial';
    accessibleSpan.textContent = 'Text';
    live.firstElementChild.append(accessibleSpan);
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.firstElementChild.getAttribute('style'), 'text-align: center');
    equal(clone.querySelector('.wb-inv').getAttribute('style'), 'color: red');
    equal(clone.querySelector('span[lang="en"]').outerHTML, '<span lang="en">Text</span>');
});

test('Live edit normalization omits empty paragraphs and headings created while editing', () => {
    const live = document.createElement('div');
    live.innerHTML = '<p>Before</p>';
    const baseline = captureLiveEditBaseline(live);
    live.insertAdjacentHTML(
        'beforeend',
        '<p><br></p><p>&nbsp;</p><p><span><br></span></p><h1></h1><h3><br></h3><h6>&nbsp;</h6><p>After</p>'
    );
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<p>Before</p><p>After</p>');
    equal(live.querySelectorAll('p, h1, h3, h6').length, 8);
});

test('Live edit normalization omits an authored paragraph emptied by Enter', () => {
    const live = document.createElement('div');
    live.innerHTML = '<p>Before</p><p>After</p>';
    const baseline = captureLiveEditBaseline(live);
    live.firstElementChild.innerHTML = '<br>';
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<p>After</p>');
});

test('Live edit normalization removes existing empty paragraphs but preserves non-text content', () => {
    const live = document.createElement('div');
    live.innerHTML = '<p><br></p>';
    const baseline = captureLiveEditBaseline(live);
    live.insertAdjacentHTML(
        'beforeend',
        '<p><a href="#unused"></a></p><p><a id="destination"></a></p><p><img src="chart.png" alt=""></p>'
    );
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<p><a id="destination"></a></p><p><img src="chart.png" alt=""></p>');
});

test('Live edit normalization preserves empty structural containers', () => {
    const live = document.createElement('div');
    live.innerHTML = '<div></div><ul><li></li></ul><table><tbody><tr><td></td></tr></tbody></table>';
    const baseline = captureLiveEditBaseline(live);
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.querySelectorAll('div, li, td').length, 3);
});

test('repeated native Enter commands do not leave empty paragraphs in synchronized HTML', () => {
    const live = document.createElement('div');
    live.contentEditable = 'true';
    live.innerHTML = '<p>Before</p>';
    document.body.append(live);
    live.focus();
    const range = document.createRange();
    range.selectNodeContents(live.firstElementChild);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const baseline = captureLiveEditBaseline(live);

    for (let index = 0; index < 2; index += 1) {
        document.execCommand('formatBlock', false, 'p');
        document.execCommand('insertParagraph', false, null);
    }
    const clone = live.cloneNode(true);
    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<p>Before</p>');
    selection.removeAllRanges();
    live.remove();
});

test('code highlighting renders only the visible source window', () => {
    const host = document.createElement('div');
    host.style.cssText = 'position: relative; width: 420px; height: 110px;';
    host.innerHTML = `
        <div class="line-numbers" style="position:absolute;inset:0 auto 0 0;width:40px;overflow:hidden"></div>
        <pre style="position:absolute;inset:0;margin:0;overflow:hidden"><code></code></pre>
        <textarea style="position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;padding:0 0 0 40px;border:0;resize:none;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/22px monospace"></textarea>`;
    document.body.append(host);
    const overlay = host.querySelector('pre');
    const textarea = host.querySelector('textarea');
    const lineNumbers = host.querySelector('.line-numbers');
    const source = Array.from({ length: 200 }, (_, index) => `<p>Line ${index}</p>`).join('\n');
    textarea.value = source;
    const viewport = createCodeHighlightViewport({
        overlay,
        textarea,
        lineNumbers,
        highlight: value => value.replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
        overscanLines: 2
    });
    viewport.update(source);
    textarea.scrollTop = 1100;
    viewport.render();
    const code = overlay.querySelector('code');
    const mirror = Array.from(document.querySelectorAll('[aria-hidden="true"][inert]'))
        .find(element => element.textContent.includes('Line 199'));
    const start = Number(code.dataset.highlightStart);
    const end = Number(code.dataset.highlightEnd);

    equal(start > 0, true);
    equal(end < source.length, true);
    equal(code.textContent, source.slice(start, end));
    equal(code.textContent.includes('Line 0</p>'), false);
    equal(code.textContent.length < source.length / 4, true);
    equal(Number(lineNumbers.dataset.firstLine) > 1, true);
    equal(Number(lineNumbers.dataset.lastLine) < 200, true);
    equal(lineNumbers.firstElementChild.textContent, lineNumbers.dataset.firstLine);
    equal(Boolean(mirror), true);
    viewport.destroy();
    host.remove();
});

test('code highlighting marks the active find result', () => {
    const host = document.createElement('div');
    host.style.cssText = 'position: relative; width: 420px; height: 88px;';
    host.innerHTML = `
        <pre style="position:absolute;inset:0;margin:0;overflow:hidden"><code></code></pre>
        <textarea style="position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;padding:8px;border:0;white-space:pre-wrap;font:14px/22px monospace"></textarea>`;
    document.body.append(host);
    const textarea = host.querySelector('textarea');
    const source = '<p>Find this text</p>';
    textarea.value = source;
    const viewport = createCodeHighlightViewport({
        overlay: host.querySelector('pre'),
        textarea,
        highlight: value => value.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    });
    viewport.update(source);
    viewport.setSearchRange({ start: source.indexOf('this'), end: source.indexOf('this') + 4 });

    const marker = host.querySelector('.code-search-match');
    equal(marker.textContent, 'this');
    equal(host.querySelector('code').textContent, source);
    viewport.destroy();
    host.remove();
});

test('application syntax and line-number layers are inert and unselectable', async () => {
    const response = await fetch('../../index.html');
    const source = await response.text();
    const app = new DOMParser().parseFromString(source, 'text/html');
    const highlight = app.getElementById('codeHighlight');
    const lineNumbers = app.getElementById('codeLineNumbers');

    equal(highlight.hasAttribute('inert'), true);
    equal(highlight.getAttribute('aria-hidden'), 'true');
    equal(lineNumbers.hasAttribute('inert'), true);
    equal(lineNumbers.getAttribute('aria-hidden'), 'true');
});

test('virtualized code highlighting stays aligned after wrapped lines', () => {
    const host = document.createElement('div');
    host.style.cssText = 'position: relative; width: 260px; height: 88px;';
    host.innerHTML = `
        <style>.line-numbers span { position: absolute; }</style>
        <div class="line-numbers" style="position:absolute;inset:0 auto 0 0;width:40px;overflow:hidden"></div>
        <pre style="position:absolute;inset:0;margin:0;padding:0;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/22px monospace"><code style="position:absolute;display:block;white-space:inherit;overflow-wrap:inherit;font:inherit"></code></pre>
        <textarea style="position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;padding:8px 8px 8px 48px;border:0;resize:none;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/22px monospace"></textarea>`;
    document.body.append(host);
    const overlay = host.querySelector('pre');
    const textarea = host.querySelector('textarea');
    const lineNumbers = host.querySelector('.line-numbers');
    const longLine = 'A'.repeat(120);
    const source = Array.from({ length: 80 }, (_, index) => index % 5 === 0 ? longLine : `Line ${index}`).join('\n');
    textarea.value = source;
    const viewport = createCodeHighlightViewport({
        overlay,
        textarea,
        lineNumbers,
        highlight: value => value,
        overscanLines: 1
    });
    viewport.update(source);
    textarea.scrollTop = 700;
    viewport.render();

    const code = overlay.querySelector('code');
    const start = Number(code.dataset.highlightStart);
    const reference = document.createElement('div');
    reference.style.cssText = `position:fixed;visibility:hidden;left:-10000px;top:0;box-sizing:border-box;width:${textarea.clientWidth}px;height:auto;margin:0;padding:8px 8px 8px 48px;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/22px monospace`;
    const referenceText = document.createTextNode(`${source}\u200b`);
    reference.append(referenceText);
    document.body.append(reference);
    const range = document.createRange();
    range.setStart(referenceText, start);
    range.setEnd(referenceText, start + 1);
    const expectedTop = range.getBoundingClientRect().top - reference.getBoundingClientRect().top - textarea.scrollTop;
    const actualTop = code.getBoundingClientRect().top - overlay.getBoundingClientRect().top;
    const firstNumberTop = lineNumbers.firstElementChild.getBoundingClientRect().top
        - lineNumbers.getBoundingClientRect().top;

    equal(Math.abs(actualTop - expectedTop) < 1, true);
    equal(Math.abs(firstNumberTop - expectedTop) < 1, true);
    equal(code.textContent.length < source.length / 3, true);
    reference.remove();
    viewport.destroy();
    host.remove();
});

test('code highlight line indexes include empty and trailing lines', () => {
    equal(getLineStarts('first\n\nthird\n').join(','), '0,6,7,13');
});

test('Code view find panel navigates, replaces, collapses, and closes', () => {
    const host = document.createElement('div');
    host.innerHTML = `
        <div class="panel" hidden>
            <button class="expand" aria-expanded="false"></button>
            <input class="find">
            <button class="regex" aria-pressed="false"></button>
            <span class="status"></span>
            <button class="previous"></button>
            <button class="next"></button>
            <button class="close"></button>
            <div class="replace-row" hidden>
                <input class="replace">
                <button class="replace-one"></button>
                <button class="replace-all"></button>
            </div>
        </div>
        <textarea>cat dog cat</textarea>`;
    document.body.append(host);
    const textarea = host.querySelector('textarea');
    const panel = host.querySelector('.panel');
    const searchInput = host.querySelector('.find');
    const replaceInput = host.querySelector('.replace');
    const replaceRow = host.querySelector('.replace-row');
    const changes = [];
    const controller = createCodeFindController({
        textarea,
        panel,
        searchInput,
        replaceInput,
        regexToggle: host.querySelector('.regex'),
        replaceToggle: host.querySelector('.expand'),
        replaceRow,
        previousButton: host.querySelector('.previous'),
        nextButton: host.querySelector('.next'),
        replaceButton: host.querySelector('.replace-one'),
        replaceAllButton: host.querySelector('.replace-all'),
        closeButton: host.querySelector('.close'),
        status: host.querySelector('.status'),
        onBeforeReplace: () => changes.push('before'),
        onReplace: (label, count) => changes.push([label, count])
    });
    controller.bind();

    const findEvent = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
    });
    equal(controller.handleShortcut(findEvent), true);
    equal(findEvent.defaultPrevented, true);
    equal(panel.hidden, false);
    equal(replaceRow.hidden, true);

    searchInput.value = 'cat';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    equal(textarea.selectionStart, 0);
    equal(host.querySelector('.status').textContent, '1 of 2');
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    equal(textarea.selectionStart, 8);

    controller.open({ replace: true });
    equal(replaceRow.hidden, false);
    replaceInput.value = 'fox';
    host.querySelector('.replace-one').click();
    equal(textarea.value, 'cat dog fox');
    host.querySelector('.replace-all').click();
    equal(textarea.value, 'fox dog fox');
    equal(JSON.stringify(changes), JSON.stringify([
        'before',
        ['Replace code match', 1],
        'before',
        ['Replace all code matches', 1]
    ]));

    host.querySelector('.expand').click();
    equal(replaceRow.hidden, true);
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    equal(panel.hidden, true);
    equal(document.activeElement, textarea);
    host.remove();
});

test('Code view regex toggle reports invalid expressions', () => {
    const host = document.createElement('div');
    host.innerHTML = `
        <div class="panel" hidden>
            <input class="find">
            <button class="regex" aria-pressed="false"></button>
            <span class="status"></span>
            <button class="previous"></button>
            <button class="next"></button>
        </div>
        <textarea>sample</textarea>`;
    document.body.append(host);
    const panel = host.querySelector('.panel');
    const searchInput = host.querySelector('.find');
    const regexToggle = host.querySelector('.regex');
    const controller = createCodeFindController({
        textarea: host.querySelector('textarea'),
        panel,
        searchInput,
        regexToggle,
        previousButton: host.querySelector('.previous'),
        nextButton: host.querySelector('.next'),
        status: host.querySelector('.status')
    });
    controller.bind();
    controller.open();
    regexToggle.click();
    searchInput.value = '[';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    equal(searchInput.getAttribute('aria-invalid'), 'true');
    equal(host.querySelector('.status').textContent, 'Invalid regex');
    equal(host.querySelector('.next').disabled, true);
    host.remove();
});

test('starting with a blank file dismisses onboarding for the current session', () => {
    const card = document.createElement('div');
    const blankButton = document.createElement('button');
    const values = new Map();
    const preferences = {
        get: (key, fallback) => values.has(key) ? values.get(key) : fallback,
        set: (key, value) => values.set(key, value)
    };
    const onboarding = createOnboardingController({ card, blankButton, preferences });
    onboarding.bind();
    equal(card.hidden, false);

    blankButton.click();
    equal(card.hidden, true);
    equal(values.get('onboardingDismissed'), true);

    const reloadedCard = document.createElement('div');
    createOnboardingController({ card: reloadedCard, preferences }).bind();
    equal(reloadedCard.hidden, true);
});

test('document recovery prompt offers restore and hides after the choice', () => {
    const host = document.createElement('div');
    host.innerHTML = `
        <section data-prompt hidden>
            <p data-message></p>
            <button data-restore>Restore</button>
            <button data-discard>Discard</button>
            <button data-dismiss>Not now</button>
        </section>`;
    document.body.append(host);
    const restored = [];
    const prompt = createRecoveryPrompt({
        container: host.querySelector('[data-prompt]'),
        message: host.querySelector('[data-message]'),
        restoreButton: host.querySelector('[data-restore]'),
        discardButton: host.querySelector('[data-discard]'),
        dismissButton: host.querySelector('[data-dismiss]'),
        onRestore: record => restored.push(record.draftId),
        formatSavedAt: () => 'recently'
    });
    prompt.bind();
    prompt.show({ draftId: 'draft-1', savedAt: 100 });

    equal(host.querySelector('[data-prompt]').hidden, false);
    equal(host.querySelector('[data-message]').textContent, 'Propel saved a local recovery copy recently.');
    host.querySelector('[data-restore]').click();

    equal(restored.join(','), 'draft-1');
    equal(host.querySelector('[data-prompt]').hidden, true);
    host.remove();
});

test('document recovery store round trips a versioned IndexedDB record', async () => {
    const store = createDocumentRecoveryStore(window.indexedDB, {
        databaseName: 'propel-browser-tests-v3'
    });
    await store.clear();
    const record = {
        schemaVersion: DOCUMENT_RECOVERY_SCHEMA_VERSION,
        draftId: 'browser-recovery-test',
        savedAt: Date.now(),
        html: '<p>Browser recovery</p>',
        rootAttributes: [{ name: 'class', value: 'content-area' }],
        language: 'en',
        revision: 2
    };

    await store.save({ ...record, draftId: 'older-copy', savedAt: record.savedAt - 1 });
    await store.save(record);
    equal(await store.get('older-copy'), null);
    const restored = await store.get(record.draftId);
    equal(restored.html, record.html);
    equal((await store.getLatest()).draftId, record.draftId);
    await store.clear();
    equal(await store.get(record.draftId), null);
});

test('cheatsheet starts on Instructions and preserves the selected tab', () => {
    const host = document.createElement('div');
    host.innerHTML = `
        <button data-toggle>Help</button>
        <button data-feedback>Feedback</button>
        <button data-instructions>View instructions</button>
        <div data-backdrop></div>
        <section data-dialog hidden>
            <button data-close>Close</button>
            <button data-cheatsheet-tab="instructions" aria-selected="true">Instructions</button>
            <button data-cheatsheet-tab="tips" aria-selected="false">Tips</button>
            <button data-cheatsheet-tab="feedback" aria-selected="false">Feedback</button>
            <section data-cheatsheet-panel="instructions"></section>
            <section data-cheatsheet-panel="tips" hidden></section>
            <section data-cheatsheet-panel="feedback" hidden></section>
        </section>`;
    document.body.append(host);
    const dialog = host.querySelector('[data-dialog]');
    const toggleButton = host.querySelector('[data-toggle]');
    const controller = createDrawerControllers({
        activity: {},
        shortcuts: {
            dialog,
            toggleButton,
            feedbackButton: host.querySelector('[data-feedback]'),
            instructionsButton: host.querySelector('[data-instructions]'),
            closeButton: host.querySelector('[data-close]'),
            backdrop: host.querySelector('[data-backdrop]')
        }
    });
    controller.bind();

    toggleButton.click();
    equal(host.querySelector('[data-cheatsheet-tab="instructions"]').getAttribute('aria-selected'), 'true');
    host.querySelector('[data-cheatsheet-tab="tips"]').click();
    equal(host.querySelector('[data-cheatsheet-panel="tips"]').hidden, false);
    controller.shortcuts.close();
    controller.shortcuts.open();
    equal(host.querySelector('[data-cheatsheet-tab="tips"]').getAttribute('aria-selected'), 'true');
    equal(host.querySelector('[data-cheatsheet-panel="tips"]').hidden, false);
    controller.shortcuts.close();
    host.querySelector('[data-instructions]').click();
    equal(host.querySelector('[data-cheatsheet-tab="instructions"]').getAttribute('aria-selected'), 'true');
    equal(host.querySelector('[data-cheatsheet-panel="instructions"]').hidden, false);
    host.querySelector('[data-cheatsheet-tab="instructions"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    equal(host.querySelector('[data-cheatsheet-tab="feedback"]').getAttribute('aria-selected'), 'true');
    equal(host.querySelector('[data-cheatsheet-panel="feedback"]').hidden, false);
    controller.shortcuts.close();
    const feedbackButton = host.querySelector('[data-feedback]');
    feedbackButton.focus();
    feedbackButton.click();
    equal(host.querySelector('[data-cheatsheet-tab="feedback"]').getAttribute('aria-selected'), 'true');
    equal(feedbackButton.getAttribute('aria-expanded'), 'true');
    controller.shortcuts.close();
    equal(feedbackButton.getAttribute('aria-expanded'), 'false');
    equal(document.activeElement, feedbackButton);
    host.remove();
});

test('feedback composer changes prompts and prefills either destination', () => {
    const host = document.createElement('form');
    host.innerHTML = `
        <input type="radio" name="type" value="problem" checked>
        <input type="radio" name="type" value="improvement">
        <input data-title required>
        <label data-details-label></label>
        <textarea data-details required></textarea>
        <a data-github></a>
        <a data-email></a>
    `;
    document.body.append(host);
    const environment = {
        appVersion: '1.2.3',
        protocol: 'https:',
        hostname: 'internal.example',
        userAgent: navigator.userAgent,
        browserLanguage: 'en-CA'
    };
    const typeInputs = host.querySelectorAll('[name="type"]');
    const titleInput = host.querySelector('[data-title]');
    const detailsInput = host.querySelector('[data-details]');
    const detailsLabel = host.querySelector('[data-details-label]');
    const githubIssueLink = host.querySelector('[data-github]');
    const feedbackEmailLink = host.querySelector('[data-email]');
    createFeedbackComposer({
        form: host,
        typeInputs,
        titleInput,
        detailsInput,
        detailsLabel,
        githubIssueLink,
        feedbackEmailLink
    }, environment);

    equal(detailsLabel.textContent, 'What happened?');
    equal(titleInput.placeholder.includes('Table cleanup'), true);
    titleInput.value = 'Pin common components';
    detailsInput.value = 'Keep selected components at the top.';
    typeInputs[1].checked = true;
    typeInputs[1].dispatchEvent(new Event('change'));

    equal(detailsLabel.textContent, 'What would improve Propel?');
    equal(detailsInput.placeholder.includes('pin frequently used components'), true);
    equal(githubIssueLink.href, buildFeatureRequestUrl(environment, {
        type: 'improvement',
        title: titleInput.value,
        details: detailsInput.value
    }));
    equal(feedbackEmailLink.href, buildFeedbackEmailUrl(environment, {
        type: 'improvement',
        title: titleInput.value,
        details: detailsInput.value
    }));
    const issueUrl = new URL(githubIssueLink.href);
    equal(issueUrl.searchParams.get('template'), 'feature_request.yml');
    equal(issueUrl.searchParams.get('title'), 'Pin common components');
    equal(issueUrl.searchParams.get('details'), 'Keep selected components at the top.');
    equal(issueUrl.searchParams.get('environment').includes('internal.example'), false);
    const emailUrl = new URL(feedbackEmailLink.href);
    equal(emailUrl.searchParams.get('subject'), 'Propel feedback: Pin common components');
    equal(emailUrl.searchParams.get('body').includes('Type: Suggestion'), true);
    host.remove();
});

test('feedback composer prevents an empty destination handoff', () => {
    const host = document.createElement('form');
    host.innerHTML = `
        <input type="radio" name="type" value="problem" checked>
        <input data-title required>
        <textarea data-details required></textarea>
        <a data-github href="#destination">GitHub</a>
    `;
    document.body.append(host);
    const githubIssueLink = host.querySelector('[data-github]');
    createFeedbackComposer({
        form: host,
        typeInputs: host.querySelectorAll('[name="type"]'),
        titleInput: host.querySelector('[data-title]'),
        detailsInput: host.querySelector('[data-details]'),
        githubIssueLink
    }, {});
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    githubIssueLink.dispatchEvent(event);

    equal(event.defaultPrevented, true);
    host.remove();
});

test('feedback URL builders omit the current hostname', () => {
    const environment = {
        protocol: 'https:',
        hostname: 'internal.example',
        userAgent: navigator.userAgent,
        browserLanguage: 'en-CA'
    };
    equal(buildBugReportUrl(environment).includes('internal.example'), false);
    equal(buildFeedbackEmailUrl(environment).includes('internal.example'), false);
});

test('English footnote return text is preserved', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>A<sup><a href="#footnote-1" id="footnote-ref-1">[1]</a></sup></p><ol><li id="footnote-1">Note <a href="#footnote-ref-1">back</a></li></ol>';
    const strings = { FN_DT: 'Footnote', FN_H2: 'Footnotes', FN_SP1: 'Return to', FN_SP2: 'referrer' };
    createBodyFtnTags(root, strings);
    replaceFootnoteSection(root, strings, true);
    equal(root.querySelector('.fn-rtn .wb-inv:last-child').textContent.trim(), 'referrer');
});

test('table cleanup creates WET structure', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Name</td><td>Value</td></tr><tr><td>A</td><td>1</td></tr></tbody></table>';
    const result = cleanupTable(host.querySelector('table'));
    equal(result.querySelectorAll('thead').length, 1);
});

test('table cleanup creates financial footers without paragraph wrappers', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Name</td><td>Value</td></tr></tbody></table>';
    cleanupTable(host.querySelector('table'), { addTfoot: true, financialTable: true });

    equal(host.querySelector('tfoot p'), null);
    equal(host.querySelector('tfoot td').textContent, 'NOTES, SOURCES and FOOTNOTES GO HERE');
});

test('table cleanup keeps paragraph wrappers in non-financial footers', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Name</td><td>Value</td></tr></tbody></table>';
    cleanupTable(host.querySelector('table'), { addTfoot: true, financialTable: false });

    equal(host.querySelector('tfoot p').textContent, 'NOTES, SOURCES and FOOTNOTES GO HERE');
});

test('table editor runs initial cleanup only for uncleaned tables', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Name</td><td>Value</td></tr></tbody></table>';
    const table = host.querySelector('table');

    equal(shouldRunInitialTableCleanup(table, true, isCleanedTable), true);
    cleanupTable(table);
    equal(shouldRunInitialTableCleanup(table, true, isCleanedTable), false);
    equal(shouldRunInitialTableCleanup(table, false, isCleanedTable), false);
});

test('table editor commits preserve the Live editor scroll position', () => {
    const liveEditor = document.createElement('div');
    const content = document.createElement('div');
    liveEditor.style.cssText = 'height: 20px; overflow: auto;';
    content.style.height = '600px';
    liveEditor.appendChild(content);
    document.body.appendChild(liveEditor);
    liveEditor.scrollTop = 240;

    runPreservingElementScroll(liveEditor, () => {
        liveEditor.scrollTop = 0;
    });

    equal(liveEditor.scrollTop, 240);
    liveEditor.remove();
});

test('table scoping mode locks editing controls and provides an explicit exit', () => {
    const fixture = createTableEditorScopingFixture();

    fixture.elements.tableEditorScopingModeBtn.click();

    equal(fixture.elements.tableEditorDialog.classList.contains('table-editor-scoping-locked'), true);
    equal(fixture.elements.tableEditorScopingModeBanner.hidden, false);
    equal(fixture.elements.tableEditorScopingModeBanner.parentElement.classList.contains('table-editor-toolbar'), true);
    equal(fixture.elements.tableEditorHeaderBtn.disabled, true);
    equal(fixture.elements.tableEditorNumber.disabled, true);
    equal(fixture.elements.tableEditorId.disabled, true);
    equal(fixture.elements.tableEditorApplyBtn.disabled, true);
    equal(fixture.elements.tableEditorScopingModeBtn.disabled, false);
    equal(fixture.elements.tableEditorScopingModeBtn.getAttribute('aria-label'), 'Exit scoping mode');

    fixture.elements.tableEditorScopingModeExitBtn.click();

    equal(fixture.elements.tableEditorDialog.classList.contains('table-editor-scoping-locked'), false);
    equal(fixture.elements.tableEditorScopingModeBanner.hidden, true);
    equal(fixture.elements.tableEditorHeaderBtn.disabled, false);
    equal(fixture.elements.tableEditorNumber.disabled, false);
    equal(fixture.elements.tableEditorId.disabled, false);
    equal(fixture.elements.tableEditorApplyBtn.disabled, false);

    fixture.elements.tableEditorScopingModeBtn.click();
    fixture.elements.tableEditorDialog.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
    }));
    equal(fixture.elements.tableEditorScopingModeBanner.hidden, true);
    equal(document.activeElement, fixture.elements.tableEditorScopingModeBtn);
    fixture.remove();
});

test('applying complex scoping matches header IDs to the committed table ID', () => {
    const fixture = createTableEditorScopingFixture();

    fixture.elements.tableEditorApplyBtn.click();

    equal(
        Array.from(fixture.inputHTML.querySelectorAll('th'), (header) => header.id).join(' '),
        't1-h1 t1-h2 t1-h3 t1-h4 t1-h5'
    );
    equal(fixture.inputHTML.querySelector('td').getAttribute('headers'), 't1-h2 t1-h4');
    fixture.remove();
});

test('table ID suggestion follows the table number and updates scoped header IDs when accepted', () => {
    const fixture = createTableEditorScopingFixture(
        '<p>Table 2b.1</p><table id="t1"><thead><tr><th id="old-label">Label</th><th id="old-value">Value</th></tr></thead><tbody><tr><th id="old-row">One</th><td>1</td></tr></tbody></table>'
    );

    equal(fixture.elements.tableEditorNumber.value, 'Table 2b.1');
    equal(fixture.elements.tableEditorNumber.hasAttribute('data-caption-suggestion'), true);
    equal(fixture.elements.tableEditorId.value, 't1');
    equal(fixture.elements.tableEditorId.hasAttribute('data-caption-suggestion'), false);
    fixture.elements.tableEditorNumberSuggestion.click();

    equal(fixture.elements.tableEditorId.value, 't2b-1');
    equal(fixture.elements.tableEditorId.hasAttribute('data-caption-suggestion'), true);
    equal(fixture.elements.tableEditorCanvas.querySelector('table').id, 't1');
    fixture.elements.tableEditorIdSuggestion.click();
    equal(fixture.elements.tableEditorCanvas.querySelector('table').id, 't2b-1');
    fixture.elements.tableEditorApplyBtn.click();

    const table = fixture.inputHTML.querySelector('table');
    equal(table.id, 't2b-1');
    equal(
        Array.from(table.querySelectorAll('th'), (header) => header.id).join(' '),
        't2b-1-h1 t2b-1-h2 t2b-1-h3'
    );
    fixture.remove();
});

test('initial table cleanup leaves the Table ID empty until its suggestion is accepted', () => {
    const fixture = createTableEditorScopingFixture(
        '<p>Table 1</p><table><tbody><tr><td>Label</td><td>Value</td></tr><tr><td>One</td><td>1</td></tr></tbody></table>',
        true
    );

    equal(fixture.elements.tableEditorNumber.value, 'Table 1');
    equal(fixture.elements.tableEditorNumber.hasAttribute('data-caption-suggestion'), true);
    equal(fixture.elements.tableEditorId.value, '');
    equal(fixture.elements.tableEditorCanvas.querySelector('table').hasAttribute('id'), false);

    fixture.elements.tableEditorNumberSuggestion.click();
    equal(fixture.elements.tableEditorId.value, 't1');
    equal(fixture.elements.tableEditorId.hasAttribute('data-caption-suggestion'), true);
    equal(fixture.elements.tableEditorCanvas.querySelector('table').hasAttribute('id'), false);

    fixture.elements.tableEditorIdSuggestion.click();
    equal(fixture.elements.tableEditorCanvas.querySelector('table').id, 't1');
    fixture.remove();
});

test('Apply assigns the next available generic ID when Table ID remains blank', () => {
    const fixture = createTableEditorScopingFixture(
        '<table id="t1"><tbody><tr><td>Existing</td><td>1</td></tr></tbody></table><table><tbody><tr><td>Next</td><td>2</td></tr></tbody></table>'
    );

    fixture.elements.tableEditorNextBtn.click();
    equal(fixture.elements.tableEditorId.value, '');
    fixture.elements.tableEditorApplyBtn.click();

    equal(fixture.inputHTML.querySelectorAll('table')[1].id, 't2');
    fixture.remove();
});

test('Apply and next assigns generic IDs in document order when Table IDs remain blank', () => {
    const fixture = createTableEditorScopingFixture(
        '<table><tbody><tr><td>First</td><td>1</td></tr></tbody></table><table><tbody><tr><td>Second</td><td>2</td></tr></tbody></table>'
    );

    fixture.elements.tableEditorApplyNextBtn.click();
    equal(fixture.inputHTML.querySelectorAll('table')[0].id, 't1');
    fixture.elements.tableEditorApplyBtn.click();

    equal(fixture.inputHTML.querySelectorAll('table')[1].id, 't2');
    fixture.remove();
});

test('table ID field applies a custom ID', () => {
    const fixture = createTableEditorScopingFixture();

    fixture.elements.tableEditorId.value = 'operating-expenses';
    fixture.elements.tableEditorId.dispatchEvent(new InputEvent('input', { bubbles: true }));
    fixture.elements.tableEditorApplyBtn.click();

    equal(fixture.inputHTML.querySelector('table').id, 'operating-expenses');
    fixture.remove();
});

test('table scoping drag paints the same live rectangle as cell selection', () => {
    const fixture = createTableEditorScopingFixture();
    fixture.elements.tableEditorScopingModeBtn.click();
    const cells = fixture.elements.tableEditorCanvas.querySelectorAll('th, td');
    const parent = cells[0];
    const first = cells[4];
    const second = cells[5];
    const third = cells[7];
    const fourth = cells[8];

    parent.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    equal(parent.classList.contains('scope-parent'), true);
    equal(parent.style.getPropertyValue('--scope-color'), '');

    first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fourth.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    equal(hasHeaderRelationship(parent, first), true);
    equal(hasHeaderRelationship(parent, second), true);
    equal(hasHeaderRelationship(parent, third), true);
    equal(hasHeaderRelationship(parent, fourth), true);

    second.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    equal(hasHeaderRelationship(parent, first), true);
    equal(hasHeaderRelationship(parent, second), true);
    equal(hasHeaderRelationship(parent, third), false);
    equal(hasHeaderRelationship(parent, fourth), false);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    fixture.remove();
});

function createTableEditorScopingFixture(
    tableMarkup = '<table id="t1"><thead><tr><th id="parent">Label</th><th id="column-a">A</th><th id="column-b">B</th></tr></thead><tbody><tr><th id="row-a">One</th><td>1</td><td>2</td></tr><tr><th id="row-b">Two</th><td>3</td><td>4</td></tr></tbody></table>',
    previewCleanup = false
) {
    const host = document.createElement('div');
    host.innerHTML = `
        <section id="tableEditorDialog" hidden>
            <button id="tableEditorFullscreenBtn">Fullscreen</button>
            <button id="tableEditorCloseBtn">Close</button>
            <aside class="table-editor-panel">
                <button id="tableEditorFirstBtn">First</button>
                <button id="tableEditorPrevBtn">Previous</button>
                <button id="tableEditorNextBtn">Next</button>
                <button id="tableEditorLastBtn">Last</button>
                <div id="tableEditorPages"></div>
                <button id="tableEditorComponentBtn">Component</button>
                <input id="tableEditorNumber"><button id="tableEditorNumberSuggestion"></button>
                <input id="tableEditorCaption"><button id="tableEditorCaptionSuggestion"></button>
                <input id="tableEditorUnit"><button id="tableEditorUnitSuggestion"></button>
                <input id="tableEditorId"><button id="tableEditorIdSuggestion"></button>
                <input id="tableEditorComplexScoping" type="checkbox" checked>
                <input id="tableEditorFinancial" type="checkbox">
                <input id="tableEditorFrench" type="checkbox">
            </aside>
            <div class="table-editor-workspace">
                <div class="table-editor-toolbar">
                    <div id="tableEditorScopingModeBanner" hidden>
                        <span id="tableEditorScopingModeInstructions"></span>
                        <button id="tableEditorScopingModeExitBtn">Exit scoping mode</button>
                    </div>
                    <button id="tableEditorUndoBtn">Undo</button><button id="tableEditorRedoBtn">Redo</button>
                    <button id="tableEditorDeselectBtn">Deselect</button>
                    <button id="tableEditorScopingModeBtn" aria-label="Enter scoping mode" aria-pressed="false">Scope</button>
                    <button id="tableEditorHeaderBtn">Header</button><button id="tableEditorMergeRowBtn">Merge row</button>
                    <button id="tableEditorMergeCellsBtn">Merge cells</button><button id="tableEditorActiveBtn">Highlight</button>
                    <button id="tableEditorAddFooterBtn">Add footer</button><button id="tableEditorTfootBtn">Move footer</button>
                    <button id="tableEditorIndentBtn">Indent</button><button id="tableEditorOutdentBtn">Outdent</button>
                    <button id="tableEditorBoldBtn">Bold</button><button id="tableEditorLeftBtn">Left</button>
                    <button id="tableEditorCenterBtn">Center</button><button id="tableEditorRightBtn">Right</button>
                    <button id="tableEditorDeleteRowBtn">Delete row</button><button id="tableEditorDeleteColumnBtn">Delete column</button>
                </div>
                <div id="tableEditorCanvas" contenteditable="true"></div>
            </div>
            <span id="tableEditorStatus"></span>
            <button id="tableEditorCancelBtn">Cancel</button>
            <button id="tableEditorApplyNextBtn">Apply next</button>
            <button id="tableEditorApplyBtn">Apply</button>
        </section>`;
    document.body.append(host);
    const ids = [
        'tableEditorDialog', 'tableEditorFullscreenBtn', 'tableEditorCloseBtn', 'tableEditorCancelBtn',
        'tableEditorApplyBtn', 'tableEditorApplyNextBtn', 'tableEditorComponentBtn', 'tableEditorFirstBtn',
        'tableEditorPrevBtn', 'tableEditorNextBtn', 'tableEditorLastBtn', 'tableEditorPages',
        'tableEditorUndoBtn', 'tableEditorRedoBtn', 'tableEditorDeselectBtn', 'tableEditorScopingModeBtn',
        'tableEditorScopingModeBanner', 'tableEditorScopingModeInstructions', 'tableEditorScopingModeExitBtn',
        'tableEditorHeaderBtn', 'tableEditorMergeRowBtn', 'tableEditorMergeCellsBtn', 'tableEditorActiveBtn',
        'tableEditorAddFooterBtn', 'tableEditorTfootBtn', 'tableEditorIndentBtn', 'tableEditorOutdentBtn',
        'tableEditorBoldBtn', 'tableEditorLeftBtn', 'tableEditorCenterBtn', 'tableEditorRightBtn',
        'tableEditorDeleteRowBtn', 'tableEditorDeleteColumnBtn', 'tableEditorStatus', 'tableEditorCanvas',
        'tableEditorNumber', 'tableEditorCaption', 'tableEditorUnit', 'tableEditorNumberSuggestion',
        'tableEditorCaptionSuggestion', 'tableEditorUnitSuggestion', 'tableEditorId', 'tableEditorIdSuggestion',
        'tableEditorComplexScoping',
        'tableEditorFinancial', 'tableEditorFrench'
    ];
    const elements = Object.fromEntries(ids.map((id) => [id, host.querySelector(`#${id}`)]));
    elements.tableEditorSnapGuides = [];
    elements.optionHelpButtons = [];
    const inputHTML = document.createElement('div');
    inputHTML.innerHTML = tableMarkup;
    const controller = createTableEditorController({
        elements,
        inputHTML,
        liveEditor: document.createElement('div'),
        liveEditorHost: document.createElement('div'),
        uiPreferences: { get: () => ({}), set: () => {} },
        cleanupTable,
        isCleanedTable,
        defaultTableCleanupOptions,
        renameTag,
        getEditorSelection: () => null,
        getClosestElement: () => null,
        preserveParagraphsOnEnter: () => {},
        getFocusableElements: (root) => Array.from(root.querySelectorAll('button:not(:disabled), input:not(:disabled)')),
        addProcessingLog: () => {},
        showActivityToast: () => {},
        syncLiveToInputHTML: () => {},
        scrollLiveElementIntoView: () => {},
        commitTableChanges: () => {},
        isLiveEditorSelectingText: () => false,
        isEnglish: () => true
    });
    controller.createListeners();
    controller.open(0, { previewCleanup });
    return { controller, elements, inputHTML, remove: () => { controller.close(); host.remove(); } };
}

test('table option refresh preserves manual bold and source markup', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Name</td><td>Value</td></tr><tr><td><p>Manually bold</p></td><td width="80">1</td></tr></tbody></table>';
    cleanupTable(host.querySelector('table'));
    const table = host.querySelector('table');
    const rowHeader = table.querySelector('tbody th');
    const value = table.querySelector('tbody td');
    rowHeader.classList.remove('fnt-nrml');
    rowHeader.innerHTML = '<p>Manually bold</p>';
    value.setAttribute('width', '80');

    cleanupTable(table, {
        ...defaultTableCleanupOptions,
        financialTable: false,
        trim: false,
        removeBoldFromRowHeaders: false,
        removeAttributes: [],
        unwrapTags: []
    });

    equal(rowHeader.classList.contains('fnt-nrml'), false);
    equal(rowHeader.querySelector('p').textContent, 'Manually bold');
    equal(value.getAttribute('width'), '80');
});

test('live table hover shows edit and component conversion pills', () => {
    const liveEditorHost = document.createElement('div');
    const liveEditor = document.createElement('div');
    const popover = document.createElement('button');
    const componentPopover = document.createElement('button');
    liveEditor.innerHTML = '<table><tbody><tr><td>Value</td></tr></tbody></table>';
    liveEditorHost.append(liveEditor, popover, componentPopover);
    document.body.append(liveEditorHost);

    const controller = createTableEditorController({
        elements: { liveTableEditPopover: popover, liveTableComponentPopover: componentPopover },
        inputHTML: document.createElement('div'),
        liveEditor,
        liveEditorHost,
        getEditorSelection: () => null,
        getClosestElement: (target, root, selector) => {
            const match = target.closest(selector);
            return match && root.contains(match) ? match : null;
        },
        isLiveEditorSelectingText: () => false,
        isEnglish: () => true
    });

    controller.handleLiveTableHover({ target: liveEditor.querySelector('td') });
    equal(popover.classList.contains('visible'), true);
    equal(componentPopover.classList.contains('visible'), true);
    liveEditorHost.remove();
});

test('live table overlay controls keep focus and remain valid hover targets', () => {
    const host = document.createElement('div');
    const outsideButton = document.createElement('button');
    document.body.append(host, outsideButton);
    const editor = createWetLiveEditor(host);
    const shadow = editor.getRootNode();
    const editButton = shadow.getElementById('tableEditPopover');
    const convertButton = shadow.getElementById('tableComponentPopover');
    const editButtonLabel = editButton.querySelector('span:last-child');

    host.addEventListener('focus', (event) => {
        focusWetLiveEditorFromHost(event, host, editor);
    });

    editButton.classList.add('visible');
    editButton.focus();
    equal(shadow.activeElement, editButton);
    equal(isWetLiveEditorOverlayTarget(editButtonLabel, [editButton, convertButton]), true);

    outsideButton.focus();
    host.focus();
    equal(shadow.activeElement, editor);

    host.remove();
    outsideButton.remove();
});

test('reciprocal caret maps the same text position between source and Live view', () => {
    const root = document.createElement('div');
    const html = '<div><p>One <strong>two</strong> three</p></div>';
    root.innerHTML = '<p>One <strong>two</strong> three</p>';
    const entries = buildElementSourceMap(html);
    const textNode = root.querySelector('strong').firstChild;
    const decodeEntity = source => {
        const decoder = document.createElement('textarea');
        decoder.innerHTML = source;
        return decoder.value;
    };

    const sourceIndex = getSourceIndexForLiveCaret({
        html, root, node: textNode, offset: 2, entries, decodeEntity
    });
    equal(sourceIndex, html.indexOf('two') + 2);

    const entry = entries.find(candidate => candidate.pathKey === '0.0');
    const point = getLiveCaretForSourceIndex({ html, root, sourceIndex, entry, decodeEntity });
    equal(point.node, textNode);
    equal(point.offset, 2);
});

test('table cleanup does not make colspan rows active automatically', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Label</td><td>Value</td></tr><tr><td colspan="2">Group</td></tr></tbody></table>';
    cleanupTable(host.querySelector('table'));
    const groupRow = host.querySelector('tbody tr');

    equal(groupRow.classList.contains('active'), false);
    equal(groupRow.querySelector('th').getAttribute('scope'), 'colgroup');
});

test('deleting a selected table column removes that visual column from every row', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>A</th><th class="selected">B</th><th>C</th></tr></thead><tbody><tr><th>One</th><td>2</td><td>3</td></tr></tbody></table>';
    const table = host.querySelector('table');

    const result = deleteSelectedTableColumns(table, table.querySelectorAll('.selected'));

    equal(result.deletedColumns, 1);
    equal(table.rows[0].textContent, 'AC');
    equal(table.rows[1].textContent, 'One3');
});

test('deleting a table column reduces cells that span across it', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>A</th><th class="selected">B</th><th>C</th></tr></thead><tbody><tr><td colspan="2">Wide</td><td>Last</td></tr></tbody><tfoot><tr><td colspan="3">Notes</td></tr></tfoot></table>';
    const table = host.querySelector('table');

    deleteSelectedTableColumns(table, table.querySelectorAll('.selected'));

    equal(table.querySelector('tbody td').hasAttribute('colspan'), false);
    equal(table.querySelector('tfoot td').getAttribute('colspan'), '2');
});

test('deleting a table column removes relationships to deleted headers', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th id="a">A</th><th id="b" class="selected">B</th><th id="c">C</th></tr></thead><tbody><tr><th id="row">One</th><td>Middle</td><td headers="a b row" data-propel-scope-add="a b" data-propel-scope-remove="b">2</td></tr></tbody></table>';
    const table = host.querySelector('table');

    deleteSelectedTableColumns(table, table.querySelectorAll('.selected'));

    const value = table.querySelector('tbody td:last-child');
    equal(value.getAttribute('headers'), 'a row');
    equal(value.getAttribute('data-propel-scope-add'), 'a');
    equal(value.hasAttribute('data-propel-scope-remove'), false);
});

test('deleting columns refuses to remove the table last column', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td class="selected">Only</td></tr></tbody></table>';
    const table = host.querySelector('table');

    const result = deleteSelectedTableColumns(table, table.querySelectorAll('.selected'));

    equal(result.blocked, true);
    equal(table.querySelector('td').textContent, 'Only');
});

test('moving row content creates a full-width table footer', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><th>Source:</th><td><strong>Finance</strong></td></tr><tr><td>A</td><td>1</td></tr></tbody></table>';
    const table = host.querySelector('table');
    const sourceRow = table.querySelector('tbody tr');

    const result = moveRowsToTableFooter(table, [sourceRow]);

    equal(result.movedRows, 1);
    equal(table.querySelectorAll('tbody tr').length, 1);
    equal(table.querySelector('tfoot td').getAttribute('colspan'), '2');
    equal(table.querySelector('tfoot p'), null);
    equal(table.querySelector('tfoot td').innerHTML, 'Source: <strong>Finance</strong>');
});

test('moving another row appends a new paragraph to the existing footer', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Second note</td></tr></tbody><tfoot><tr class="small"><td><p>&nbsp;</p><p>First note</p></td></tr></tfoot></table>';
    const table = host.querySelector('table');

    moveRowsToTableFooter(table, [table.querySelector('tbody tr')]);

    const paragraphs = table.querySelectorAll('tfoot p');
    equal(paragraphs.length, 2);
    equal(paragraphs[0].textContent, 'First note');
    equal(paragraphs[1].textContent, 'Second note');
});

test('adding a second footer note wraps direct content into paragraphs', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Second note</td></tr></tbody><tfoot><tr class="small"><td>First <strong>note</strong></td></tr></tfoot></table>';
    const table = host.querySelector('table');

    moveRowsToTableFooter(table, [table.querySelector('tbody tr')]);

    const paragraphs = table.querySelectorAll('tfoot p');
    equal(paragraphs.length, 2);
    equal(paragraphs[0].innerHTML, 'First <strong>note</strong>');
    equal(paragraphs[1].textContent, 'Second note');
});

test('NBSP correction leaves image alt spaces intact', () => {
    equal(fixNbspHTML('<img alt="Table 2">Table 2', false), '<img alt="Table 2">Table&nbsp;2');
});

test('table model selects a rectangular range', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>';
    const cells = host.querySelectorAll('td');
    equal(getCellsInRange(host.querySelector('table'), cells[0], cells[3]).length, 4);
});

test('table editor bold toggles fnt-nrml on header cells without adding strong', () => {
    const header = document.createElement('th');
    header.textContent = 'Heading';

    toggleCellBold(header);
    equal(header.classList.contains('fnt-nrml'), true);
    equal(header.querySelector('strong'), null);

    toggleCellBold(header);
    equal(header.classList.contains('fnt-nrml'), false);
    equal(header.querySelector('strong'), null);
});

test('table editor bold continues to wrap data cell content', () => {
    const cell = document.createElement('td');
    cell.classList.add('fnt-nrml');
    cell.textContent = 'Value';

    toggleCellBold(cell);
    equal(cell.innerHTML, '<strong>Value</strong>');
    equal(cell.classList.contains('fnt-nrml'), false);

    toggleCellBold(cell);
    equal(cell.innerHTML, 'Value');
    equal(cell.classList.contains('fnt-nrml'), true);
});

test('table editor bold makes a mixed cell selection uniformly bold', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tr><th>Heading</th><th class="fnt-nrml">Normal heading</th><td><strong>Bold value</strong></td><td>Normal value</td></tr></table>';
    const cells = host.querySelectorAll('th, td');

    toggleCellsBold(cells);

    equal(cells[0].classList.contains('fnt-nrml'), false);
    equal(cells[1].classList.contains('fnt-nrml'), false);
    equal(cells[2].innerHTML, '<strong>Bold value</strong>');
    equal(cells[3].innerHTML, '<strong>Normal value</strong>');
});

test('table editor bold unbolds every cell when the full selection is bold', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tr><th>Heading</th><td><strong>Value</strong></td></tr></table>';
    const cells = host.querySelectorAll('th, td');

    toggleCellsBold(cells);

    equal(cells[0].classList.contains('fnt-nrml'), true);
    equal(cells[0].querySelector('strong'), null);
    equal(cells[1].innerHTML, 'Value');
});

test('table editor active row applies bold to every cell', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><th class="fnt-nrml">Heading</th><td>Value</td></tr></tbody></table>';
    const row = host.querySelector('tr');
    const cells = row.querySelectorAll('th, td');

    toggleRowsActive([row]);

    equal(row.classList.contains('active'), true);
    equal(cells[0].classList.contains('fnt-nrml'), false);
    equal(cells[0].getAttribute('scope'), 'colgroup');
    equal(cells[1].innerHTML, '<strong>Value</strong>');
});

test('table editor inactive row removes bold from every cell', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr class="active"><th>Heading</th><td><strong>Value</strong></td></tr></tbody></table>';
    const row = host.querySelector('tr');
    const cells = row.querySelectorAll('th, td');

    toggleRowsActive([row]);

    equal(row.classList.contains('active'), false);
    equal(cells[0].classList.contains('fnt-nrml'), true);
    equal(cells[0].getAttribute('scope'), 'row');
    equal(cells[1].innerHTML, 'Value');
    equal(cells[1].classList.contains('fnt-nrml'), true);
});

test('complex scoping associates active parent, row, and column headers', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table id="expenses"><thead><tr><th>Trip</th><th>Cost</th></tr></thead><tbody><tr class="active"><th colspan="2">Toronto</th></tr><tr><th>Meals</th><td>$20</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true, renameTag });
    const headers = table.querySelectorAll('th');
    const value = table.querySelector('td');

    equal(value.getAttribute('headers'), `${headers[1].id} ${headers[2].id} ${headers[3].id}`);
});

test('complex scoping uses an indented row as a child of a merged row', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><th colspan="2">Assets</th></tr><tr><th><div class="mrgn-lft-md">Cash</div></th><td>10</td></tr><tr><th>Unrelated</th><td>20</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true, renameTag });
    const bodyHeaders = table.querySelectorAll('tbody th');
    const values = table.querySelectorAll('tbody td');

    equal(values[0].getAttribute('headers').includes(bodyHeaders[0].id), true);
    equal(values[1].getAttribute('headers').includes(bodyHeaders[0].id), false);
    equal(table.id, 't1');
});

test('complex scoping follows md, lg, and xl indentation levels', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr class="active"><th colspan="2">Total</th></tr><tr><th><div class="mrgn-lft-md">Group</div></th><td>1</td></tr><tr><th><div class="mrgn-lft-lg">Subgroup</div></th><td>2</td></tr><tr><th><div class="mrgn-lft-xl">Item</div></th><td>3</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true, renameTag });
    const bodyHeaders = table.querySelectorAll('tbody th');
    const item = table.querySelectorAll('tbody td')[2];
    const associations = item.getAttribute('headers').split(' ');

    equal(associations.includes(bodyHeaders[0].id), true);
    equal(associations.includes(bodyHeaders[1].id), true);
    equal(associations.includes(bodyHeaders[2].id), true);
    equal(associations.includes(bodyHeaders[3].id), true);
});

test('simple scoping omits explicit headers associations', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><th>Cash</th><td headers="old">10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: false, renameTag });

    equal(table.querySelector('td').hasAttribute('headers'), false);
    equal(table.querySelector('tbody th').getAttribute('scope'), 'row');
});

test('complex scoping uses the next Add IDs table identifier', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div id="t1"></div><table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><th>Cash</th><td>10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true, idRoot: host, renameTag });

    equal(table.id, 't2');
    equal(table.querySelector('th').id, 't2-h1');
});

test('complex scoping matches header IDs and references to the current table ID on commit', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table id="expenses"><thead><tr><th id="expenses-h1">Label</th><th id="expenses-h2">Value</th></tr></thead><tbody><tr><th id="expenses-h3">Cash</th><td headers="expenses-h2 expenses-h3">10</td></tr></tbody></table>';
    const table = host.querySelector('table').cloneNode(true);
    table.querySelectorAll('th').forEach((header, index) => {
        header.id = `old-${index + 1}`;
    });
    const value = table.querySelector('td');
    value.setAttribute('headers', 'old-2 old-3');
    value.setAttribute('data-propel-scope-add', 'old-3');
    applyTableScopes(table, {
        complex: true,
        idRoot: host,
        matchHeaderIdsToTable: true,
        renameTag
    });
    const headers = table.querySelectorAll('th');

    equal(Array.from(headers, (header) => header.id).join(' '), 'expenses-h1 expenses-h2 expenses-h3');
    equal(value.getAttribute('headers'), 'expenses-h2 expenses-h3');
    equal(value.getAttribute('data-propel-scope-add'), 'expenses-h3');

    applyTableScopes(table, {
        complex: true,
        idRoot: host,
        matchHeaderIdsToTable: true,
        renameTag
    });
    equal(Array.from(headers, (header) => header.id).join(' '), 'expenses-h1 expenses-h2 expenses-h3');
});

test('painted scoping relationships override automatic associations', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr class="active"><th colspan="2">Parent</th></tr><tr><th>Child</th><td>10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true, idRoot: host, renameTag });
    const parent = table.querySelector('tbody th');
    const child = table.querySelector('tbody td');

    equal(hasHeaderRelationship(parent, child), true);
    setManualHeaderRelationship(parent, child, false);
    applyTableScopes(table, { complex: true, idRoot: host, renameTag });
    equal(hasHeaderRelationship(parent, child), false);
    setManualHeaderRelationship(parent, child, true);
    applyTableScopes(table, { complex: true, idRoot: host, renameTag });
    equal(hasHeaderRelationship(parent, child), true);
});

test('existing explicit scoping is preserved when a table is reopened', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table id="t1"><thead><tr><th id="label">Label</th><th id="value">Value</th></tr></thead><tbody><tr class="active"><th id="parent" colspan="2">Parent</th></tr><tr><th id="child">Child</th><td headers="value child">10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    const child = table.querySelector('td');
    preserveExistingHeaderRelationships(table);
    applyTableScopes(table, { complex: true, idRoot: host, renameTag });

    equal(child.getAttribute('headers'), 'value child');
});

const output = document.getElementById('results');
let failures = 0;
const lines = [];
for (const item of tests) {
    try { await item.run(); lines.push(`PASS ${item.name}`); }
    catch (error) { failures += 1; lines.push(`FAIL ${item.name}\n  ${error.message}`); }
}
output.textContent = `${lines.join('\n')}\n\n${tests.length - failures}/${tests.length} passed`;
document.title = failures ? 'FAIL: Propel browser tests' : 'PASS: Propel browser tests';
