import { createBodyFtnTags, replaceFootnoteSection } from '../../src/commands/footnote-generator.js';
import { modifyHeadings, modifyTables, modifyFigures } from '../../src/commands/anchors-aweigh.js';
import { cleanupTable, defaultTableCleanupOptions } from '../../src/commands/table-cleanup.js';
import { fixNbspHTML, transformNbspHTML } from '../../src/commands/nbsp.js';
import { getCellsInRange } from '../../src/table-editor/model.js';
import { toggleCellBold, toggleCellsBold, toggleRowsActive } from '../../src/table-editor/formatting.js';
import {
    applyTableScopes,
    hasHeaderRelationship,
    preserveExistingHeaderRelationships,
    setManualHeaderRelationship
} from '../../src/table-editor/scoping.js';
import { renameTag } from '../../src/commands/table-cleanup.js';
import { convertTableCell } from '../../src/commands/table-cell.js';
import { createDrawerControllers } from '../../src/ui/drawers.js';
import { applyBlockFormat } from '../../src/ui/block-format.js';
import { combineLiveEditorComponents, ensureRootTextBlockForInput, preserveParagraphsOnEnter } from '../../src/ui/live-editing.js';
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
    normalizeLiveEditClone,
    restoreLiveListPlaceholders
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
import { highlightHTML } from '../../src/ui/html-syntax-highlight.js';
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

test('Add IDs uses tbl for tables, skips occupied IDs, and preserves existing IDs on repeat runs', () => {
    const host = document.createElement('div');
    host.innerHTML = '<h2>Heading</h2><div id="tbl1"></div><table id="t1"></table><table></table><table id="custom"></table><details><summary>Text version</summary><table></table></details><figure></figure>';
    const modified = [];
    modifyHeadings(host, 0, modified);
    modifyTables(host, 0, modified);
    modifyFigures(host, 0, modified);

    equal(host.querySelector('h2').id, 'a1');
    equal(Array.from(host.querySelectorAll('table'), table => table.id).join(' '), 't1 tbl2 custom tbl3');
    equal(host.querySelector('figure').id, 'f1');
    equal(modified.map(element => element.id).join(' '), 'a1 t1 tbl2 custom tbl3 f1');
    const html = host.innerHTML;
    modifyTables(host, 0, []);
    equal(host.innerHTML, html);
});

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

for (const inputType of ['deleteContentBackward', 'deleteContentForward']) {
    test(`${inputType} still combines adjacent paragraphs and preserves the join caret`, () => {
        const live = document.createElement('div');
        live.innerHTML = '<p>Before</p><p><em>After</em></p>';
        document.body.append(live);
        const selection = window.getSelection();
        const range = document.createRange();
        const backward = inputType === 'deleteContentBackward';
        range.selectNodeContents(live.children[backward ? 1 : 0]);
        range.collapse(backward);
        selection.removeAllRanges();
        selection.addRange(range);
        const event = new InputEvent('beforeinput', { inputType, cancelable: true });

        try {
            equal(combineLiveEditorComponents(event, live, selection), true);
            equal(event.defaultPrevented, true);
            equal(live.innerHTML, '<p>Before<em>After</em></p>');
            const beforeCaret = document.createRange();
            beforeCaret.selectNodeContents(live);
            beforeCaret.setEnd(selection.anchorNode, selection.anchorOffset);
            equal(beforeCaret.toString(), 'Before');
        } finally {
            selection.removeAllRanges();
            live.remove();
        }
    });
}

for (const tag of ['ul', 'ol']) {
    for (const wrapped of [false, true]) {
        test(`Backspace removes an empty ${tag}${wrapped ? ' wrapped in a paragraph' : ''} without leaving a bullet`, () => {
            const host = document.createElement('div');
            document.body.append(host);
            const live = createWetLiveEditor(host);
            live.innerHTML = `<p>Before</p><${tag}><li><br></li></${tag}><p>After</p>`;
            if (wrapped) {
                const paragraph = document.createElement('p');
                const list = live.querySelector(tag);
                list.before(paragraph);
                paragraph.append(list);
            }
            live.focus();
            const selection = live.getRootNode().getSelection();
            const range = document.createRange();
            range.setStart(live.querySelector('li'), 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            const event = new InputEvent('beforeinput', { inputType: 'deleteContentBackward', cancelable: true });

            try {
                equal(combineLiveEditorComponents(event, live, selection), false);
                equal(event.defaultPrevented, false);
                document.execCommand('delete', false, null);
                equal(live.querySelector('li, ul, ol'), null);
                equal(live.textContent, 'BeforeAfter');
                document.execCommand('insertText', false, ' text');
                equal(live.textContent, 'Before textAfter');
            } finally {
                selection.removeAllRanges();
                host.remove();
            }
        });
    }
}

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

test('standard cleanup preserves ordinary links and existing publishing cleanup', () => {
    const host = document.createElement('div');
    host.innerHTML = '<p>“Text” <a id="_bookmark"><em>bookmark</em></a><a href="#_Toc123">Contents</a>' +
        '<a href="https://example.com/?url=other&amp;q=a%2Bb#part" title="Details">Link</a>' +
        '<a href="../page.html">Relative</a><a href="#section">Section</a>' +
        '<a href="mailto:editor@example.com">Email</a><img src="image.png" alt="Chart"></p>';

    const changes = runStandardCleanup(host);

    equal(host.innerHTML, '<p>"Text" <em>bookmark</em><a href="">Contents</a>' +
        '<a href="https://example.com/?url=other&amp;q=a%2Bb#part" title="Details">Link</a>' +
        '<a href="../page.html">Relative</a><a href="#section">Section</a>' +
        '<a href="mailto:editor@example.com">Email</a><img src="" alt="Chart"></p>');
    equal(changes.imageSources, 1);
    equal(changes.bookmarks, 1);
    equal(changes.bookmarkLinks, 1);
});

test('standard cleanup restores Safe Links hrefs without changing link markup', () => {
    const host = document.createElement('div');
    const destination = 'https://www.canada.ca/fr/page%20name.html?q=a%2Bb&lang=fr#section';
    const wrapper = `https://nam01.safelinks.protection.outlook.com/?url=${encodeURIComponent(destination)}&amp;data=tracking`;
    host.innerHTML = `<p><a href="${wrapper}" title="Details" target="_blank" rel="noopener"><strong>Read / Lire</strong></a></p>`;

    const changes = runStandardCleanup(host);

    equal(changes.safeLinks, 1);
    equal(host.innerHTML, '<p><a href="https://www.canada.ca/fr/page%20name.html?q=a%2Bb&amp;lang=fr#section" title="Details" target="_blank" rel="noopener"><strong>Read / Lire</strong></a></p>');
    equal(runStandardCleanup(host).safeLinks, 0);
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

test('Live list normalization preserves surrounding prose, attributes, and nested lists', () => {
    const live = document.createElement('div');
    live.innerHTML = '<p id="intro" class="lead" lang="fr">Avant <em>la liste</em></p>';
    const baseline = captureLiveEditBaseline(live);
    const paragraph = live.firstElementChild;
    const list = document.createElement('ul');
    list.innerHTML = '<li>Un<ol><li>Deux</li></ol></li>';
    paragraph.append(list, 'Après');
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<p id="intro" class="lead" lang="fr">Avant <em>la liste</em></p>' +
        '<ul class="lead" lang="fr"><li>Un<ol><li>Deux</li></ol></li></ul>' +
        '<p class="lead" lang="fr">Après</p>');
    equal(live.firstElementChild, paragraph);
    equal(list.parentNode, paragraph);
});

test('Live list normalization retains paragraph attributes and empty list items without duplicate IDs', () => {
    const live = document.createElement('div');
    live.innerHTML = '<p id="items" class="lead" lang="fr"></p>';
    const baseline = captureLiveEditBaseline(live);
    const list = document.createElement('ul');
    list.innerHTML = '<li><br></li>';
    live.firstElementChild.append(list);
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<ul id="items" class="lead" lang="fr"><li></li></ul>');
    const canonical = document.createElement('div');
    replaceWithSanitizedHTML(canonical, clone.innerHTML);
    equal(canonical.innerHTML, clone.innerHTML);
});

test('rendering empty list items restores Live placeholders without changing canonical HTML', () => {
    const canonical = document.createElement('div');
    canonical.innerHTML = '<ul><li id="empty"></li><li>Parent<ol><li> \n </li></ol></li>' +
        '<li>Text<br></li><li><br><br></li></ul>';
    const originalHTML = canonical.innerHTML;
    const live = canonical.cloneNode(true);

    restoreLiveListPlaceholders(live);
    const liveHTML = live.innerHTML;
    restoreLiveListPlaceholders(live);

    equal(live.querySelector('#empty').innerHTML, '<br>');
    equal(live.querySelector('ol li').innerHTML, ' \n <br>');
    equal(live.innerHTML, liveHTML);
    equal(canonical.innerHTML, originalHTML);
    const clone = live.cloneNode(true);
    normalizeLiveEditClone(live, clone, captureLiveEditBaseline(live));
    equal(clone.innerHTML, originalHTML);
});

test('Live normalization removes only a lone placeholder break from empty list items', () => {
    const live = document.createElement('div');
    live.innerHTML = '<ul><li id="empty"> \n<br> </li><li>Line<br>Next</li>' +
        '<li><br><br></li><li><img alt="Chart"><br></li><li><br id="anchor"></li>' +
        '<li>Parent<ul><li><br></li></ul></li></ul>';
    const baseline = captureLiveEditBaseline(live);
    const originalHTML = live.innerHTML;
    const clone = live.cloneNode(true);

    normalizeLiveEditClone(live, clone, baseline);

    equal(clone.innerHTML, '<ul><li id="empty"> \n </li><li>Line<br>Next</li>' +
        '<li><br><br></li><li><img alt="Chart"><br></li><li><br id="anchor"></li>' +
        '<li>Parent<ul><li></li></ul></li></ul>');
    equal(live.innerHTML, originalHTML);
});

for (const tag of ['ul', 'ol']) {
    test(`Enter in a ${tag} keeps a Live caret placeholder out of synchronized HTML`, () => {
        const host = document.createElement('div');
        document.body.append(host);
        const live = createWetLiveEditor(host);
        live.innerHTML = `<${tag}><li>First</li></${tag}>`;
        const baseline = captureLiveEditBaseline(live);
        live.focus();
        const selection = live.getRootNode().getSelection();
        const range = document.createRange();
        range.selectNodeContents(live.querySelector('li'));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            document.execCommand('insertParagraph', false, null);
            const emptyItem = live.querySelector('li:last-child');
            equal(emptyItem.innerHTML, '<br>');
            const anchor = selection.anchorNode;
            const offset = selection.anchorOffset;
            const clone = live.cloneNode(true);
            normalizeLiveEditClone(live, clone, baseline);
            equal(clone.innerHTML, `<${tag}><li>First</li><li></li></${tag}>`);
            equal(emptyItem.innerHTML, '<br>');
            equal(selection.anchorNode, anchor);
            equal(selection.anchorOffset, offset);
            document.execCommand('insertText', false, 'Second');
            equal(emptyItem.textContent, 'Second');
        } finally {
            selection.removeAllRanges();
            host.remove();
        }
    });
}

for (const [command, tag] of [['insertUnorderedList', 'ul'], ['insertOrderedList', 'ol']]) {
    test(`native ${command} does not create empty paragraphs in synchronized HTML`, () => {
        const host = document.createElement('div');
        host.contentEditable = 'true';
        document.body.append(host);
        const live = createWetLiveEditor(host);
        live.innerHTML = '<p>Before</p><p>List <em>item</em></p><p>After</p>';
        const baseline = captureLiveEditBaseline(live);
        live.focus();
        const selection = live.getRootNode().getSelection();
        const range = document.createRange();
        range.setStart(live.children[1].firstChild, 2);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            document.execCommand(command, false, null);
            const nativeHTML = live.innerHTML;
            const anchorNode = selection.anchorNode;
            const anchorOffset = selection.anchorOffset;
            const clone = live.cloneNode(true);
            normalizeLiveEditClone(live, clone, baseline);
            const canonical = document.createElement('div');
            replaceWithSanitizedHTML(canonical, clone.innerHTML);

            equal(canonical.innerHTML, `<p>Before</p><${tag}><li>List <em>item</em></li></${tag}><p>After</p>`);
            equal(live.innerHTML, nativeHTML);
            equal(selection.anchorNode, anchorNode);
            equal(selection.anchorOffset, anchorOffset);
        } finally {
            selection.removeAllRanges();
            host.remove();
        }
    });
}

test('attribute entity highlighting preserves source text and does not create document elements', () => {
    const source = '<img alt="&quot;Revenue&quot; &amp; costs&nbsp; &#160; &#xA0; &lt;b&gt;total&lt;/b&gt;" title=\'L&apos;économie&#8239;\'><p>&amp; &#160;</p>';
    const code = document.createElement('code');
    code.innerHTML = highlightHTML(source);

    equal(code.textContent, source);
    equal(code.querySelector('img, b, p'), null);
    equal(code.querySelectorAll('.syntax-value').length, 2);
    equal(code.querySelectorAll('.syntax-value .syntax-entity').length, 0);
    equal(code.querySelector('.syntax-value').textContent, '"&quot;Revenue&quot; &amp; costs&nbsp; &#160; &#xA0; &lt;b&gt;total&lt;/b&gt;"');
    equal([...code.querySelectorAll('.syntax-entity')].map(node => node.textContent).join(' '), '&amp; &#160;');
});

test('code viewport keeps attribute entities in value highlighting after scrolling', () => {
    const host = document.createElement('div');
    host.style.cssText = 'position:relative;width:420px;height:110px';
    host.innerHTML = `
        <pre style="position:absolute;inset:0;margin:0;overflow:hidden"><code></code></pre>
        <textarea style="position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;padding:0;border:0;white-space:pre;font:14px/22px monospace"></textarea>`;
    document.body.append(host);
    const textarea = host.querySelector('textarea');
    const source = Array.from({ length: 100 }, (_, index) => `<p title="Line ${index} &amp; &#160;">Text &amp;</p>`).join('\n');
    textarea.value = source;
    const viewport = createCodeHighlightViewport({
        overlay: host.querySelector('pre'), textarea, highlight: highlightHTML, overscanLines: 1
    });
    try {
        viewport.update(source);
        textarea.scrollTop = 1100;
        viewport.render();
        const code = host.querySelector('code');
        const start = Number(code.dataset.highlightStart);
        const end = Number(code.dataset.highlightEnd);
        equal(start > 0, true);
        equal(end < source.length, true);
        equal(code.textContent, source.slice(start, end));
        const values = [...code.querySelectorAll('.syntax-value')];
        equal(values.length > 0, true);
        equal(values.every(value => /^"Line \d+ &amp; &#160;"$/.test(value.textContent)), true);
        equal(code.querySelectorAll('.syntax-value .syntax-entity').length, 0);
        equal(code.querySelectorAll('.syntax-entity').length, values.length);
        equal([...code.querySelectorAll('.syntax-entity')].every(node => node.textContent === '&amp;'), true);
    } finally {
        viewport.destroy();
        host.remove();
    }
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
    equal(searchInput.hasAttribute('title'), false);
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

test('generic table tag renaming preserves source formatting', () => {
    const cell = document.createElement('td');
    cell.className = 'fnt-nrml';
    cell.innerHTML = '<strong>Value</strong>';
    const header = renameTag(cell, 'th');
    equal(header.outerHTML, '<th class="fnt-nrml"><strong>Value</strong></th>');
});

test('cell conversion preserves attributes and child identity while removing nested whole-cell emphasis', () => {
    const cell = document.createElement('td');
    cell.setAttribute('id', 'amount');
    cell.setAttribute('headers', 'year');
    cell.setAttribute('rowspan', '2');
    cell.className = 'text-right';
    cell.innerHTML = ' <p><strong id="emphasis" lang="fr"><b><a href="#detail">Recettes</a></b></strong></p> ';
    const link = cell.querySelector('a');
    const header = convertTableCell(cell, 'th');
    equal(header.id, 'amount');
    equal(header.getAttribute('headers'), 'year');
    equal(header.getAttribute('rowspan'), '2');
    equal(header.className, 'text-right');
    equal(header.innerHTML, ' <p><span id="emphasis" lang="fr"><a href="#detail">Recettes</a></span></p> ');
    equal(header.querySelector('a'), link);
    equal(convertTableCell(header, 'th'), header);

    const normalizedHTML = header.innerHTML;
    const data = convertTableCell(header, 'td');
    equal(data.querySelectorAll('strong').length, 1);
    equal(data.firstElementChild.tagName, 'STRONG');
    equal(data.querySelector('a'), link);
    const roundTrip = convertTableCell(data, 'th');
    equal(roundTrip.innerHTML, normalizedHTML);
});

test('cell conversion preserves normal weight and does not mistake partial emphasis for whole-cell bold', () => {
    for (const content of ['<strong>First</strong> and last', 'First <strong>last</strong>']) {
        const cell = document.createElement('td');
        cell.innerHTML = content;
        const header = convertTableCell(cell, 'th');
        equal(header.classList.contains('fnt-nrml'), true);
        equal(header.innerHTML, content);
        const data = convertTableCell(header, 'td');
        equal(data.innerHTML, content);
    }
    const header = document.createElement('th');
    header.innerHTML = '<div class="mrgn-lft-md fnt-nrml">Normal</div>';
    const data = convertTableCell(header, 'td');
    equal(data.innerHTML, '<div class="mrgn-lft-md">Normal</div>');
    equal(data.querySelector('strong'), null);
});

test('table cleanup normalizes converted header bolding while preserving partial emphasis and data cells', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td class="fnt-nrml"><strong>Label</strong></td><td><b>Value</b></td></tr><tr><td><strong><a href="#detail">Revenue</a></strong></td><td><strong>10</strong></td></tr><tr><td>Total <strong>net</strong></td><td>20</td></tr></tbody></table>';
    cleanupTable(host.querySelector('table'));
    const headers = host.querySelectorAll('thead th');
    equal(headers[0].innerHTML, 'Label');
    equal(headers[0].classList.contains('fnt-nrml'), false);
    equal(headers[1].innerHTML, 'Value');
    const rows = host.querySelectorAll('tbody th');
    equal(rows[0].innerHTML, '<a href="#detail">Revenue</a>');
    equal(rows[0].classList.contains('fnt-nrml'), true);
    equal(rows[1].innerHTML, 'Total <strong>net</strong>');
    equal(host.querySelector('tbody td').innerHTML, '<strong>10</strong>');
});

test('table cleanup keeps single-paragraph labels as row headers', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><td><p>Revenue <em>net</em></p></td><td>10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    cleanupTable(table);
    applyTableScopes(table, { complex: false });
    equal(table.tBodies[0].rows[0].cells[0].outerHTML, '<th class="fnt-nrml" scope="row">Revenue <em>net</em></th>');
});

test('table cleanup preserves paragraph and list data in first body cells', () => {
    const contents = [
        '<p>First paragraph</p><p>Second <em>paragraph</em></p>',
        '<p>Description</p><ul><li>First</li><li>Second</li></ul>',
        '<ol><li>First</li><li>Second</li></ol>',
        '<dl><dt>Term</dt><dd>Definition</dd></dl>',
        '<div class="mrgn-lft-md"><p>Première partie</p><p>Deuxième partie</p></div>'
    ];
    for (const content of contents) {
        for (const tag of ['td', 'th']) {
            const host = document.createElement('div');
            host.innerHTML = `<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><${tag} id="description" class="fnt-nrml" scope="row">${content}</${tag}><td>10</td></tr></tbody></table>`;
            const table = host.querySelector('table');
            cleanupTable(table);
            const cell = table.tBodies[0].rows[0].cells[0];
            equal(cell.tagName, 'TD');
            equal(cell.innerHTML, content);
            equal(cell.id, 'description');
            equal(cell.hasAttribute('scope'), false);
            equal(cell.classList.contains('text-right'), false);
            equal(cell.nextElementSibling.classList.contains('text-right'), true);
            const cleaned = table.outerHTML;
            cleanupTable(table);
            equal(table.outerHTML, cleaned);
            for (const complex of [true, false, true]) {
                applyTableScopes(table, { complex });
                equal(cell.tagName, 'TD');
                equal(cell.innerHTML, content);
                equal(cell.hasAttribute('scope'), false);
                equal((cell.nextElementSibling.getAttribute('headers') || '').split(' ').includes(cell.id), false);
            }
        }
    }
});

test('scoping removes relationships to rich first cells converted from headers', () => {
    for (const complex of [true, false]) {
        const host = document.createElement('div');
        host.innerHTML = '<table><thead><tr><th id="label">Label</th><th id="value">Value</th></tr></thead><tbody><tr><th id="description" scope="row"><p>First</p><p>Second</p></th><td headers="value description" data-propel-scope-add="description">10</td></tr></tbody></table>';
        const table = host.querySelector('table');
        applyTableScopes(table, { complex });
        const [description, value] = table.tBodies[0].rows[0].cells;
        equal(description.tagName, 'TD');
        equal(description.hasAttribute('scope'), false);
        equal(description.querySelectorAll('p').length, 2);
        equal(value.hasAttribute('data-propel-scope-add'), false);
        equal(value.getAttribute('headers'), complex ? 'value' : null);
        equal(description.getAttribute('headers'), complex ? 'label' : null);
    }
});

test('rich first-cell data survives editor options, Header row, undo, redo, Apply, and reopen', () => {
    const content = '<p>Description</p><ul><li>First</li><li>Second</li></ul>';
    const fixture = createTableEditorScopingFixture(
        `<table id="t1"><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><td>${content}</td><td>10</td></tr></tbody></table>`, true
    );
    const { elements } = fixture;
    const firstCell = () => elements.tableEditorCanvas.querySelector('tbody tr').cells[0];
    const assertData = () => {
        equal(firstCell().tagName, 'TD');
        equal(firstCell().hasAttribute('scope'), false);
        equal(firstCell().querySelectorAll('p, ul, li').length, 4);
    };
    try {
        assertData();
        equal(firstCell().innerHTML, content);
        for (const option of ['tableEditorFinancial', 'tableEditorComplexScoping']) {
            elements[option].click();
            assertData();
            elements.tableEditorUndoBtn.click();
            assertData();
            elements.tableEditorRedoBtn.click();
            assertData();
        }
        firstCell().classList.add('selected');
        elements.tableEditorHeaderBtn.click();
        equal(elements.tableEditorCanvas.querySelector('thead tr:last-child').cells[0].tagName, 'TH');
        elements.tableEditorCanvas.querySelector('thead tr:last-child th').classList.add('selected');
        elements.tableEditorHeaderBtn.click();
        assertData();
        elements.tableEditorApplyBtn.click();
        equal(fixture.inputHTML.querySelector('tbody tr').cells[0].tagName, 'TD');
        fixture.controller.open(0, { previewCleanup: false });
        assertData();
        elements.tableEditorCancelBtn.click();
    } finally {
        fixture.remove();
    }
});

test('rich data cells retain spanning column and section associations without becoming group headers', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table id="details"><thead><tr><th id="period" colspan="2">Period</th><th id="notes" rowspan="2">Notes</th></tr><tr><th id="current">Current</th><th id="prior">Prior</th></tr></thead><tbody><tr><th id="section" colspan="3">Section</th></tr><tr><th id="description" colspan="2" scope="rowgroup" class="fnt-nrml"><p>First</p><p>Second</p></th><td headers="notes description" data-propel-scope-add="description current">Note</td></tr><tr><th id="item">Item</th><td>2</td><td>Other</td></tr></tbody></table>';
    const table = host.querySelector('table');
    cleanupTable(table);
    applyTableScopes(table);
    const [section, data, item] = table.tBodies[0].rows;
    equal(section.cells[0].getAttribute('scope'), 'rowgroup');
    equal(data.cells[0].tagName, 'TD');
    equal(data.cells[0].hasAttribute('scope'), false);
    equal(data.cells[0].getAttribute('headers'), 'period current prior section');
    equal(data.cells[1].getAttribute('headers'), 'notes section current');
    equal(data.cells[1].getAttribute('data-propel-scope-add'), 'current');
    equal(item.cells[1].getAttribute('headers'), 'period prior section item');
    applyTableScopes(table, { matchHeaderIdsToTable: true });
    for (const cell of table.querySelectorAll('[headers]')) {
        for (const id of cell.getAttribute('headers').split(' ')) {
            equal(Array.from(table.querySelectorAll('th[id]')).some((header) => header.id === id), true);
        }
    }
    const scoped = table.outerHTML;
    applyTableScopes(table, { matchHeaderIdsToTable: true });
    equal(table.outerHTML, scoped);
});

test('table cleanup retains bold spanning headers and the row-header bold option', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><td colspan="2"><strong>Section</strong></td></tr><tr><td><strong>Revenue</strong></td><td>10</td></tr></tbody></table>';
    cleanupTable(host.querySelector('table'), { removeBoldFromRowHeaders: false });
    const headers = host.querySelectorAll('tbody th');
    equal(headers[0].innerHTML, 'Section');
    equal(headers[0].classList.contains('fnt-nrml'), false);
    equal(headers[1].innerHTML, 'Revenue');
    equal(headers[1].classList.contains('fnt-nrml'), false);
});

test('scoping converts cells without changing their bold state or partial emphasis', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><td id="label" class="text-left"><strong>Label</strong></td><td>Value</td></tr></thead><tbody><tr><td>Normal <strong>detail</strong></td><td>10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: false });
    const headers = table.querySelectorAll('thead th');
    equal(headers[0].innerHTML, 'Label');
    equal(headers[0].hasAttribute('id'), false);
    equal(headers[0].className, 'text-left');
    equal(headers[1].classList.contains('fnt-nrml'), true);
    equal(table.querySelector('tbody th').classList.contains('fnt-nrml'), true);
    equal(table.querySelector('tbody th').innerHTML, 'Normal <strong>detail</strong>');
    const firstHTML = table.outerHTML;
    applyTableScopes(table, { complex: false });
    equal(table.outerHTML, firstHTML);
});

test('Header row conversion normalizes bolding through undo, redo, demotion, and Apply', () => {
    const fixture = createTableEditorScopingFixture(
        '<table id="t1"><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><th class="fnt-nrml"><div class="mrgn-lft-md fnt-nrml">Revenue</div></th><td><strong><a href="#detail">10</a></strong></td></tr></tbody></table>'
    );
    const { elements } = fixture;
    const selectBodyRow = () => elements.tableEditorCanvas.querySelector('tbody th').classList.add('selected');
    const assertHeader = () => {
        const row = elements.tableEditorCanvas.querySelector('thead tr:last-child');
        equal(row.classList.contains('bg-dark'), true);
        equal(row.classList.contains('text-white'), true);
        equal(row.querySelectorAll('th').length, 2);
        equal(row.querySelector('.fnt-nrml, strong'), null);
        equal(row.cells[0].firstElementChild.className, 'mrgn-lft-md');
        equal(row.cells[1].innerHTML, '<a href="#detail">10</a>');
    };
    try {
        selectBodyRow();
        elements.tableEditorHeaderBtn.click();
        assertHeader();
        elements.tableEditorUndoBtn.click();
        equal(elements.tableEditorCanvas.querySelector('tbody th').classList.contains('fnt-nrml'), true);
        elements.tableEditorRedoBtn.click();
        assertHeader();
        elements.tableEditorCanvas.querySelector('thead tr:last-child th').classList.add('selected');
        elements.tableEditorHeaderBtn.click();
        equal(elements.tableEditorCanvas.querySelector('tbody td').innerHTML, '<strong><a href="#detail">10</a></strong>');
        elements.tableEditorApplyBtn.click();
        equal(fixture.inputHTML.querySelector('tbody td').innerHTML, '<strong><a href="#detail">10</a></strong>');
    } finally {
        fixture.remove();
    }
});

test('table cleanup creates WET structure', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Name</td><td>Value</td></tr><tr><td>A</td><td>1</td></tr></tbody></table>';
    const result = cleanupTable(host.querySelector('table'));
    equal(result.querySelectorAll('thead').length, 1);
    equal(result.querySelector('thead tr').className, 'bg-dark text-white');
});

test('dark header styling can be disabled through cleanup and both scoping modes', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr class="custom bg-dark text-white"><th>Label</th><th colspan="2">Values</th></tr></thead><tbody><tr class="bg-dark text-white"><td>A</td><td>1</td><td>2</td></tr></tbody></table>';
    const table = host.querySelector('table');
    cleanupTable(table, { darkHeaders: false });
    for (const complex of [true, false]) {
        applyTableScopes(table, { complex, darkHeaders: false });
        equal(table.querySelector('thead tr').className, 'custom');
        equal(table.querySelector('thead th:last-child').getAttribute('scope'), 'colgroup');
        equal(table.querySelector('tbody tr').className, 'bg-dark text-white');
    }
    applyTableScopes(table);
    equal(table.querySelector('thead tr').className, 'custom bg-dark text-white');
});

test('dark header switch supports conversion, refresh, undo, redo, copy, Apply, and reopening', async () => {
    const fixture = createTableEditorScopingFixture(
        '<table id="t1"><thead><tr class="custom bg-dark text-white"><th>Label</th><th>Value</th></tr></thead><tbody><tr><th>A</th><td>1</td></tr><tr><th>B</th><td>2</td></tr></tbody></table>'
    );
    const { elements } = fixture;
    const assertDark = (enabled) => {
        for (const row of elements.tableEditorCanvas.querySelectorAll('thead tr')) {
            equal(row.classList.contains('bg-dark'), enabled);
            equal(row.classList.contains('text-white'), enabled);
        }
    };
    try {
        equal(elements.tableEditorDarkHeaders.checked, true);
        elements.tableEditorDarkHeaders.click();
        assertDark(false);
        equal(elements.tableEditorCanvas.querySelector('thead tr').className, 'custom');
        equal(fixture.inputHTML.querySelector('thead tr').classList.contains('bg-dark'), true);
        elements.tableEditorUndoBtn.click();
        equal(elements.tableEditorDarkHeaders.checked, true);
        assertDark(true);
        elements.tableEditorRedoBtn.click();
        equal(elements.tableEditorDarkHeaders.checked, false);
        assertDark(false);
        elements.tableEditorCanvas.querySelector('tbody th').classList.add('selected');
        elements.tableEditorHeaderBtn.click();
        equal(elements.tableEditorCanvas.querySelectorAll('thead tr').length, 2);
        equal(elements.tableEditorCanvas.querySelectorAll('thead tr:last-child th').length, 2);
        assertDark(false);
        elements.tableEditorFinancial.click();
        elements.tableEditorComplexScoping.click();
        assertDark(false);
        elements.tableEditorDarkHeaders.click();
        assertDark(true);
        elements.tableEditorDarkHeaders.click();
        elements.tableEditorCopyBtn.click();
        await Promise.resolve();
        equal(fixture.copiedHTML[0].includes('bg-dark'), false);
        equal(fixture.copiedHTML[0].includes('text-white'), false);
        elements.tableEditorApplyBtn.click();
        equal(fixture.inputHTML.querySelector('.bg-dark, .text-white'), null);
        fixture.controller.open(0);
        equal(elements.tableEditorDarkHeaders.checked, false);
        assertDark(false);
        elements.tableEditorDarkHeaders.click();
        elements.tableEditorCancelBtn.click();
        equal(fixture.inputHTML.querySelector('.bg-dark, .text-white'), null);
    } finally {
        fixture.remove();
    }
});

test('table cleanup removes empty classes after formatting and preserves populated classes', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table class="custom-table"><caption class=" ">Summary</caption><tbody class=""><tr><td>Name</td><td class="text-right">Value</td></tr><tr class="text-right"><td>A</td><td class="text-right"><span class="">1</span><span class="custom-value">2</span></td></tr></tbody><tfoot><tr><td colspan="2"><p class="">Note</p></td></tr></tfoot></table>';
    const result = cleanupTable(host.querySelector('table'), { financialTable: false });

    equal(Array.from(result.querySelectorAll('[class]')).every((element) => element.classList.length > 0), true);
    equal(result.querySelector('table').className, 'custom-table table table-bordered');
    equal(result.querySelector('.custom-value').textContent, '2');
    equal(result.querySelector('tbody th').className, 'fnt-nrml');
    equal(result.querySelector('tfoot p').textContent, 'Note');
});

test('table cleanup removes empty classes on the table and descendants without formatting', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table class=" \t\n"><tbody class=""><tr class=""><td class="keep"><span class="">Value</span></td></tr></tbody></table>';
    const result = cleanupTable(host.querySelector('table'), { format: false, trim: false });

    equal(result.hasAttribute('class'), false);
    equal(result.outerHTML, '<table><tbody><tr><td class="keep"><span>Value</span></td></tr></tbody></table>');
});

test('table cleanup scopes thead colspans as column groups and rowspan-only headers as columns', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><td colspan="2">Amounts</td><td rowspan="2">Notes</td></tr><tr><td>Current</td><td>Previous</td></tr></thead><tbody><tr><td>10</td><td>8</td><td>One</td></tr></tbody></table>';
    cleanupTable(host.querySelector('table'));
    const headers = host.querySelectorAll('thead th');

    equal(headers[0].getAttribute('scope'), 'colgroup');
    equal(headers[1].getAttribute('scope'), 'col');
    equal(headers[2].getAttribute('scope'), 'col');
    equal(headers[3].getAttribute('scope'), 'col');
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

test('table cleanup preview normalizes fnt-nrml and avoids arbitrary character wrapping without changing markup', async () => {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '../css/custom.css';
    const loaded = new Promise((resolve, reject) => {
        stylesheet.addEventListener('load', resolve, { once: true });
        stylesheet.addEventListener('error', reject, { once: true });
    });
    document.head.append(stylesheet);
    await loaded;

    const canvas = document.createElement('div');
    try {
        canvas.className = 'table-editor-canvas';
        canvas.innerHTML = '<table><tbody><tr><th class="fnt-nrml">Plain <strong>source emphasis</strong></th><td>UninterruptedValue123456789</td></tr></tbody></table>';
        document.body.append(canvas);
        const header = canvas.querySelector('th');
        const strong = canvas.querySelector('strong');
        const cellStyle = getComputedStyle(canvas.querySelector('td'));
        const originalHTML = canvas.innerHTML;

        equal(getComputedStyle(header).fontWeight, '400');
        equal(getComputedStyle(strong).fontWeight, '400');
        equal(cellStyle.overflowWrap, 'normal');
        equal(cellStyle.wordBreak, 'normal');
        equal(canvas.innerHTML, originalHTML);
    } finally {
        canvas.remove();
        stylesheet.remove();
    }
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
    equal(fixture.elements.tableEditorDarkHeaders.disabled, true);
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

test('table toolbar actions use the shared custom tooltip', () => {
    const fixture = createTableEditorScopingFixture();
    const scopingButton = fixture.elements.tableEditorScopingModeBtn;
    const tooltip = fixture.elements.optionTooltip;

    scopingButton.focus();
    equal(tooltip.hidden, false);
    equal(tooltip.textContent, 'Enter scoping mode');

    scopingButton.click();
    equal(scopingButton.hasAttribute('title'), false);
    equal(scopingButton.dataset.tooltip, 'Exit scoping mode');
    equal(tooltip.textContent, 'Exit scoping mode');

    scopingButton.blur();
    equal(tooltip.hidden, true);
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

test('turning off complex scoping removes header IDs through undo, redo, and Apply', () => {
    const fixture = createTableEditorScopingFixture();
    const { elements, inputHTML } = fixture;
    const preview = () => elements.tableEditorCanvas.querySelector('table');
    const complexMarkup = preview().outerHTML;
    const originalMarkup = inputHTML.innerHTML;

    try {
        elements.tableEditorComplexScoping.click();
        equal(preview().querySelector('th[id], [headers]'), null);
        equal(preview().querySelector('thead th').getAttribute('scope'), 'col');
        equal(preview().querySelector('tbody th').getAttribute('scope'), 'row');
        equal(preview().id, 't1');
        equal(inputHTML.innerHTML, originalMarkup);
        const simpleMarkup = preview().outerHTML;

        elements.tableEditorUndoBtn.click();
        equal(elements.tableEditorComplexScoping.checked, true);
        equal(preview().outerHTML, complexMarkup);
        elements.tableEditorRedoBtn.click();
        equal(elements.tableEditorComplexScoping.checked, false);
        equal(preview().outerHTML, simpleMarkup);

        elements.tableEditorApplyBtn.click();
        equal(inputHTML.querySelector('th[id], [headers]'), null);
        equal(inputHTML.querySelector('thead th').getAttribute('scope'), 'col');
        equal(inputHTML.querySelector('tbody th').getAttribute('scope'), 'row');
        equal(inputHTML.querySelector('table').id, 't1');
    } finally {
        fixture.remove();
    }
});

for (const genericId of ['t1', 'tbl1']) {
    test(`table ID suggestion replaces ${genericId} and updates scoped header IDs when accepted`, () => {
        const fixture = createTableEditorScopingFixture(
            `<p>Table 2b.1</p><table id="${genericId}"><thead><tr><th id="old-label">Label</th><th id="old-value">Value</th></tr></thead><tbody><tr><th id="old-row">One</th><td>1</td></tr></tbody></table>`
        );

        equal(fixture.elements.tableEditorNumber.value, 'Table 2b.1');
        equal(fixture.elements.tableEditorNumber.hasAttribute('data-caption-suggestion'), true);
        equal(fixture.elements.tableEditorId.value, genericId);
        equal(fixture.elements.tableEditorId.hasAttribute('data-caption-suggestion'), false);
        fixture.elements.tableEditorNumberSuggestion.click();

        equal(fixture.elements.tableEditorId.value, 't2b-1');
        equal(fixture.elements.tableEditorId.hasAttribute('data-caption-suggestion'), true);
        equal(fixture.elements.tableEditorCanvas.querySelector('table').id, genericId);
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
}

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

test('table cleanup copies the pending table with a responsive wrapper without applying it', async () => {
    const fixture = createTableEditorScopingFixture('<table><tbody><tr><td>Original</td></tr></tbody></table>');
    const editorCell = fixture.elements.tableEditorCanvas.querySelector('td');
    editorCell.textContent = 'Pending edit';
    editorCell.classList.add('selected');

    fixture.elements.tableEditorCopyBtn.click();
    await Promise.resolve();

    equal(fixture.copiedHTML.length, 1);
    equal(fixture.copiedHTML[0], 'formatted:<div class="table-responsive"><table><tbody><tr><td>Pending edit</td></tr></tbody></table></div>');
    equal(fixture.processingLogs.length, 1);
    equal(fixture.processingLogs[0], 'Copied table HTML to clipboard.:success');
    equal(fixture.activityToasts.length, 0);
    equal(fixture.inputHTML.querySelector('td').textContent, 'Original');
    fixture.remove();
});

test('table editor removes empty classes when copying and applying pending edits', async () => {
    const fixture = createTableEditorScopingFixture('<table class=""><tbody class=" "><tr class=""><td class="keep"><span class="">Value</span></td><td>2</td></tr></tbody></table>');
    const canvas = fixture.elements.tableEditorCanvas;
    canvas.querySelector('td:last-child').classList.add('selected');
    const pendingHTML = canvas.innerHTML;

    fixture.elements.tableEditorCopyBtn.click();
    await Promise.resolve();

    equal(fixture.copiedHTML[0], 'formatted:<div class="table-responsive"><table><tbody><tr><td class="keep"><span>Value</span></td><td>2</td></tr></tbody></table></div>');
    equal(canvas.innerHTML, pendingHTML);
    equal(fixture.inputHTML.querySelector('table').hasAttribute('class'), true);

    fixture.elements.tableEditorApplyBtn.click();
    equal(Array.from(fixture.inputHTML.querySelectorAll('[class]')).every((element) => element.classList.length > 0), true);
    equal(fixture.inputHTML.querySelector('span').parentElement.className, 'keep fnt-nrml');
    fixture.remove();
});

test('Live table hover action copies the table with its responsive wrapper', async () => {
    const fixture = createTableEditorScopingFixture('<table id="summary"><tbody><tr><td>Total</td></tr></tbody></table>');
    const liveTable = fixture.liveEditor.querySelector('table');

    fixture.controller.handleLiveTableHover({ target: liveTable });
    fixture.elements.liveTableCopyPopover.click();
    await Promise.resolve();

    equal(fixture.copiedHTML.length, 1);
    equal(fixture.copiedHTML[0], 'formatted:<div class="table-responsive"><table id="summary"><tbody><tr><td>Total</td></tr></tbody></table></div>');
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
                <button id="tableEditorCopyBtn">Copy HTML</button>
                <input id="tableEditorNumber"><button id="tableEditorNumberSuggestion"></button>
                <input id="tableEditorCaption"><button id="tableEditorCaptionSuggestion"></button>
                <input id="tableEditorUnit"><button id="tableEditorUnitSuggestion"></button>
                <input id="tableEditorId"><button id="tableEditorIdSuggestion"></button>
                <input id="tableEditorComplexScoping" type="checkbox" checked>
                <input id="tableEditorFinancial" type="checkbox">
                <input id="tableEditorDarkHeaders" type="checkbox" checked>
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
                    <button id="tableEditorScopingModeBtn" data-tooltip="Enter scoping mode" aria-label="Enter scoping mode" aria-pressed="false">Scope</button>
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
        </section>
        <div id="optionTooltip" role="tooltip" hidden></div>
        <button id="liveTableEditPopover">Edit</button>
        <button id="liveTableComponentPopover">Component</button>
        <button id="liveTableCopyPopover">Copy HTML</button>`;
    document.body.append(host);
    const ids = [
        'tableEditorDialog', 'tableEditorFullscreenBtn', 'tableEditorCloseBtn', 'tableEditorCancelBtn',
        'tableEditorApplyBtn', 'tableEditorApplyNextBtn', 'tableEditorComponentBtn', 'tableEditorCopyBtn', 'tableEditorFirstBtn',
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
        'tableEditorFinancial', 'tableEditorDarkHeaders', 'tableEditorFrench', 'optionTooltip',
        'liveTableEditPopover', 'liveTableComponentPopover', 'liveTableCopyPopover'
    ];
    const elements = Object.fromEntries(ids.map((id) => [id, host.querySelector(`#${id}`)]));
    elements.tableEditorSnapGuides = [];
    elements.tableTooltipButtons = host.querySelectorAll('[data-tooltip]');
    const inputHTML = document.createElement('div');
    inputHTML.innerHTML = tableMarkup;
    const liveEditor = document.createElement('div');
    liveEditor.innerHTML = tableMarkup;
    const liveEditorHost = document.createElement('div');
    liveEditorHost.appendChild(liveEditor);
    const copiedHTML = [];
    const processingLogs = [];
    const activityToasts = [];
    const controller = createTableEditorController({
        elements,
        inputHTML,
        liveEditor,
        liveEditorHost,
        uiPreferences: { get: () => ({}), set: () => {} },
        cleanupTable,
        isCleanedTable,
        defaultTableCleanupOptions,
        convertTableCell,
        copyToClipboard: async (html) => copiedHTML.push(html),
        formatHTML: (element) => `formatted:${element.outerHTML}`,
        getEditorSelection: () => null,
        getClosestElement: (target, root, selector) => {
            const closest = target?.closest?.(selector);
            return closest && root.contains(closest) ? closest : null;
        },
        preserveParagraphsOnEnter: () => {},
        getFocusableElements: (root) => Array.from(root.querySelectorAll('button:not(:disabled), input:not(:disabled)')),
        addProcessingLog: (message, type) => processingLogs.push(`${message}:${type}`),
        showActivityToast: (message, type) => activityToasts.push(`${message}:${type}`),
        syncLiveToInputHTML: () => {},
        scrollLiveElementIntoView: () => {},
        commitTableChanges: () => {},
        isLiveEditorSelectingText: () => false,
        isEnglish: () => true
    });
    controller.createListeners();
    controller.open(0, { previewCleanup });
    return {
        controller,
        elements,
        inputHTML,
        liveEditor,
        copiedHTML,
        processingLogs,
        activityToasts,
        remove: () => { controller.close(); host.remove(); }
    };
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

test('live table hover shows edit, component conversion, and copy pills', () => {
    const liveEditorHost = document.createElement('div');
    const liveEditor = document.createElement('div');
    const popover = document.createElement('button');
    const componentPopover = document.createElement('button');
    const copyPopover = document.createElement('button');
    liveEditor.innerHTML = '<table><tbody><tr><td>Value</td></tr></tbody></table>';
    liveEditorHost.append(liveEditor, popover, componentPopover, copyPopover);
    document.body.append(liveEditorHost);

    const controller = createTableEditorController({
        elements: {
            liveTableEditPopover: popover,
            liveTableComponentPopover: componentPopover,
            liveTableCopyPopover: copyPopover
        },
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
    equal(copyPopover.classList.contains('visible'), true);
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
    const copyButton = shadow.getElementById('tableCopyPopover');
    const editButtonLabel = editButton.querySelector('span:last-child');
    const copyButtonLabel = copyButton.querySelector('span:last-child');

    host.addEventListener('focus', (event) => {
        focusWetLiveEditorFromHost(event, host, editor);
    });

    editButton.classList.add('visible');
    editButton.focus();
    equal(shadow.activeElement, editButton);
    equal(isWetLiveEditorOverlayTarget(editButtonLabel, [editButton, convertButton, copyButton]), true);
    equal(isWetLiveEditorOverlayTarget(copyButtonLabel, [editButton, convertButton, copyButton]), true);

    outsideButton.focus();
    host.focus();
    equal(shadow.activeElement, editor);

    host.remove();
    outsideButton.remove();
});

test('Live review controls are kept outside editable document content', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const editor = createWetLiveEditor(host);
    const reviewFlagLayer = editor.getRootNode().getElementById('reviewFlagLayer');
    editor.innerHTML = '<h2>Flagged heading</h2>';
    reviewFlagLayer.innerHTML = '<span class="review-flag-button" role="button">⚑</span>';

    equal(Boolean(reviewFlagLayer), true);
    equal(editor.contains(reviewFlagLayer), false);
    equal(editor.querySelector('.review-flag-button'), null);
    equal(editor.querySelector('h2').textContent, 'Flagged heading');
    host.remove();
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

test('table cleanup scopes a spanning section row without changing row appearance', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><td>Label</td><td>Value</td></tr><tr><td colspan="2">Group</td></tr><tr><td>Item</td><td>1</td></tr></tbody></table>';
    cleanupTable(host.querySelector('table'));
    const groupRow = host.querySelector('tbody tr');
    const memberRow = host.querySelectorAll('tbody tr')[1];

    equal(groupRow.classList.contains('active'), false);
    equal(groupRow.querySelector('th').getAttribute('scope'), 'rowgroup');
    equal(memberRow.querySelector('[class*="mrgn-lft"]'), null);
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

test('NBSP correction changes visible text without changing attributes', () => {
    const source = '<a href="/Table 2" aria-label="Open Table 2" title="Table 2">Table 2</a>';
    equal(
        fixNbspHTML(source, false),
        '<a href="/Table 2" aria-label="Open Table 2" title="Table 2">Table&nbsp;2</a>'
    );
});

test('NBSP correction works across inline markup boundaries', () => {
    equal(
        fixNbspHTML('<p>Table <strong>2</strong> and 10 <em>%</em></p>', false),
        '<p>Table&nbsp;<strong>2</strong> and 10&nbsp;<em>%</em></p>'
    );
});

test('NBSP correction preserves preformatted content and consecutive existing spaces', () => {
    equal(
        fixNbspHTML('<pre>Table 2</pre><p>&nbsp;&nbsp;Table 2</p><code>Figure 3</code><span data-propel-preserve-spacing>Annex 4</span>', false),
        '<pre>Table 2</pre><p>&nbsp;&nbsp;Table&nbsp;2</p><code>Figure 3</code><span data-propel-preserve-spacing="">Annex 4</span>'
    );
});

test('NBSP correction is idempotent and reports stable rule IDs', () => {
    const first = transformNbspHTML('<p>Table <strong>2</strong></p>', false);
    const second = transformNbspHTML(first.html, false);

    equal(first.html, '<p>Table&nbsp;<strong>2</strong></p>');
    equal(first.changes.length, 1);
    equal(first.changes[0].ruleId, 'english-numbered-label');
    equal(first.changes[0].after, 'Table&nbsp;2');
    equal(second.html, first.html);
    equal(second.changes.length, 0);
});

test('NBSP correction respects French punctuation policy', () => {
    equal(
        fixNbspHTML('<p>Tableau 2 : Attention ! Vraiment ?</p>', true),
        '<p>Tableau&nbsp;2&nbsp;: Attention ! Vraiment ?</p>'
    );
});

test('table model selects a rectangular range', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>';
    const cells = host.querySelectorAll('td');
    equal(getCellsInRange(host.querySelector('table'), cells[0], cells[3]).length, 4);
});

test('table editor Bold button restores header weight and wraps data cells through undo, redo, and Apply', () => {
    const fixture = createTableEditorScopingFixture(
        '<table id="t1"><tbody><tr><th scope="row" class="fnt-nrml text-left">Heading</th><td>Value</td></tr></tbody></table>'
    );
    const { elements } = fixture;
    const assertBoldRow = (root) => {
        const header = root.querySelector('tbody th');
        equal(header.classList.contains('fnt-nrml'), false);
        equal(header.classList.contains('text-left'), true);
        equal(header.innerHTML, 'Heading');
        equal(root.querySelector('tbody td').innerHTML, '<strong>Value</strong>');
    };

    try {
        elements.tableEditorCanvas.querySelectorAll('th, td').forEach((cell) => cell.classList.add('selected'));
        elements.tableEditorBoldBtn.click();
        assertBoldRow(elements.tableEditorCanvas);

        elements.tableEditorUndoBtn.click();
        equal(elements.tableEditorCanvas.querySelector('th').classList.contains('fnt-nrml'), true);
        equal(elements.tableEditorCanvas.querySelector('td').innerHTML, 'Value');

        elements.tableEditorRedoBtn.click();
        assertBoldRow(elements.tableEditorCanvas);

        elements.tableEditorApplyBtn.click();
        assertBoldRow(fixture.inputHTML);
    } finally {
        fixture.remove();
    }
});

for (const normalWeight of [false, true]) {
    test(`table editor indentation preserves ${normalWeight ? 'normal' : 'bold'} header weight at every level`, () => {
        const fixture = createTableEditorScopingFixture(
            `<table id="t1"><tbody><tr><th class="text-left${normalWeight ? ' fnt-nrml' : ''}">Heading <em>detail</em></th><td><strong>Value</strong></td></tr></tbody></table>`
        );
        const { elements } = fixture;
        const header = elements.tableEditorCanvas.querySelector('th');
        const data = elements.tableEditorCanvas.querySelector('td');
        const content = header.innerHTML;
        const assertWeight = () => {
            equal(header.classList.contains('fnt-nrml') || Boolean(header.querySelector('.fnt-nrml')), normalWeight);
            equal(header.querySelector('strong'), null);
            equal(data.innerHTML, '<strong>Value</strong>');
        };

        try {
            header.classList.add('selected');
            data.classList.add('selected');
            for (const level of [2, 3, 4, 5, 5]) {
                elements.tableEditorIndentBtn.click();
                equal(header.firstElementChild.classList.contains(`ml-${level}`), true);
                equal(header.firstElementChild.innerHTML, content);
                assertWeight();
            }
            for (const level of [4, 3, 2]) {
                elements.tableEditorOutdentBtn.click();
                equal(header.firstElementChild.classList.contains(`ml-${level}`), true);
                assertWeight();
            }
            elements.tableEditorOutdentBtn.click();
            equal(header.innerHTML, content);
            assertWeight();
        } finally {
            fixture.remove();
        }
    });
}

test('table editor outdent preserves normal weight set on an indent wrapper through undo, redo, and Apply', () => {
    const fixture = createTableEditorScopingFixture(
        '<table id="t1"><tbody><tr><th class="text-left"><div class="text-left fnt-nrml mrgn-lft-md">Heading <em>detail</em></div></th><td>Value</td></tr></tbody></table>'
    );
    const { elements } = fixture;
    const assertNormalHeader = (root) => {
        const header = root.querySelector('tbody th');
        equal(header.classList.contains('fnt-nrml'), true);
        equal(header.classList.contains('text-left'), true);
        equal(header.innerHTML, 'Heading <em>detail</em>');
    };

    try {
        elements.tableEditorCanvas.querySelector('th').classList.add('selected');
        elements.tableEditorOutdentBtn.click();
        assertNormalHeader(elements.tableEditorCanvas);

        elements.tableEditorUndoBtn.click();
        equal(elements.tableEditorCanvas.querySelector('th > div').classList.contains('fnt-nrml'), true);
        elements.tableEditorRedoBtn.click();
        assertNormalHeader(elements.tableEditorCanvas);

        elements.tableEditorApplyBtn.click();
        assertNormalHeader(fixture.inputHTML);
    } finally {
        fixture.remove();
    }
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

test('table editor bold toggles fnt-nrml on indented row-header content', () => {
    const header = document.createElement('th');
    header.className = 'fnt-nrml';
    header.innerHTML = '<div class="text-left fnt-nrml mrgn-lft-md">Indented heading</div>';
    const indent = header.firstElementChild;

    toggleCellBold(header);
    equal(header.classList.contains('fnt-nrml'), false);
    equal(header.hasAttribute('class'), false);
    equal(indent.classList.contains('fnt-nrml'), false);
    equal(header.querySelector('strong'), null);

    toggleCellBold(header);
    equal(header.classList.contains('fnt-nrml'), false);
    equal(indent.classList.contains('fnt-nrml'), true);
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
    applyTableScopes(table, { complex: true });
    const headers = table.querySelectorAll('th');
    const value = table.querySelector('td');

    equal(value.getAttribute('headers'), `${headers[1].id} ${headers[2].id} ${headers[3].id}`);
});

test('complex scoping groups subsequent rows under a spanning section until the next section', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><th colspan="2">Assets</th></tr><tr><th>Cash</th><td>10</td></tr><tr><th>Investments</th><td>20</td></tr><tr><th colspan="2">Liabilities</th></tr><tr><th>Debt</th><td>30</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true });
    const bodyHeaders = table.querySelectorAll('tbody th');
    const values = table.querySelectorAll('tbody td');

    equal(values[0].getAttribute('headers').includes(bodyHeaders[0].id), true);
    equal(values[1].getAttribute('headers').includes(bodyHeaders[0].id), true);
    equal(values[2].getAttribute('headers').includes(bodyHeaders[0].id), false);
    equal(values[2].getAttribute('headers').includes(bodyHeaders[3].id), true);
    equal(bodyHeaders[0].getAttribute('scope'), 'rowgroup');
    equal(bodyHeaders[3].getAttribute('scope'), 'rowgroup');
    equal(table.querySelector('[class*="mrgn-lft"]'), null);
    equal(table.id, 't1');
});

test('complex scoping follows md, lg, and xl indentation levels', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr class="active"><th colspan="2">Total</th></tr><tr><th><div class="mrgn-lft-md">Group</div></th><td>1</td></tr><tr><th><div class="mrgn-lft-lg">Subgroup</div></th><td>2</td></tr><tr><th><div class="mrgn-lft-xl">Item</div></th><td>3</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true });
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
    applyTableScopes(table, { complex: false });

    equal(table.querySelector('td').hasAttribute('headers'), false);
    equal(table.querySelector('tbody th').getAttribute('scope'), 'row');
});

test('simple scoping clears header IDs and overrides before complex scoping is enabled again', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table id="expenses"><thead><tr><th id="label">Label</th><th id="value">Value</th></tr></thead><tbody><tr><th id="cash">Cash</th><td id="amount" headers="value cash">10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    preserveExistingHeaderRelationships(table);
    applyTableScopes(table, { complex: true });
    equal(table.querySelector('td').getAttribute('headers'), 'value cash');

    applyTableScopes(table, { complex: false });

    equal(table.querySelector('th[id], [headers], [data-propel-scope-add], [data-propel-scope-remove]'), null);
    equal(table.id, 'expenses');
    equal(table.querySelector('td').id, 'amount');
    equal(table.querySelector('thead th').getAttribute('scope'), 'col');
    equal(table.querySelector('tbody th').getAttribute('scope'), 'row');

    applyTableScopes(table, { complex: true });
    equal(table.querySelector('td').getAttribute('headers'), 'expenses-h2 expenses-h3');
});

test('table scoping recalculates thead colspans without treating rowspan as a row group', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th colspan="2" scope="col">Amounts</th><th rowspan="2" scope="rowgroup">Notes</th></tr><tr><th>Current</th><th>Previous</th></tr></thead><tbody><tr><th>Revenue</th><td>10</td><td>One</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: false });
    const headers = table.querySelectorAll('thead th');

    equal(headers[0].getAttribute('scope'), 'colgroup');
    equal(headers[1].getAttribute('scope'), 'col');
});

test('complex scoping uses the next available t-prefixed table identifier', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div id="t1"></div><table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr><th>Cash</th><td>10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true, idRoot: host });

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
        matchHeaderIdsToTable: true
    });
    const headers = table.querySelectorAll('th');

    equal(Array.from(headers, (header) => header.id).join(' '), 'expenses-h1 expenses-h2 expenses-h3');
    equal(value.getAttribute('headers'), 'expenses-h2 expenses-h3');
    equal(value.getAttribute('data-propel-scope-add'), 'expenses-h3');

    applyTableScopes(table, {
        complex: true,
        idRoot: host,
        matchHeaderIdsToTable: true
    });
    equal(Array.from(headers, (header) => header.id).join(' '), 'expenses-h1 expenses-h2 expenses-h3');
});

test('painted scoping relationships override automatic associations', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody><tr class="active"><th colspan="2">Parent</th></tr><tr><th>Child</th><td>10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true, idRoot: host });
    const parent = table.querySelector('tbody th');
    const child = table.querySelector('tbody td');

    equal(hasHeaderRelationship(parent, child), true);
    setManualHeaderRelationship(parent, child, false);
    applyTableScopes(table, { complex: true, idRoot: host });
    equal(hasHeaderRelationship(parent, child), false);
    setManualHeaderRelationship(parent, child, true);
    applyTableScopes(table, { complex: true, idRoot: host });
    equal(hasHeaderRelationship(parent, child), true);
});

test('existing explicit scoping is preserved when a table is reopened', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table id="t1"><thead><tr><th id="label">Label</th><th id="value">Value</th></tr></thead><tbody><tr class="active"><th id="parent" colspan="2">Parent</th></tr><tr><th id="child">Child</th><td headers="value child">10</td></tr></tbody></table>';
    const table = host.querySelector('table');
    const child = table.querySelector('td');
    preserveExistingHeaderRelationships(table);
    applyTableScopes(table, { complex: true, idRoot: host });

    equal(child.getAttribute('headers'), 'value child');
});


test('complex scoping follows all four ml indentation levels', () => {
    const host = document.createElement('div');
    host.innerHTML = '<table><tbody><tr><th>Root</th><td>0</td></tr>' + [2, 3, 4, 5].map(level => `<tr><th><div class="ml-${level}">Level ${level}</div></th><td>${level}</td></tr>`).join('') + '</tbody></table>';
    const table = host.querySelector('table');
    applyTableScopes(table, { complex: true });
    const headers = Array.from(table.querySelectorAll('th'));
    const associations = table.querySelectorAll('td')[4].getAttribute('headers').split(' ');
    headers.forEach(header => equal(associations.includes(header.id), true));
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
