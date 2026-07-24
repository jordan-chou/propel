const MIRRORED_PROPERTIES = [
    'boxSizing',
    'fontFamily',
    'fontSize',
    'fontStyle',
    'fontWeight',
    'fontVariantLigatures',
    'fontFeatureSettings',
    'letterSpacing',
    'lineHeight',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'tabSize',
    'textAlign',
    'textIndent',
    'textTransform',
    'whiteSpace',
    'wordBreak'
];

/** Creates syntax-highlight and line-number layers for the visible source lines. */
export function createCodeHighlightViewport({ overlay, textarea, lineNumbers = null, highlight, overscanLines = 6 }) {
    if (!overlay || !textarea || typeof highlight !== 'function') {
        return createEmptyViewport();
    }

    const code = overlay.querySelector('code') || overlay;
    const mirror = textarea.ownerDocument.createElement('div');
    const mirrorText = textarea.ownerDocument.createTextNode('');
    const lineTopCache = new Map();
    let source = '';
    let lineStarts = [0];
    let frame = null;
    let lastWidth = -1;
    let lastHeight = -1;
    let searchRange = null;

    mirror.setAttribute('aria-hidden', 'true');
    mirror.setAttribute('inert', '');
    mirror.style.position = 'fixed';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.left = '-100000px';
    mirror.style.top = '0';
    mirror.style.height = 'auto';
    mirror.style.minHeight = '0';
    mirror.style.margin = '0';
    mirror.style.overflow = 'hidden';
    mirror.append(mirrorText);
    textarea.ownerDocument.body.append(mirror);

    const resizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => schedule(true))
        : null;
    resizeObserver?.observe(textarea);

    function update(nextSource) {
        const normalizedSource = String(nextSource ?? '');
        if (normalizedSource === source) {
            render();
            return;
        }
        source = normalizedSource;
        lineStarts = getLineStarts(source);
        // The zero-width probe makes the final empty line measurable when the
        // document ends with a newline, including after a wrapped line.
        mirrorText.data = `${source}\u200b`;
        refreshLayout(true);
        render();
    }

    function schedule(layoutChanged = false) {
        if (layoutChanged) {
            lineTopCache.clear();
        }
        if (frame !== null) {
            return;
        }
        frame = requestAnimationFrame(() => {
            frame = null;
            refreshLayout(layoutChanged);
            render();
        });
    }

    function setSearchRange(range) {
        searchRange = range && Number.isFinite(range.start) && Number.isFinite(range.end)
            ? { start: range.start, end: range.end }
            : null;
        render();
    }

    function refreshLayout(force = false) {
        const width = textarea.clientWidth;
        const height = textarea.clientHeight;
        if (!force && width === lastWidth && height === lastHeight) {
            return;
        }

        const style = getComputedStyle(textarea);
        MIRRORED_PROPERTIES.forEach((property) => {
            mirror.style[property] = style[property];
        });
        mirror.style.overflowWrap = style.overflowWrap;
        mirror.style.width = `${width}px`;
        lastWidth = width;
        lastHeight = height;
        lineTopCache.clear();
    }

    function render() {
        if (!source || textarea.clientHeight === 0) {
            code.textContent = '';
            lineNumbers?.replaceChildren();
            return;
        }

        refreshLayout();
        const lineHeight = getLineHeight(textarea);
        const overscan = lineHeight * overscanLines;
        const firstLine = findLineAtY(Math.max(0, textarea.scrollTop - overscan));
        const lastLine = findLineAtY(textarea.scrollTop + textarea.clientHeight + overscan);
        const start = lineStarts[firstLine];
        const end = lastLine + 1 < lineStarts.length ? lineStarts[lastLine + 1] : source.length;
        const style = getComputedStyle(textarea);
        const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(style.paddingRight) || 0;

        code.innerHTML = highlightVisibleSource(start, end);
        code.style.top = `${getLineTop(firstLine) - textarea.scrollTop}px`;
        code.style.left = `${paddingLeft - textarea.scrollLeft}px`;
        code.style.width = `${Math.max(0, textarea.clientWidth - paddingLeft - paddingRight)}px`;
        code.dataset.highlightStart = String(start);
        code.dataset.highlightEnd = String(end);
        renderLineNumbers(firstLine, lastLine);
    }

    function renderLineNumbers(firstLine, lastLine) {
        if (!lineNumbers) {
            return;
        }

        const fragment = textarea.ownerDocument.createDocumentFragment();
        for (let lineIndex = firstLine; lineIndex <= lastLine; lineIndex += 1) {
            const number = textarea.ownerDocument.createElement('span');
            number.textContent = String(lineIndex + 1);
            number.style.top = `${getLineTop(lineIndex) - textarea.scrollTop}px`;
            fragment.append(number);
        }
        lineNumbers.replaceChildren(fragment);
        lineNumbers.dataset.firstLine = String(firstLine + 1);
        lineNumbers.dataset.lastLine = String(lastLine + 1);
    }

    function highlightVisibleSource(start, end) {
        if (!searchRange || searchRange.end < start || searchRange.start > end) {
            return highlight(source.slice(start, end));
        }

        const matchStart = Math.max(start, Math.min(searchRange.start, end));
        const matchEnd = Math.max(matchStart, Math.min(searchRange.end, end));
        const before = highlight(source.slice(start, matchStart));
        const match = matchStart === matchEnd
            ? '&#8203;'
            : highlight(source.slice(matchStart, matchEnd));
        const after = highlight(source.slice(matchEnd, end));
        return `${before}<mark class="code-search-match">${match}</mark>${after}`;
    }

    function findLineAtY(targetY) {
        let low = 0;
        let high = lineStarts.length - 1;
        let match = 0;
        while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            if (getLineTop(middle) <= targetY) {
                match = middle;
                low = middle + 1;
            } else {
                high = middle - 1;
            }
        }
        return match;
    }

    function getLineTop(lineIndex) {
        if (lineTopCache.has(lineIndex)) {
            return lineTopCache.get(lineIndex);
        }

        const offset = lineStarts[lineIndex];
        let top;
        const range = textarea.ownerDocument.createRange();
        range.setStart(mirrorText, offset);
        range.setEnd(mirrorText, offset + 1);
        const rect = range.getClientRects()[0];
        top = rect ? rect.top - mirror.getBoundingClientRect().top : 0;
        lineTopCache.set(lineIndex, top);
        return top;
    }

    function destroy() {
        if (frame !== null) {
            cancelAnimationFrame(frame);
        }
        resizeObserver?.disconnect();
        mirror.remove();
    }

    refreshLayout(true);
    return { update, schedule, render, setSearchRange, destroy };
}

export function getLineStarts(source) {
    const starts = [0];
    for (let index = 0; index < source.length; index += 1) {
        if (source[index] === '\n') {
            starts.push(index + 1);
        }
    }
    return starts;
}

function getLineHeight(element) {
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    return Number.isFinite(lineHeight) ? lineHeight : 22;
}

function createEmptyViewport() {
    const noOp = () => {};
    return { update: noOp, schedule: noOp, render: noOp, setSearchRange: noOp, destroy: noOp };
}
