/** Returns every non-overlapping match for a Code view search. */
export function findCodeMatches(source, query, useRegex = false) {
    const value = String(source ?? '');
    const search = String(query ?? '');
    if (!search) {
        return { matches: [], error: null };
    }

    let expression;
    try {
        expression = new RegExp(useRegex ? search : escapeRegExp(search), 'gim');
    } catch {
        return { matches: [], error: 'Invalid regular expression' };
    }

    const matches = [];
    let match;
    while ((match = expression.exec(value)) !== null) {
        matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            captures: match.slice(1),
            groups: match.groups || null
        });
        if (match[0].length === 0) {
            expression.lastIndex += 1;
        }
    }
    return { matches, error: null };
}

/** Replaces one previously computed match. */
export function replaceCodeMatch(source, match, replacement, useRegex = false) {
    const value = String(source ?? '');
    if (!match) {
        return { value, index: 0 };
    }

    const nextText = useRegex
        ? expandRegexReplacement(String(replacement ?? ''), match, value)
        : String(replacement ?? '');
    return {
        value: `${value.slice(0, match.start)}${nextText}${value.slice(match.end)}`,
        index: match.start + nextText.length
    };
}

/** Replaces every previously computed match from the end of the source. */
export function replaceAllCodeMatches(source, matches, replacement, useRegex = false) {
    const original = String(source ?? '');
    let value = original;
    for (let index = matches.length - 1; index >= 0; index -= 1) {
        const match = matches[index];
        const nextText = useRegex
            ? expandRegexReplacement(String(replacement ?? ''), match, original)
            : String(replacement ?? '');
        value = `${value.slice(0, match.start)}${nextText}${value.slice(match.end)}`;
    }
    return value;
}

/** Reports whether an event invokes find or replace in Code view. */
export function getCodeFindShortcutMode(event) {
    const key = (event?.key || '').toLowerCase();
    if (!event || event.ctrlKey === event.metaKey || event.altKey || (key !== 'f' && event.code !== 'KeyF')) {
        return null;
    }
    return event.shiftKey ? 'replace' : 'find';
}

/** Creates the floating Code view find and replace controller. */
export function createCodeFindController({
    textarea,
    panel,
    searchInput,
    replaceInput,
    regexToggle,
    replaceToggle,
    replaceRow,
    previousButton,
    nextButton,
    replaceButton,
    replaceAllButton,
    closeButton,
    status,
    onReveal = () => {},
    onMatch = () => {},
    onBeforeReplace = () => {},
    onReplace = () => {}
}) {
    if (!textarea || !panel || !searchInput) {
        return createEmptyController();
    }

    let matches = [];
    let activeIndex = -1;
    let regexError = null;
    let bound = false;

    function bind() {
        if (bound) {
            return;
        }
        bound = true;
        searchInput.addEventListener('input', () => refresh({ selectMatch: true }));
        searchInput.addEventListener('keydown', handleSearchKeydown);
        replaceInput?.addEventListener('keydown', handleReplaceKeydown);
        regexToggle?.addEventListener('click', toggleRegex);
        replaceToggle?.addEventListener('click', () => setReplaceVisible(replaceRow?.hidden !== false));
        previousButton?.addEventListener('click', () => move(-1));
        nextButton?.addEventListener('click', () => move(1));
        replaceButton?.addEventListener('click', replaceCurrent);
        replaceAllButton?.addEventListener('click', replaceAll);
        closeButton?.addEventListener('click', close);
        panel.addEventListener('keydown', handlePanelKeydown);
    }

    function open({ replace = false } = {}) {
        const wasHidden = panel.hidden;
        panel.hidden = false;
        setReplaceVisible(replace);
        if (wasHidden) {
            const selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
            if (selectedText && selectedText.length <= 200 && !/[\r\n]/.test(selectedText)) {
                searchInput.value = selectedText;
            }
        }
        refresh({ selectMatch: Boolean(searchInput.value) });
        searchInput.focus();
        searchInput.select();
    }

    function close() {
        if (panel.hidden) {
            return;
        }
        panel.hidden = true;
        onMatch(null);
        textarea.focus();
    }

    function handleShortcut(event) {
        const mode = getCodeFindShortcutMode(event);
        if (!mode) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        open({ replace: mode === 'replace' });
        return true;
    }

    function refresh({ selectMatch = false, anchor = textarea.selectionStart || 0 } = {}) {
        if (panel.hidden) {
            return;
        }

        const result = findCodeMatches(textarea.value, searchInput.value, isRegexEnabled());
        matches = result.matches;
        regexError = result.error;
        searchInput.setAttribute('aria-invalid', String(Boolean(regexError)));
        if (regexError) {
            searchInput.title = regexError;
        } else {
            searchInput.removeAttribute('title');
        }

        if (!matches.length) {
            activeIndex = -1;
            onMatch(null);
        } else {
            const selectedStart = textarea.selectionStart;
            const selectedEnd = textarea.selectionEnd;
            const exactIndex = matches.findIndex(match => match.start === selectedStart && match.end === selectedEnd);
            activeIndex = exactIndex >= 0
                ? exactIndex
                : matches.findIndex(match => match.start >= anchor);
            if (activeIndex < 0) {
                activeIndex = 0;
            }
        }

        updateControls();
        if (selectMatch && activeIndex >= 0) {
            selectActiveMatch();
        } else if (activeIndex >= 0) {
            onMatch(matches[activeIndex]);
        }
    }

    function move(direction) {
        refresh();
        if (!matches.length) {
            return;
        }
        activeIndex = (activeIndex + direction + matches.length) % matches.length;
        selectActiveMatch();
    }

    function selectActiveMatch() {
        const match = matches[activeIndex];
        if (!match) {
            return;
        }
        textarea.setSelectionRange(match.start, match.end);
        onReveal(match.start);
        onMatch(match);
        updateControls();
    }

    function replaceCurrent() {
        refresh();
        const match = matches[activeIndex];
        if (!match) {
            return;
        }

        onBeforeReplace();
        const result = replaceCodeMatch(textarea.value, match, replaceInput?.value || '', isRegexEnabled());
        textarea.value = result.value;
        textarea.setSelectionRange(result.index, result.index);
        onReplace('Replace code match', 1);
        refresh({ selectMatch: true, anchor: result.index });
    }

    function replaceAll() {
        refresh();
        if (!matches.length) {
            return;
        }

        const replacedCount = matches.length;
        const firstIndex = matches[0].start;
        onBeforeReplace();
        textarea.value = replaceAllCodeMatches(
            textarea.value,
            matches,
            replaceInput?.value || '',
            isRegexEnabled()
        );
        textarea.setSelectionRange(firstIndex, firstIndex);
        onReplace('Replace all code matches', replacedCount);
        refresh({ selectMatch: true, anchor: firstIndex });
    }

    function toggleRegex() {
        regexToggle.setAttribute('aria-pressed', String(!isRegexEnabled()));
        refresh({ selectMatch: true });
    }

    function setReplaceVisible(visible) {
        if (!replaceRow || !replaceToggle) {
            return;
        }
        replaceRow.hidden = !visible;
        replaceToggle.setAttribute('aria-expanded', String(visible));
        replaceToggle.setAttribute('aria-label', visible ? 'Hide replace' : 'Show replace');
    }

    function handleSearchKeydown(event) {
        if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        event.preventDefault();
        move(event.shiftKey ? -1 : 1);
    }

    function handleReplaceKeydown(event) {
        if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        event.preventDefault();
        replaceCurrent();
    }

    function handlePanelKeydown(event) {
        if (handleShortcut(event)) {
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    }

    function updateControls() {
        const hasMatches = matches.length > 0 && !regexError;
        previousButton && (previousButton.disabled = !hasMatches);
        nextButton && (nextButton.disabled = !hasMatches);
        replaceButton && (replaceButton.disabled = !hasMatches);
        replaceAllButton && (replaceAllButton.disabled = !hasMatches);
        if (!status) {
            return;
        }
        if (regexError) {
            status.textContent = 'Invalid regex';
        } else if (!searchInput.value) {
            status.textContent = '';
        } else if (!matches.length) {
            status.textContent = 'No results';
        } else {
            status.textContent = `${activeIndex + 1} of ${matches.length}`;
        }
    }

    function isRegexEnabled() {
        return regexToggle?.getAttribute('aria-pressed') === 'true';
    }

    return {
        bind,
        open,
        close,
        refresh,
        move,
        replaceCurrent,
        replaceAll,
        handleShortcut,
        isOpen: () => !panel.hidden
    };
}

function expandRegexReplacement(template, match, source) {
    return template.replace(/\$([$&'`]|\d{1,2}|<[^>]+>)/g, (token, reference) => {
        if (reference === '$') return '$';
        if (reference === '&') return match.text;
        if (reference === '`') return source.slice(0, match.start);
        if (reference === "'") return source.slice(match.end);
        if (reference.startsWith('<')) {
            const name = reference.slice(1, -1);
            return match.groups && Object.hasOwn(match.groups, name)
                ? match.groups[name] ?? ''
                : token;
        }

        const captureIndex = Number(reference);
        if (captureIndex >= 1 && captureIndex <= match.captures.length) {
            return match.captures[captureIndex - 1] ?? '';
        }
        if (reference.length === 2) {
            const firstCapture = Number(reference[0]);
            if (firstCapture >= 1 && firstCapture <= match.captures.length) {
                return `${match.captures[firstCapture - 1] ?? ''}${reference[1]}`;
            }
        }
        return token;
    });
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createEmptyController() {
    const noOp = () => {};
    return {
        bind: noOp,
        open: noOp,
        close: noOp,
        refresh: noOp,
        move: noOp,
        replaceCurrent: noOp,
        replaceAll: noOp,
        handleShortcut: () => false,
        isOpen: () => false
    };
}
