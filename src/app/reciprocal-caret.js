import { getElementByPath, getElementPath } from './editor-source-map.js';

/** Maps a Live editor DOM caret to the corresponding HTML source index. */
export function getSourceIndexForLiveCaret({ html, root, node, offset, entries, decodeEntity }) {
    const element = getCaretElement(node, root);
    const path = getElementPath(element, root);
    const entry = path && entries.find(candidate => candidate.pathKey === path.join('.'));
    if (!entry) return null;

    const range = root.ownerDocument.createRange();
    range.setStart(element, 0);
    try {
        range.setEnd(node, offset);
    } catch {
        return entry.openEndIndex;
    }

    return getSourceIndexForTextOffset(
        html,
        entry.openEndIndex,
        entry.closeStartIndex,
        range.toString().length,
        decodeEntity
    );
}

/** Maps an HTML source index to a DOM caret in the corresponding Live element. */
export function getLiveCaretForSourceIndex({ html, root, sourceIndex, entry, decodeEntity }) {
    const element = entry ? getElementByPath(root, entry.path) : null;
    if (!element) return null;

    const textOffset = getTextOffsetForSourceIndex(
        html,
        entry.openEndIndex,
        entry.closeStartIndex,
        sourceIndex,
        decodeEntity
    );
    const showText = root.ownerDocument.defaultView.NodeFilter.SHOW_TEXT;
    const walker = root.ownerDocument.createTreeWalker(element, showText);
    let remaining = textOffset;
    let textNode = walker.nextNode();
    while (textNode) {
        if (remaining <= textNode.data.length) return { node: textNode, offset: remaining };
        remaining -= textNode.data.length;
        textNode = walker.nextNode();
    }

    return { node: element, offset: element.childNodes.length };
}

/** Returns the source boundary matching a rendered UTF-16 text offset. */
export function getSourceIndexForTextOffset(html, start, end, textOffset, decodeEntity = value => value) {
    let renderedLength = 0;
    let index = start;
    while (index < end) {
        if (html[index] === '<') {
            const tagEnd = findTagEnd(html, index, end);
            index = tagEnd === -1 ? end : tagEnd + 1;
            continue;
        }

        const token = getTextToken(html, index, end, decodeEntity);
        if (renderedLength + token.value.length >= textOffset) {
            return textOffset === renderedLength ? index : token.end;
        }
        renderedLength += token.value.length;
        index = token.end;
    }
    return end;
}

/** Returns the rendered UTF-16 text offset at a source boundary. */
export function getTextOffsetForSourceIndex(html, start, end, sourceIndex, decodeEntity = value => value) {
    const target = Math.max(start, Math.min(sourceIndex, end));
    let renderedLength = 0;
    let index = start;
    while (index < target) {
        if (html[index] === '<') {
            const tagEnd = findTagEnd(html, index, end);
            index = tagEnd === -1 ? end : tagEnd + 1;
            continue;
        }

        const token = getTextToken(html, index, end, decodeEntity);
        if (target < token.end) return renderedLength;
        renderedLength += token.value.length;
        index = token.end;
    }
    return renderedLength;
}

function getCaretElement(node, root) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    if (!element || element === root || !root.contains(element)) return null;
    return element;
}

function getTextToken(html, index, end, decodeEntity) {
    if (html[index] === '&') {
        const entityEnd = html.indexOf(';', index + 1);
        if (entityEnd !== -1 && entityEnd < end) {
            const source = html.slice(index, entityEnd + 1);
            return { value: decodeEntity(source), end: entityEnd + 1 };
        }
    }
    return { value: html[index], end: index + 1 };
}

function findTagEnd(html, start, end) {
    let quote = null;
    for (let index = start + 1; index < end; index += 1) {
        const character = html[index];
        if (quote) {
            if (character === quote) quote = null;
        } else if (character === '"' || character === "'") {
            quote = character;
        } else if (character === '>') {
            return index;
        }
    }
    return -1;
}
