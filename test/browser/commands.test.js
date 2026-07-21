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
        <button data-instructions>View instructions</button>
        <div data-backdrop></div>
        <section data-dialog hidden>
            <button data-close>Close</button>
            <button data-cheatsheet-tab="instructions" aria-selected="true">Instructions</button>
            <button data-cheatsheet-tab="tips" aria-selected="false">Tips</button>
            <section data-cheatsheet-panel="instructions"></section>
            <section data-cheatsheet-panel="tips" hidden></section>
        </section>`;
    document.body.append(host);
    const dialog = host.querySelector('[data-dialog]');
    const toggleButton = host.querySelector('[data-toggle]');
    const controller = createDrawerControllers({
        activity: {},
        shortcuts: {
            dialog,
            toggleButton,
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
    host.remove();
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

test('live table hover shows the edit table pill', () => {
    const liveEditorHost = document.createElement('div');
    const liveEditor = document.createElement('div');
    const popover = document.createElement('button');
    liveEditor.innerHTML = '<table><tbody><tr><td>Value</td></tr></tbody></table>';
    liveEditorHost.append(liveEditor, popover);
    document.body.append(liveEditorHost);

    const controller = createTableEditorController({
        elements: { liveTableEditPopover: popover },
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
    liveEditorHost.remove();
});

test('live table overlay controls keep focus and remain valid hover targets', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const editor = createWetLiveEditor(host);
    const shadow = editor.getRootNode();
    const editButton = shadow.getElementById('tableEditPopover');
    const convertButton = shadow.getElementById('tableComponentPopover');
    const editButtonLabel = editButton.querySelector('span:last-child');

    host.addEventListener('focus', (event) => {
        focusWetLiveEditorFromHost(event, host, editor);
    });

    editButton.focus();
    equal(shadow.activeElement, editButton);
    equal(isWetLiveEditorOverlayTarget(editButtonLabel, [editButton, convertButton]), true);

    host.focus();
    equal(shadow.activeElement, editor);

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
