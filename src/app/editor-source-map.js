const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/** Maps rendered element paths to their opening and closing ranges in HTML source. */
export function buildElementSourceMap(html) {
    const entries = [];
    const documentFrame = { path: null, childCount: 0, entry: null };
    const stack = [documentFrame];
    let index = 0;

    while (index < html.length) {
        const tagStart = html.indexOf('<', index);
        if (tagStart === -1) break;
        if (html.startsWith('<!--', tagStart)) {
            const commentEnd = html.indexOf('-->', tagStart + 4);
            index = commentEnd === -1 ? html.length : commentEnd + 3;
            continue;
        }

        const tagEnd = getTagEndIndex(html, tagStart);
        if (tagEnd === -1) break;
        const tagSource = html.slice(tagStart, tagEnd + 1);
        const tagMatch = tagSource.match(/^<\s*(\/?)\s*([A-Za-z][\w:-]*)/);
        if (!tagMatch) {
            index = tagEnd + 1;
            continue;
        }

        const tagName = tagMatch[2].toLowerCase();
        if (tagMatch[1] === '/') {
            closeSourceMapEntry(stack, tagName, tagEnd + 1);
            index = tagEnd + 1;
            continue;
        }

        const parentFrame = stack[stack.length - 1] || documentFrame;
        const path = parentFrame.path === null ? [] : parentFrame.path.concat(parentFrame.childCount);
        parentFrame.childCount += 1;
        const isSelfClosing = /\/\s*>$/.test(tagSource) || voidTags.has(tagName);
        const entry = path.length === 0 ? null : {
            tagName, path, pathKey: path.join('.'), startIndex: tagStart,
            openEndIndex: tagEnd + 1, endIndex: tagEnd + 1
        };
        if (entry) entries.push(entry);
        if (!isSelfClosing) stack.push({ tagName, path, childCount: 0, entry });
        index = tagEnd + 1;
    }

    return entries;
}

/** Returns element path. */
export function getElementPath(element, root) {
    if (!element || !root || element === root || !root.contains(element)) return null;
    const path = [];
    let current = element;
    while (current && current !== root) {
        const parent = current.parentElement;
        if (!parent) return null;
        path.unshift(Array.from(parent.children).indexOf(current));
        current = parent;
    }
    return path;
}

/** Returns element by path. */
export function getElementByPath(root, path) {
    return path.reduce((current, index) => {
        return current?.children?.[index] || null;
    }, root);
}

/** Closes source map entry. */
function closeSourceMapEntry(stack, tagName, endIndex) {
    for (let index = stack.length - 1; index > 0; index -= 1) {
        const frame = stack[index];
        stack.pop();
        if (frame.entry) frame.entry.endIndex = endIndex;
        if (frame.tagName === tagName) return;
    }
}

/** Returns tag end index. */
function getTagEndIndex(html, tagStart) {
    let quote = null;
    for (let index = tagStart + 1; index < html.length; index += 1) {
        const char = html[index];
        if (quote) {
            if (char === quote) quote = null;
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '>') {
            return index;
        }
    }
    return -1;
}
