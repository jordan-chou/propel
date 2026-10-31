import { renameTag } from '../util.js';

const INDENT_SELECTOR = '.mrgn-lft-md, .mrgn-lft-lg, .mrgn-lft-xl';
const CONTENT_CONTAINERS = /^(?:DIV|P|SPAN|A|EM|I|U|S|SMALL|ABBR|STRONG|B)$/;

/**
 * Converts a table cell while representing whole-cell bold with header classes
 * or data-cell emphasis. Callers can request bold/normal weight explicitly;
 * structural operations preserve it by default. Partial emphasis stays intact.
 */
export function convertTableCell(cell, targetTagName, { bold = 'preserve' } = {}) {
    const targetTag = String(targetTagName).toLowerCase();
    if (!cell || !/^(TH|TD)$/.test(cell.tagName) || !['th', 'td'].includes(targetTag)) {
        return cell;
    }
    if (cell.tagName.toLowerCase() === targetTag && bold === 'preserve') {
        return cell;
    }

    const indent = Array.from(cell.children).find((child) => child.matches(INDENT_SELECTOR));
    const wrappers = getWholeCellBoldWrappers(cell);
    const normal = cell.classList.contains('fnt-nrml') || Boolean(indent?.classList.contains('fnt-nrml'));
    const shouldBeBold = bold === 'preserve'
        ? !normal && (cell.tagName === 'TH' || wrappers.length > 0)
        : bold;

    const converted = renameTag(cell, targetTag);
    for (const wrapper of wrappers) {
        // Keep authored IDs, language, classes, and other attributes addressable.
        if (wrapper.attributes.length) {
            renameTag(wrapper, 'span');
        } else {
            wrapper.replaceWith(...wrapper.childNodes);
        }
    }

    for (const element of [converted, indent].filter(Boolean)) {
        element.classList.remove('fnt-nrml');
        if (!element.classList.length) element.removeAttribute('class');
    }

    if (targetTag === 'th') {
        if (!shouldBeBold) (indent || converted).classList.add('fnt-nrml');
    } else if (shouldBeBold) {
        const strong = converted.ownerDocument.createElement('strong');
        strong.append(...converted.childNodes);
        converted.append(strong);
    }
    return converted;
}

/** Finds bold wrappers enclosing the entire cell, including layout containers. */
function getWholeCellBoldWrappers(cell) {
    const wrappers = [];
    let container = cell;
    while (container) {
        const content = Array.from(container.childNodes).filter((node) => (
            node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim())
        ));
        if (content.length !== 1 || content[0].nodeType !== 1) break;
        const child = content[0];
        if (!CONTENT_CONTAINERS.test(child.tagName)) break;
        if (/^(STRONG|B)$/.test(child.tagName)) wrappers.push(child);
        container = child;
    }
    return wrappers;
}
