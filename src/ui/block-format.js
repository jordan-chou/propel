import { renameTag } from '../util.js';

const blockSelector = 'h1, h2, h3, h4, h5, h6, p';
const supportedBlockTags = /^(?:h[1-6]|p)$/;

/**
 * Changes the heading or paragraph elements covered by a Live editor selection.
 * Returns the replacement elements, or an empty array when no block can be found.
 */
export function applyBlockFormat(root, selection, targetTagName) {
    const normalizedTagName = String(targetTagName || '').toLowerCase();
    if (!root || !selection || selection.rangeCount === 0 || !supportedBlockTags.test(normalizedTagName)) {
        return [];
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        return [];
    }

    const blocks = Array.from(root.querySelectorAll(blockSelector));
    const startBlock = getBoundaryBlock(root, range.startContainer, range.startOffset, false);
    const endBlock = range.collapsed
        ? startBlock
        : getBoundaryBlock(root, range.endContainer, range.endOffset, true);
    const startIndex = blocks.indexOf(startBlock);
    const endIndex = blocks.indexOf(endBlock);

    if (startIndex < 0 || endIndex < startIndex) {
        return [];
    }

    return blocks
        .slice(startIndex, endIndex + 1)
        .map((block) => renameTag(block, normalizedTagName));
}

function getBoundaryBlock(root, container, offset, preferPrevious) {
    const closestBlock = getClosestBlock(root, container);
    if (closestBlock) {
        return closestBlock;
    }

    if (container.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const step = preferPrevious ? -1 : 1;
    for (let index = preferPrevious ? offset - 1 : offset;
        index >= 0 && index < container.childNodes.length;
        index += step) {
        const child = container.childNodes[index];
        const block = getClosestBlock(root, child) || getFirstBlock(child, preferPrevious);
        if (block) {
            return block;
        }
    }
    return null;
}

function getClosestBlock(root, node) {
    let element = node && node.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    while (element && element !== root) {
        if (element.matches(blockSelector)) {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}

function getFirstBlock(node, preferLast) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }
    if (node.matches(blockSelector)) {
        return node;
    }
    const matches = node.querySelectorAll(blockSelector);
    return preferLast ? matches[matches.length - 1] || null : matches[0] || null;
}
