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
 * authored styles and semantic formatting.
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

    return cloneRoot;
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
