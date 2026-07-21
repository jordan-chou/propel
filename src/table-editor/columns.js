import { pruneTableHeaderRelationships } from './scoping.js';

/** Deletes the visual table columns occupied by selected cells. */
export function deleteSelectedTableColumns(table, selectedCells) {
    const layout = buildVisualColumnLayout(table);
    const selected = new Set(Array.from(selectedCells || []));
    const columns = new Set();

    layout.entries.filter(({ cell }) => selected.has(cell)).forEach(({ column, columnSpan }) => {
        for (let index = column; index < column + columnSpan; index++) {
            columns.add(index);
        }
    });

    if (columns.size === 0) {
        return { changed: false, deletedColumns: 0, blocked: false };
    }
    if (columns.size >= layout.width) {
        return { changed: false, deletedColumns: 0, blocked: true };
    }

    layout.entries.forEach(({ cell, column, columnSpan }) => {
        let overlap = 0;
        for (let index = column; index < column + columnSpan; index++) {
            if (columns.has(index)) overlap++;
        }

        if (overlap === 0) return;
        if (overlap === columnSpan) {
            cell.remove();
            return;
        }

        const remainingSpan = columnSpan - overlap;
        if (remainingSpan === 1) cell.removeAttribute('colspan');
        else cell.setAttribute('colspan', String(remainingSpan));
    });

    layout.rows.forEach((row) => {
        if (!row.querySelector(':scope > th, :scope > td')) row.remove();
    });
    pruneTableHeaderRelationships(table);

    return { changed: true, deletedColumns: columns.size, blocked: false };
}

/** Builds visual cell positions without changing the editor's existing selection grid. */
function buildVisualColumnLayout(table) {
    if (!table) return { entries: [], rows: [], width: 0 };

    const rows = Array.from(table.querySelectorAll('tr')).filter((row) => row.closest('table') === table);
    const entries = [];
    let occupancy = [];
    let previousSection = null;
    let width = 0;

    rows.forEach((row) => {
        const section = row.parentElement;
        if (section !== previousSection) {
            occupancy = [];
            previousSection = section;
        }

        let column = 0;
        Array.from(row.querySelectorAll(':scope > th, :scope > td')).forEach((cell) => {
            while (occupancy[column] > 0) column++;

            const columnSpan = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
            const rowSpan = Math.max(1, Number(cell.getAttribute('rowspan')) || 1);
            entries.push({ cell, column, columnSpan });

            for (let index = column; index < column + columnSpan; index++) {
                occupancy[index] = Math.max(occupancy[index] || 0, rowSpan);
            }
            column += columnSpan;
        });

        width = Math.max(width, column, occupancy.length);
        occupancy = occupancy.map((remaining) => Math.max(0, remaining - 1));
    });

    return { entries, rows, width };
}
