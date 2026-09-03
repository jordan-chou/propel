export const defaultTableCleanupOptions = {
    format: true,
    trim: true,
    financialTable: true,
    removeBoldFromRowHeaders: true,
    addScope: true,
    addTfoot: false,
    frenchNumbers: false,
    removeAttributes: [
        'width',
        'valign',
        'align',
        'border',
        'cellspacing',
        'cellpadding',
        'nowrap'
    ],
    unwrapTags: ['p']
};

/**
 * Cleans every table in a DOM root using Canada.ca/WET-style table markup.
 *
 * @param {HTMLElement} root DOM root containing one or more tables.
 * @param {object} options Cleanup options.
 * @returns {{tableCount: number, changedCount: number}} Cleanup summary.
 */
export function cleanupTables(root, options = {}) {
    if (!root) {
        return { tableCount: 0, changedCount: 0 };
    }

    const mergedOptions = mergeOptions(options);
    const tables = Array.from(root.querySelectorAll('table'));
    let changedCount = 0;

    tables.forEach((table) => {
        const cleaned = cleanupTable(table, mergedOptions);
        if (cleaned) {
            changedCount++;
        }
    });

    return {
        tableCount: tables.length,
        changedCount
    };
}

/**
 * Cleans one table and wraps it in .table-responsive when needed.
 *
 * @param {HTMLTableElement} inputTable Table to clean.
 * @param {object} options Cleanup options.
 * @returns {HTMLElement|null} The table wrapper or table that was cleaned.
 */
export function cleanupTable(inputTable, options = {}) {
    if (!inputTable) {
        return null;
    }

    const mergedOptions = mergeOptions(options);
    const table = normalizeTableStructure(inputTable);
    const tableContainer = mergedOptions.format ? ensureResponsiveWrapper(table) : table;

    cleanTableElements(table, mergedOptions);

    if (mergedOptions.format) {
        formatWetTable(table, mergedOptions);
    }

    if (mergedOptions.trim) {
        trimTableCells(table);
    }

    if (mergedOptions.frenchNumbers) {
        formatFrenchNumbers(table);
    }

    return tableContainer;
}

/**
 * Applies Canada.ca/WET-style table classes, sections, and header semantics.
 *
 * @param {HTMLTableElement} table Table to format.
 * @param {object} options Cleanup options.
 * @returns {HTMLTableElement} Formatted table.
 */
export function formatWetTable(table, options = {}) {
    const mergedOptions = mergeOptions(options);
    const tbody = ensureTbody(table);

    if (!tbody) {
        return table;
    }

    table.classList.add('table', 'table-bordered');

    const thead = ensureThead(table, tbody);
    formatThead(thead, mergedOptions);
    formatTbody(tbody, mergedOptions);

    if (mergedOptions.addTfoot && !table.querySelector('tfoot')) {
        addTableFoot(table, true, mergedOptions.financialTable);
    }

    return table;
}

export function addTableFoot(table, includePlaceholder = true, financialTable = false) {
    if (!table) {
        return null;
    }

    const tfoot = document.createElement('tfoot');
    const tr = document.createElement('tr');
    const td = document.createElement('td');

    tr.classList.add('small');
    td.setAttribute('colspan', String(getTableWidth(table)));

    if (includePlaceholder) {
        const placeholder = financialTable ? td : document.createElement('p');
        placeholder.textContent = 'NOTES, SOURCES and FOOTNOTES GO HERE';
        if (placeholder !== td) {
            td.appendChild(placeholder);
        }
    }

    tr.appendChild(td);
    tfoot.appendChild(tr);
    table.appendChild(tfoot);

    return tfoot;
}

export function renameTag(sourceElement, targetTagName) {
    if (!sourceElement || sourceElement.tagName.toLowerCase() === targetTagName.toLowerCase()) {
        return sourceElement;
    }

    const targetElement = document.createElement(targetTagName);

    Array.from(sourceElement.attributes).forEach((attribute) => {
        targetElement.setAttribute(attribute.name, attribute.value);
    });

    while (sourceElement.firstChild) {
        targetElement.appendChild(sourceElement.firstChild);
    }

    sourceElement.replaceWith(targetElement);
    return targetElement;
}

function mergeOptions(options) {
    return {
        ...defaultTableCleanupOptions,
        ...options,
        removeAttributes: options.removeAttributes || defaultTableCleanupOptions.removeAttributes,
        unwrapTags: options.unwrapTags || defaultTableCleanupOptions.unwrapTags
    };
}

function normalizeTableStructure(table) {
    if (table.parentElement && table.parentElement.matches('div.table-responsive')) {
        return table;
    }

    return table;
}

function ensureResponsiveWrapper(table) {
    if (table.parentElement && table.parentElement.matches('div.table-responsive')) {
        return table.parentElement;
    }

    const wrapper = document.createElement('div');
    wrapper.classList.add('table-responsive');
    table.replaceWith(wrapper);
    wrapper.appendChild(table);

    return wrapper;
}

function cleanTableElements(table, options) {
    const elements = [table, ...Array.from(table.querySelectorAll('*'))];

    elements.forEach((element) => {
        options.removeAttributes.forEach((attribute) => {
            element.removeAttribute(attribute);
        });
    });

    options.unwrapTags.forEach((tagName) => {
        Array.from(table.querySelectorAll(tagName))
            .filter((element) => tagName.toLowerCase() !== 'p' || !element.closest('tfoot'))
            .forEach(unwrapElement);
    });
}

function unwrapElement(element) {
    const parent = element.parentNode;

    if (!parent) {
        return;
    }

    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }

    parent.removeChild(element);
}

function ensureTbody(table) {
    let tbody = table.querySelector('tbody');

    if (tbody) {
        return tbody;
    }

    const rows = Array.from(table.children).filter((child) => child.tagName && child.tagName.toLowerCase() === 'tr');

    if (!rows.length) {
        return null;
    }

    tbody = document.createElement('tbody');
    rows[0].before(tbody);
    rows.forEach((row) => tbody.appendChild(row));

    return tbody;
}

function ensureThead(table, tbody) {
    let thead = table.querySelector('thead');

    if (thead) {
        return thead;
    }

    thead = document.createElement('thead');
    table.insertBefore(thead, tbody);

    const firstRow = tbody.querySelector('tr');
    if (firstRow) {
        thead.appendChild(firstRow);
    }

    return thead;
}

function formatThead(thead, options) {
    Array.from(thead.querySelectorAll('tr')).forEach((row) => {
        row.classList.add('bg-dark', 'text-white');
        row.classList.remove('active');

        Array.from(row.querySelectorAll('th, td')).forEach((cell, index) => {
            const headerCell = renameTag(cell, 'th');

            if (options.addScope) {
                headerCell.setAttribute('scope', getColumnHeaderScope(headerCell));
            }

            if (index > 0 && options.financialTable) {
                headerCell.classList.add('text-right');
            } else if (index > 0) {
                headerCell.classList.remove('text-right');
            }
        });
    });
}

function getColumnHeaderScope(headerCell) {
    return Number(headerCell.getAttribute('colspan')) > 1 ? 'colgroup' : 'col';
}

function formatTbody(tbody, options) {
    Array.from(tbody.querySelectorAll('tr')).forEach((row) => {
        if (!options.financialTable) {
            row.classList.remove('text-right');
        }

        const firstCell = row.querySelector('th, td');

        if (!firstCell) {
            return;
        }

        const rowHeader = renameTag(firstCell, 'th');

        if (options.addScope) {
            rowHeader.setAttribute('scope', 'row');
        }

        if (rowHeader.hasAttribute('colspan')) {
            if (options.addScope) {
                rowHeader.setAttribute('scope', isSpanningSectionRow(row, rowHeader) ? 'rowgroup' : 'colgroup');
            }
        } else if (rowHeader.hasAttribute('rowspan') && options.addScope) {
            rowHeader.setAttribute('scope', 'rowgroup');
        } else if (options.removeBoldFromRowHeaders) {
            rowHeader.classList.add('fnt-nrml');
        }

        if (options.financialTable) {
            Array.from(row.querySelectorAll('td')).forEach((cell) => {
                cell.classList.add('text-right');
            });
        } else {
            Array.from(row.querySelectorAll('td')).forEach((cell) => {
                cell.classList.remove('text-right');
            });
        }
    });
}

function isSpanningSectionRow(row, rowHeader) {
    return Number(rowHeader.getAttribute('colspan')) > 1
        && row.querySelectorAll(':scope > th, :scope > td').length === 1;
}

function trimTableCells(table) {
    Array.from(table.querySelectorAll('th, td')).forEach((cell) => {
        if (!cell.textContent.trim()) {
            return;
        }

        cell.innerHTML = trimNbsp(cell.innerHTML.replace(/\s{2,}/g, ' ').trim());
    });
}

function trimNbsp(value) {
    let output = value.trim();

    if (output === '&nbsp;') {
        return output;
    }

    while (output.startsWith('&nbsp;')) {
        output = output.substring('&nbsp;'.length);
    }

    while (output.endsWith('&nbsp;')) {
        output = output.substring(0, output.length - '&nbsp;'.length);
    }

    return output;
}

function formatFrenchNumbers(table) {
    Array.from(table.querySelectorAll('td')).forEach((cell) => {
        if (!cell.textContent.trim()) {
            return;
        }

        while (/\d \d\d\d/.test(cell.innerHTML)) {
            cell.innerHTML = cell.innerHTML.replace(/(\d) (\d\d\d)/g, '$1&nbsp;$2');
        }

        cell.innerHTML = cell.innerHTML.replace(/(\d)\.(\d)/g, '$1,$2');
    });
}

function getTableWidth(table) {
    return Array.from(table.querySelectorAll('tr')).reduce((width, row) => {
        const rowWidth = Array.from(row.querySelectorAll('th, td')).reduce((total, cell) => {
            return total + Number(cell.getAttribute('colspan') || 1);
        }, 0);

        return Math.max(width, rowWidth);
    }, 1);
}
