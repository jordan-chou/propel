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
import { renameTag as renameElementTag } from '../../src/util.js';
import { createOnboardingController } from '../../src/ui/onboarding.js';
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
import { runStandardCleanup } from '../../src/document/cleanup.js';
import { createCodeHighlightViewport, getLineStarts } from '../../src/ui/code-highlight-viewport.js';
import {
    buildBugReportUrl,
    buildFeedbackEmailUrl,
    buildFeatureRequestUrl,
    configureFeedbackEmailLink,
    configureGitHubIssueLinks
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
        <pre style="position:absolute;inset:0;margin:0;overflow:hidden"><code></code></pre>
        <textarea style="position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;padding:0;border:0;resize:none;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/22px monospace"></textarea>`;
    document.body.append(host);
    const overlay = host.querySelector('pre');
    const textarea = host.querySelector('textarea');
    const source = Array.from({ length: 200 }, (_, index) => `<p>Line ${index}</p>`).join('\n');
    textarea.value = source;
    const viewport = createCodeHighlightViewport({
        overlay,
        textarea,
        highlight: value => value.replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
        overscanLines: 2
    });
    viewport.update(source);
    textarea.scrollTop = 1100;
    viewport.render();
    const code = overlay.querySelector('code');
    const start = Number(code.dataset.highlightStart);
    const end = Number(code.dataset.highlightEnd);

    equal(start > 0, true);
    equal(end < source.length, true);
    equal(code.textContent, source.slice(start, end));
    equal(code.textContent.includes('Line 0</p>'), false);
    equal(code.textContent.length < source.length / 4, true);
    viewport.destroy();
    host.remove();
});

test('virtualized code highlighting stays aligned after wrapped lines', () => {
    const host = document.createElement('div');
    host.style.cssText = 'position: relative; width: 260px; height: 88px;';
    host.innerHTML = `
        <pre style="position:absolute;inset:0;margin:0;padding:0;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/22px monospace"><code style="position:absolute;display:block;white-space:inherit;overflow-wrap:inherit;font:inherit"></code></pre>
        <textarea style="position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;padding:8px;border:0;resize:none;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/22px monospace"></textarea>`;
    document.body.append(host);
    const overlay = host.querySelector('pre');
    const textarea = host.querySelector('textarea');
    const longLine = 'A'.repeat(120);
    const source = Array.from({ length: 80 }, (_, index) => index % 5 === 0 ? longLine : `Line ${index}`).join('\n');
    textarea.value = source;
    const viewport = createCodeHighlightViewport({
        overlay,
        textarea,
        highlight: value => value,
        overscanLines: 1
    });
    viewport.update(source);
    textarea.scrollTop = 700;
    viewport.render();

    const code = overlay.querySelector('code');
    const start = Number(code.dataset.highlightStart);
    const reference = document.createElement('div');
    reference.style.cssText = `position:fixed;visibility:hidden;left:-10000px;top:0;box-sizing:border-box;width:${textarea.clientWidth}px;height:auto;margin:0;padding:8px;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/22px monospace`;
    const referenceText = document.createTextNode(`${source}\u200b`);
    reference.append(referenceText);
    document.body.append(reference);
    const range = document.createRange();
    range.setStart(referenceText, start);
    range.setEnd(referenceText, start + 1);
    const expectedTop = range.getBoundingClientRect().top - reference.getBoundingClientRect().top - textarea.scrollTop;
    const actualTop = code.getBoundingClientRect().top - overlay.getBoundingClientRect().top;

    equal(Math.abs(actualTop - expectedTop) < 1, true);
    equal(code.textContent.length < source.length / 3, true);
    reference.remove();
    viewport.destroy();
    host.remove();
});

test('code highlight line indexes include empty and trailing lines', () => {
    equal(getLineStarts('first\n\nthird\n').join(','), '0,6,7,13');
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

test('feedback email link is populated with a reviewable mail draft', () => {
    const link = document.createElement('a');
    const environment = {
        protocol: 'https:',
        hostname: 'propel.example',
        userAgent: navigator.userAgent,
        browserLanguage: 'en-CA'
    };
    configureFeedbackEmailLink(link, environment);

    equal(link.href, buildFeedbackEmailUrl(environment));
    const url = new URL(link.href);
    equal(url.pathname, 'web@fin.gc.ca');
    equal(url.searchParams.get('cc'), 'jordan.chou@fin.gc.ca');
    equal(url.searchParams.get('body').includes('Distribution: Web deployment'), true);
    equal(url.searchParams.get('body').includes('Browser language: en-CA'), true);
    equal(url.searchParams.get('body').includes('propel.example'), false);
    equal(url.searchParams.get('body').includes('do not include document content'), true);
});

test('GitHub feedback links prefill privacy-safe browser details', () => {
    const bugReportLink = document.createElement('a');
    const featureRequestLink = document.createElement('a');
    const environment = {
        appVersion: '1.2.3',
        protocol: 'https:',
        hostname: 'internal.example',
        userAgent: navigator.userAgent,
        browserLanguage: 'en-CA'
    };

    configureGitHubIssueLinks({ bugReportLink, featureRequestLink }, environment);

    equal(bugReportLink.href, buildBugReportUrl(environment));
    equal(featureRequestLink.href, buildFeatureRequestUrl(environment));
    const bugUrl = new URL(bugReportLink.href);
    equal(bugUrl.searchParams.get('version'), '1.2.3');
    equal(bugUrl.searchParams.get('browser-language'), 'en-CA');
    equal(bugReportLink.href.includes('internal.example'), false);
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
    equal(fixture.elements.tableEditorApplyBtn.disabled, true);
    equal(fixture.elements.tableEditorScopingModeBtn.disabled, false);
    equal(fixture.elements.tableEditorScopingModeBtn.getAttribute('aria-label'), 'Exit scoping mode');

    fixture.elements.tableEditorScopingModeExitBtn.click();

    equal(fixture.elements.tableEditorDialog.classList.contains('table-editor-scoping-locked'), false);
    equal(fixture.elements.tableEditorScopingModeBanner.hidden, true);
    equal(fixture.elements.tableEditorHeaderBtn.disabled, false);
    equal(fixture.elements.tableEditorNumber.disabled, false);
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

function createTableEditorScopingFixture() {
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
        'tableEditorCaptionSuggestion', 'tableEditorUnitSuggestion', 'tableEditorComplexScoping',
        'tableEditorFinancial', 'tableEditorFrench'
    ];
    const elements = Object.fromEntries(ids.map((id) => [id, host.querySelector(`#${id}`)]));
    elements.tableEditorSnapGuides = [];
    elements.optionHelpButtons = [];
    const inputHTML = document.createElement('div');
    inputHTML.innerHTML = '<table id="t1"><thead><tr><th id="parent">Label</th><th id="column-a">A</th><th id="column-b">B</th></tr></thead><tbody><tr><th id="row-a">One</th><td>1</td><td>2</td></tr><tr><th id="row-b">Two</th><td>3</td><td>4</td></tr></tbody></table>';
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
    controller.open(0, { previewCleanup: false });
    return { controller, elements, remove: () => { controller.close(); host.remove(); } };
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
    try { item.run(); lines.push(`PASS ${item.name}`); }
    catch (error) { failures += 1; lines.push(`FAIL ${item.name}\n  ${error.message}`); }
}
output.textContent = `${lines.join('\n')}\n\n${tests.length - failures}/${tests.length} passed`;
document.title = failures ? 'FAIL: Propel browser tests' : 'PASS: Propel browser tests';
