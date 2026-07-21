import { addGenericID } from '../commands/anchors-aweigh.js';

const INDENT_CLASSES = ['mrgn-lft-md', 'mrgn-lft-lg', 'mrgn-lft-xl'];
export const MANUAL_SCOPE_ATTRIBUTES = ['data-propel-scope-add', 'data-propel-scope-remove'];

/** Applies either explicit complex-table associations or simple scope attributes. */
export function applyTableScopes(table, options = {}) {
    if (!table) return;

    const renameTag = options.renameTag || ((cell) => cell);
    const complex = options.complex !== false;

    const rows = Array.from(table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr'));

    rows.forEach((row) => {
        const inHead = Boolean(row.closest('thead'));
        if (inHead) {
            row.classList.add('bg-dark', 'text-white');
            row.classList.remove('active');
            Array.from(row.querySelectorAll(':scope > th, :scope > td')).forEach((cell) => {
                renameTag(cell, 'th').setAttribute('scope', 'col');
            });
            return;
        }

        const firstCell = row.querySelector(':scope > th, :scope > td');
        if (!firstCell) return;
        const rowHeader = renameTag(firstCell, 'th');
        rowHeader.setAttribute('scope', rowHeader.hasAttribute('colspan') || row.classList.contains('active')
            ? 'colgroup'
            : rowHeader.hasAttribute('rowspan') ? 'rowgroup' : 'row');
    });

    if (!complex) {
        table.querySelectorAll('[headers]').forEach((cell) => cell.removeAttribute('headers'));
        return;
    }

    applyExplicitAssociations(table, buildSpanningGrid(table), options.idRoot || table.ownerDocument);
}

function applyExplicitAssociations(table, grid, idRoot) {
    addGenericID(idRoot, table, 't');
    const entries = grid.entries;
    const headerEntries = entries.filter(({ cell }) => cell.tagName.toLowerCase() === 'th');
    headerEntries.forEach(({ cell }, index) => ensureHeaderId(table, cell, index + 1));

    let activeParent = null;
    let hierarchy = [];

    grid.rows.forEach((row, rowIndex) => {
        if (row.closest('thead')) return;

        const rowEntries = entries.filter((entry) => entry.row === rowIndex && entry.originRow === rowIndex);
        const rowHeader = rowEntries.find(({ cell }) => cell.tagName.toLowerCase() === 'th') || null;
        const isActive = row.classList.contains('active');
        const indentLevel = rowHeader ? getIndentLevel(rowHeader.cell) : 0;

        if (isActive && rowHeader) {
            activeParent = rowHeader.cell;
            hierarchy = [rowHeader.cell];
        }

        const ancestors = isActive ? [] : hierarchy.slice(0, indentLevel);

        rowEntries.forEach((entry) => {
            const associations = [];
            columnHeadersFor(entry, headerEntries).forEach((header) => addAssociation(associations, header));
            if (activeParent !== entry.cell) addAssociation(associations, activeParent);
            ancestors.forEach((header) => {
                if (header !== entry.cell && header !== activeParent) addAssociation(associations, header);
            });
            if (rowHeader && rowHeader.cell !== entry.cell) addAssociation(associations, rowHeader.cell);

            setHeaders(entry.cell, associations);
        });

        if (rowHeader) {
            hierarchy[indentLevel] = rowHeader.cell;
            hierarchy.length = indentLevel + 1;
        }
    });
}

function columnHeadersFor(entry, headerEntries) {
    return headerEntries
        .filter((header) => header.cell.closest('thead')
            && rangesOverlap(entry.column, entry.columnSpan, header.column, header.columnSpan))
        .sort((first, second) => first.row - second.row)
        .map(({ cell }) => cell);
}

function addAssociation(associations, header) {
    if (header && !associations.includes(header)) associations.push(header);
}

function setHeaders(cell, associations) {
    const removed = getIdList(cell, MANUAL_SCOPE_ATTRIBUTES[1]);
    const added = getIdList(cell, MANUAL_SCOPE_ATTRIBUTES[0]);
    const ids = associations.map((header) => header.id).filter((id) => id && !removed.includes(id));
    added.forEach((id) => {
        if (!ids.includes(id)) ids.push(id);
    });
    if (ids.length) cell.setAttribute('headers', ids.join(' '));
    else cell.removeAttribute('headers');
}

/** Adds or removes a manually painted parent relationship. */
export function setManualHeaderRelationship(parent, child, enabled) {
    if (!parent || !child || parent === child || !parent.id) return false;
    const addAttribute = MANUAL_SCOPE_ATTRIBUTES[0];
    const removeAttribute = MANUAL_SCOPE_ATTRIBUTES[1];
    const additions = getIdList(child, addAttribute).filter((id) => id !== parent.id);
    const removals = getIdList(child, removeAttribute).filter((id) => id !== parent.id);

    if (enabled) additions.push(parent.id);
    else removals.push(parent.id);
    setIdList(child, addAttribute, additions);
    setIdList(child, removeAttribute, removals);

    const headers = getIdList(child, 'headers').filter((id) => id !== parent.id);
    if (enabled) headers.push(parent.id);
    setIdList(child, 'headers', headers);
    return true;
}

export function hasHeaderRelationship(parent, child) {
    return Boolean(parent && parent.id && getIdList(child, 'headers').includes(parent.id));
}

/** Removes relationships to header IDs that no longer exist in the table. */
export function pruneTableHeaderRelationships(table) {
    if (!table) return;
    const validIds = new Set(Array.from(table.querySelectorAll('th[id]'), (header) => header.id));

    table.querySelectorAll('th, td').forEach((cell) => {
        ['headers', ...MANUAL_SCOPE_ATTRIBUTES].forEach((attribute) => {
            setIdList(cell, attribute, getIdList(cell, attribute).filter((id) => validIds.has(id)));
        });
    });
}

/** Captures existing explicit associations as exact editor overrides before recalculation. */
export function preserveExistingHeaderRelationships(table) {
    if (!table || !table.querySelector('[headers]')) return;
    const headerIds = Array.from(table.querySelectorAll('th[id]')).map((header) => header.id);
    if (!headerIds.length) return;

    table.querySelectorAll('th, td').forEach((cell) => {
        const existing = getIdList(cell, 'headers');
        setIdList(cell, MANUAL_SCOPE_ATTRIBUTES[0], existing);
        setIdList(cell, MANUAL_SCOPE_ATTRIBUTES[1], headerIds.filter((id) => !existing.includes(id)));
    });
}

function getIdList(cell, attribute) {
    return (cell.getAttribute(attribute) || '').trim().split(/\s+/).filter(Boolean);
}

function setIdList(cell, attribute, ids) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length) cell.setAttribute(attribute, uniqueIds.join(' '));
    else cell.removeAttribute(attribute);
}

function ensureHeaderId(table, cell, ordinal) {
    if (cell.id) return cell.id;
    const base = `${table.id || 'table'}-h${ordinal}`.replace(/[^A-Za-z0-9_-]/g, '-');
    let candidate = base;
    let suffix = 2;
    while (table.ownerDocument.getElementById(candidate)) candidate = `${base}-${suffix++}`;
    cell.id = candidate;
    return candidate;
}

function getIndentLevel(cell) {
    const wrapper = Array.from(cell.children).find((child) => INDENT_CLASSES.some((name) => child.classList.contains(name)));
    if (!wrapper) return 0;
    return INDENT_CLASSES.findIndex((name) => wrapper.classList.contains(name)) + 1;
}

function rangesOverlap(startA, spanA, startB, spanB) {
    return startA < startB + spanB && startB < startA + spanA;
}

function buildSpanningGrid(table) {
    const occupied = [];
    const entries = [];
    const rows = Array.from(table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr'));

    rows.forEach((row, rowIndex) => {
        occupied[rowIndex] ||= [];
        let column = 0;
        Array.from(row.querySelectorAll(':scope > th, :scope > td')).forEach((cell) => {
            while (occupied[rowIndex][column]) column++;
            const rowSpan = Math.max(1, Number(cell.getAttribute('rowspan') || 1));
            const columnSpan = Math.max(1, Number(cell.getAttribute('colspan') || 1));
            entries.push({ cell, row: rowIndex, originRow: rowIndex, column, rowSpan, columnSpan });
            for (let y = rowIndex; y < rowIndex + rowSpan; y++) {
                occupied[y] ||= [];
                for (let x = column; x < column + columnSpan; x++) occupied[y][x] = cell;
            }
            column += columnSpan;
        });
    });

    return { rows, entries };
}
