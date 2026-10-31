/** Records authored inline styles before the browser can mutate the Live editor DOM. */
export function captureLiveEditBaseline(root) {
    const baseline = new WeakMap();
    if (!root) {
        return baseline;
    }

    for (const element of [root, ...root.querySelectorAll('*')]) {
        baseline.set(element, element.getAttribute('style'));
    }
    return baseline;
}

/**
 * Removes presentation markup introduced by contenteditable while retaining
 * authored styles and semantic formatting. Empty editable text blocks created
 * by Live editing are omitted from the committed clone, without disturbing the
 * active contenteditable surface or its caret.
 */
export function normalizeLiveEditClone(sourceRoot, cloneRoot, baseline) {
    if (!sourceRoot || !cloneRoot || !baseline) {
        return cloneRoot;
    }

    const sourceElements = [sourceRoot, ...sourceRoot.querySelectorAll('*')];
    const cloneElements = [cloneRoot, ...cloneRoot.querySelectorAll('*')];
    if (sourceElements.length !== cloneElements.length) {
        return cloneRoot;
    }

    for (let index = 0; index < sourceElements.length; index += 1) {
        const source = sourceElements[index];
        const clone = cloneElements[index];
        if (baseline.has(source)) {
            restoreAuthoredStyle(clone, baseline.get(source));
            continue;
        }

        normalizeBrowserCreatedElement(clone, cloneRoot);
    }

    // Native list commands can leave <p><ul>…</ul></p> in the editable DOM.
    // Lift lists before serialization: reparsing that invalid nesting creates
    // empty paragraphs on both sides of the list.
    normalizeParagraphLists(cloneRoot);

    for (let index = 0; index < sourceElements.length; index += 1) {
        const clone = cloneElements[index];
        if (isEmptyTextBlock(clone)) {
            clone.remove();
        }
    }

    // A lone, unadorned <br> in an empty item is a browser caret placeholder.
    // Keep real breaks (text, multiple breaks, or attributed breaks) intact.
    for (const item of cloneRoot.querySelectorAll('li')) {
        const content = getListItemContent(item);
        if (content.length === 1 && content[0].nodeName === 'BR' && content[0].attributes.length === 0) {
            content[0].remove();
        }
    }

    return cloneRoot;
}

/** Adds caret placeholders only to the Live view when canonical empty items are rendered. */
export function restoreLiveListPlaceholders(root) {
    for (const item of root.querySelectorAll('li')) {
        if (getListItemContent(item).length === 0) {
            item.appendChild(item.ownerDocument.createElement('br'));
        }
    }
}

function getListItemContent(item) {
    return Array.from(item.childNodes).filter(node =>
        node.nodeType !== 3 || !/^[\t\n\r ]*$/.test(node.textContent));
}

function normalizeParagraphLists(root) {
    for (const paragraph of root.querySelectorAll('p')) {
        if (!Array.from(paragraph.children).some(child => child.matches('ul, ol'))) {
            continue;
        }

        const replacements = [];
        let prose = paragraph.ownerDocument.createElement('p');
        const flushProse = () => {
            if (!isEmptyTextBlock(prose)) {
                replacements.push(prose);
            }
            prose = paragraph.ownerDocument.createElement('p');
        };

        for (const child of Array.from(paragraph.childNodes)) {
            if (child.nodeType === 1 && child.matches('ul, ol')) {
                flushProse();
                replacements.push(child);
            } else {
                prose.append(child);
            }
        }
        flushProse();

        replacements.forEach((element, index) => {
            for (const attribute of paragraph.attributes) {
                if ((attribute.name !== 'id' || index === 0) && !element.hasAttribute(attribute.name)) {
                    element.setAttribute(attribute.name, attribute.value);
                }
            }
        });
        paragraph.replaceWith(...replacements);
    }
}

function isEmptyTextBlock(element) {
    if (!element || !/^(?:P|H[1-6])$/.test(element.tagName)) {
        return false;
    }

    const text = element.textContent.replace(/[\s\u00a0\u00ad\u200b-\u200d\u2060\ufeff]/g, '');
    if (text) {
        return false;
    }

    return !element.querySelector(
        'a[id], a[name], a[aria-label], img, picture, video, audio, iframe, canvas, svg, math, object, embed, input, textarea, select, button, hr'
    );
}

function restoreAuthoredStyle(element, style) {
    if (style === null) {
        element.removeAttribute('style');
    } else {
        element.setAttribute('style', style);
    }
}

function normalizeBrowserCreatedElement(element, root) {
    const style = element.style;
    const shouldBold = isBoldWeight(style.fontWeight);
    const shouldItalicize = /^(italic|oblique)/i.test(style.fontStyle);
    const decorations = (style.textDecorationLine || style.textDecoration || '').toLowerCase();
    const shouldUnderline = decorations.includes('underline');
    const shouldStrike = decorations.includes('line-through');
    const cancelsBold = /^(normal|[1-5]00)$/.test(style.fontWeight) && Boolean(element.closest('strong, b'));
    const cancelsItalic = style.fontStyle === 'normal' && Boolean(element.closest('em, i'));

    element.removeAttribute('style');
    if (cancelsBold) {
        element.style.fontWeight = 'normal';
    }
    if (cancelsItalic) {
        element.style.fontStyle = 'normal';
    }

    wrapChildren(element, shouldStrike, 's');
    wrapChildren(element, shouldUnderline, 'u');
    wrapChildren(element, shouldItalicize, 'em');
    wrapChildren(element, shouldBold, 'strong');

    if (element !== root && element.tagName === 'SPAN' && element.attributes.length === 0) {
        element.replaceWith(...element.childNodes);
    }
}

function wrapChildren(element, enabled, tagName) {
    if (!enabled || element.childNodes.length === 0) {
        return;
    }

    const wrapper = element.ownerDocument.createElement(tagName);
    wrapper.append(...element.childNodes);
    element.append(wrapper);
}

function isBoldWeight(value) {
    if (/^(bold|bolder)$/i.test(value)) {
        return true;
    }
    const numericWeight = Number.parseInt(value, 10);
    return Number.isFinite(numericWeight) && numericWeight >= 600;
}
