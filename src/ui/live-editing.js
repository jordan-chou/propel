const ROOT_TEXT_INPUT_TYPES = new Set([
    'insertCompositionText',
    'insertFromDrop',
    'insertFromPaste',
    'insertLineBreak',
    'insertReplacementText',
    'insertText'
]);

const ROOT_PHRASING_SELECTOR = [
    'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del',
    'dfn', 'em', 'i', 'ins', 'kbd', 'mark', 'q', 'ruby', 's', 'samp',
    'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr'
].join(', ');

/**
 * Tells the browser to create paragraphs for new blocks without changing the
 * heading, list item, table cell, or other block that currently owns the caret.
 */
export function preserveParagraphsOnEnter(event) {
    if (!event || event.key !== 'Enter' || event.shiftKey ||
        event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }

    const commandDocument = event.currentTarget?.ownerDocument || globalThis.document;
    commandDocument?.execCommand?.('defaultParagraphSeparator', false, 'p');
}

/**
 * Ensures prose typed directly at the Live editor root has a paragraph
 * container. Content already inside a semantic or component container is left
 * to the browser so native contenteditable behavior is preserved.
 */
export function ensureRootTextBlockForInput(event, root, selection) {
    if (!event || event.defaultPrevented || !ROOT_TEXT_INPUT_TYPES.has(event.inputType) ||
        !root || !selection || selection.rangeCount === 0 || !selection.isCollapsed) {
        return null;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) && range.startContainer !== root) {
        return null;
    }

    if (range.startContainer === root) {
        return insertParagraphAtRootOffset(root, range.startOffset, selection);
    }

    const topLevelNode = getTopLevelNode(range.startContainer, root);
    if (!isRootPhrasingNode(topLevelNode)) {
        return null;
    }

    const marker = root.ownerDocument.createElement('span');
    marker.setAttribute('data-live-caret-marker', '');
    range.insertNode(marker);
    const paragraph = wrapRootPhrasingRun(getTopLevelNode(marker, root) || topLevelNode, root);
    const restoredRange = root.ownerDocument.createRange();
    restoredRange.setStartBefore(marker);
    restoredRange.collapse(true);
    marker.remove();
    selection.removeAllRanges();
    selection.addRange(restoredRange);
    return paragraph;
}

function insertParagraphAtRootOffset(root, offset, selection) {
    const paragraph = root.ownerDocument.createElement('p');
    paragraph.appendChild(root.ownerDocument.createElement('br'));
    root.insertBefore(paragraph, root.childNodes[offset] || null);

    const range = root.ownerDocument.createRange();
    range.setStart(paragraph, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return paragraph;
}

function getTopLevelNode(node, root) {
    let current = node;
    while (current && current.parentNode !== root) {
        current = current.parentNode;
    }
    return current?.parentNode === root ? current : null;
}

function wrapRootPhrasingRun(node, root) {
    let first = node;
    let last = node;
    while (first.previousSibling && isRootPhrasingNode(first.previousSibling)) {
        first = first.previousSibling;
    }
    while (last.nextSibling && isRootPhrasingNode(last.nextSibling)) {
        last = last.nextSibling;
    }

    const paragraph = root.ownerDocument.createElement('p');
    root.insertBefore(paragraph, first);
    let current = first;
    while (current) {
        const next = current.nextSibling;
        paragraph.appendChild(current);
        if (current === last) {
            break;
        }
        current = next;
    }
    return paragraph;
}

function isRootPhrasingNode(node) {
    if (!node) {
        return false;
    }
    if (node.nodeType === 3) {
        return true;
    }
    return node.nodeType === 1 && node.matches(ROOT_PHRASING_SELECTOR);
}
