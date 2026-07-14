/**
 * Moves the contents of body rows into a table's full-width footer cell.
 * A single source row is stored directly in the footer cell. Multiple notes are
 * separated into paragraphs, and each source row is removed from the body.
 */
export function moveRowsToTableFooter(table, rows) {
    const sourceRows = Array.from(rows || []).filter((row) => {
        return row && row.closest('table') === table && !row.closest('tfoot');
    });

    if (!table || sourceRows.length === 0) {
        return { movedRows: 0, footer: table ? table.querySelector('tfoot') : null };
    }

    const footer = ensureFooter(table);
    const footerCell = ensureFooterCell(table, footer);
    removeEmptyFooterParagraphs(footerCell);

    sourceRows.forEach((row) => {
        const hasExistingContent = hasMeaningfulContent(footerCell);
        if (hasExistingContent) {
            wrapDirectFooterContent(footerCell);
        }
        const destination = hasExistingContent ? document.createElement('p') : footerCell;
        const cells = Array.from(row.querySelectorAll(':scope > th, :scope > td'));

        cells.forEach((cell, index) => {
            if (index > 0 && destination.lastChild) {
                destination.appendChild(document.createTextNode(' '));
            }
            moveCellContents(cell, destination);
        });

        if (destination !== footerCell) {
            footerCell.appendChild(destination);
        }
        row.remove();
    });

    return { movedRows: sourceRows.length, footer };
}

function ensureFooter(table) {
    let footer = table.querySelector('tfoot');
    if (!footer) {
        footer = document.createElement('tfoot');
        table.appendChild(footer);
    }
    return footer;
}

function ensureFooterCell(table, footer) {
    let row = footer.querySelector('tr');
    if (!row) {
        row = document.createElement('tr');
        row.classList.add('small');
        footer.appendChild(row);
    }

    let cell = row.querySelector('th, td');
    if (!cell) {
        cell = document.createElement('td');
        row.appendChild(cell);
    }

    cell.setAttribute('colspan', String(getTableWidth(table)));
    return cell;
}

function getTableWidth(table) {
    return Math.max(1, ...Array.from(table.rows).map((row) => {
        return Array.from(row.cells).reduce((width, cell) => width + Number(cell.colSpan || 1), 0);
    }));
}

function removeEmptyFooterParagraphs(cell) {
    Array.from(cell.querySelectorAll(':scope > p')).forEach((paragraph) => {
        if (!paragraph.textContent.replace(/\u00a0/g, '').trim() && !paragraph.querySelector('img, a, br')) {
            paragraph.remove();
        }
    });
}

function hasMeaningfulContent(cell) {
    return Array.from(cell.childNodes).some((node) => {
        return node.nodeType !== Node.TEXT_NODE || node.textContent.replace(/\u00a0/g, '').trim();
    });
}

function wrapDirectFooterContent(cell) {
    const directNodes = Array.from(cell.childNodes).filter((node) => {
        return node.nodeType !== Node.ELEMENT_NODE || node.tagName.toLowerCase() !== 'p';
    });

    if (directNodes.length === 0) {
        return;
    }

    const paragraph = document.createElement('p');
    directNodes.forEach((node) => paragraph.appendChild(node));
    cell.insertBefore(paragraph, cell.firstChild);
}

function moveCellContents(cell, paragraph) {
    Array.from(cell.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'p') {
            while (node.firstChild) {
                paragraph.appendChild(node.firstChild);
            }
            node.remove();
            return;
        }
        paragraph.appendChild(node);
    });
}
