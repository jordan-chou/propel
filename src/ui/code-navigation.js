/** Reports whether a keyboard event invokes Code view's go-to-line command. */
export function isGoToLineShortcut(event) {
    const key = (event?.key || '').toLowerCase();
    return Boolean(
        event
        && event.ctrlKey !== event.metaKey
        && !event.altKey
        && !event.shiftKey
        && (key === 'g' || event.code === 'KeyG')
    );
}

/** Moves a textarea caret to a requested logical source line. */
export function goToCodeLine(textarea, requestLine) {
    if (!textarea || typeof requestLine !== 'function') {
        return null;
    }

    const source = String(textarea.value ?? '');
    const totalLines = countLines(source);
    const currentLine = getLineNumberForIndex(source, textarea.selectionStart || 0);
    const requestedValue = requestLine(currentLine, totalLines);
    if (requestedValue === null || String(requestedValue).trim() === '') {
        return null;
    }

    const requestedLine = Number(requestedValue);
    if (!Number.isInteger(requestedLine)) {
        return null;
    }

    const lineNumber = Math.max(1, Math.min(requestedLine, totalLines));
    const index = getLineStartIndex(source, lineNumber);
    textarea.focus();
    textarea.setSelectionRange(index, index);
    return { lineNumber, index };
}

/** Returns the one-based logical line containing a source index. */
export function getLineNumberForIndex(source, sourceIndex) {
    const value = String(source ?? '');
    const target = Math.max(0, Math.min(Number(sourceIndex) || 0, value.length));
    let lineNumber = 1;
    for (let index = 0; index < target; index += 1) {
        if (value[index] === '\n') {
            lineNumber += 1;
        }
    }
    return lineNumber;
}

/** Returns the source index at the start of a one-based logical line. */
export function getLineStartIndex(source, lineNumber) {
    const value = String(source ?? '');
    const targetLine = Math.max(1, Math.min(Number(lineNumber) || 1, countLines(value)));
    if (targetLine === 1) {
        return 0;
    }

    let currentLine = 1;
    for (let index = 0; index < value.length; index += 1) {
        if (value[index] === '\n') {
            currentLine += 1;
            if (currentLine === targetLine) {
                return index + 1;
            }
        }
    }
    return value.length;
}

function countLines(source) {
    let total = 1;
    for (let index = 0; index < source.length; index += 1) {
        if (source[index] === '\n') {
            total += 1;
        }
    }
    return total;
}
