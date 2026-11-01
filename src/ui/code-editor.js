/**
 * Enhances the existing textarea with a locally bundled CodeMirror view.
 * The textarea remains the application's input/selection/event boundary; the
 * editor is a view, and programmatic writes never emit user input events.
 */
export function createCodeEditor(textarea, CodeMirror = window.CodeMirror) {
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    const editor = CodeMirror.fromTextArea(textarea, {
        mode: { name: 'xml', htmlMode: true },
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 4,
        indentUnit: 4,
        smartIndent: false,
        electricChars: false,
        inputStyle: 'textarea',
        screenReaderLabel: 'HTML code',
        extraKeys: { Enter: cm => cm.replaceSelection('\n', 'end', '+input') }
    });
    const wrapper = editor.getWrapperElement();
    wrapper.classList.add('propel-code-editor');
    wrapper.dataset.placeholder = textarea.placeholder;
    const updatePlaceholder = () => wrapper.classList.toggle('is-empty', !editor.getValue());
    updatePlaceholder();
    editor.getInputField().setAttribute('aria-keyshortcuts', textarea.getAttribute('aria-keyshortcuts') || '');
    editor.getInputField().spellcheck = false;
    const bridgedProperties = ['value', 'selectionStart', 'selectionEnd', 'selectionDirection', 'scrollTop', 'scrollLeft', 'clientHeight', 'clientWidth', 'focus', 'setSelectionRange', 'select', 'setRangeText'];
    const originalProperties = new Map(bridgedProperties.map(key => [key, Object.getOwnPropertyDescriptor(textarea, key)]));
    let writing = false;
    let searchMarker = null;
    let changed = false;
    const emit = type => textarea.dispatchEvent(new Event(type));
    const index = position => editor.indexFromPos(position);
    const position = offset => editor.posFromIndex(Math.max(0, Number(offset) || 0));

    // A negative first-line indent cancels the added padding only for the
    // physical first row. Continuations inherit the source line's indentation.
    editor.on('renderLine', (cm, line, element) => {
        const whitespace = line.text.match(/^[\t ]*/)[0];
        const columns = CodeMirror.countColumn(whitespace, null, 4);
        // Keep text usable even when source indentation exceeds the pane width.
        const indent = Math.min(columns * cm.defaultCharWidth(), Math.max(0, cm.getScrollInfo().clientWidth / 2));
        element.style.textIndent = `${-indent}px`;
        element.style.paddingLeft = `${4 + indent}px`;
    });
    editor.on('change', () => {
        nativeValue.set.call(textarea, editor.getValue());
        updatePlaceholder();
        editor.clearHistory(); // Propel owns document undo/redo boundaries.
        if (!writing) { changed = true; emit('input'); }
    });
    for (const type of ['focus', 'scroll']) editor.on(type, () => emit(type));
    editor.on('blur', () => {
        if (changed) { changed = false; emit('change'); }
        emit('blur');
    });
    editor.on('cursorActivity', () => emit('select'));
    editor.on('keydown', (_cm, event) => {
        const forwarded = new KeyboardEvent('keydown', {
            key: event.key, code: event.code, ctrlKey: event.ctrlKey,
            metaKey: event.metaKey, shiftKey: event.shiftKey, altKey: event.altKey,
            cancelable: true
        });
        if (!textarea.dispatchEvent(forwarded)) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
    wrapper.addEventListener('click', () => emit('click'));
    wrapper.addEventListener('keyup', () => emit('keyup'));

    function setSelectionRange(start, end, direction = 'none') {
        const from = position(start);
        const to = position(Math.max(start, end));
        editor.setSelection(direction === 'backward' ? to : from, direction === 'backward' ? from : to, { scroll: false });
    }

    Object.defineProperties(textarea, {
        value: {
            configurable: true,
            get: () => editor.getValue(),
            set(value) {
                writing = true;
                try {
                    // Match native textarea newline normalization.
                    nativeValue.set.call(textarea, value);
                    const next = nativeValue.get.call(textarea);
                    if (next !== editor.getValue()) {
                        const scroll = editor.getScrollInfo();
                        editor.setValue(next);
                        setSelectionRange(next.length, next.length);
                        editor.scrollTo(scroll.left, scroll.top);
                    }
                } finally { writing = false; }
            }
        },
        selectionStart: { configurable: true, get: () => index(editor.getCursor('from')), set: start => setSelectionRange(start, Math.max(start, textarea.selectionEnd)) },
        selectionEnd: { configurable: true, get: () => index(editor.getCursor('to')), set: end => setSelectionRange(Math.min(end, textarea.selectionStart), end) },
        selectionDirection: { configurable: true, get: () => index(editor.getCursor('anchor')) > index(editor.getCursor('head')) ? 'backward' : 'forward' },
        scrollTop: { configurable: true, get: () => editor.getScrollInfo().top, set: top => editor.scrollTo(null, top) },
        scrollLeft: { configurable: true, get: () => editor.getScrollInfo().left, set: left => editor.scrollTo(left, null) },
        clientHeight: { configurable: true, get: () => editor.getScrollInfo().clientHeight },
        clientWidth: { configurable: true, get: () => editor.getScrollInfo().clientWidth }
    });
    textarea.focus = () => editor.focus();
    textarea.setSelectionRange = setSelectionRange;
    textarea.select = () => setSelectionRange(0, textarea.value.length);
    textarea.setRangeText = (replacement, start = textarea.selectionStart, end = textarea.selectionEnd, mode = 'preserve') => {
        const oldStart = textarea.selectionStart;
        const oldEnd = textarea.selectionEnd;
        const text = String(replacement).replace(/\r\n?/g, '\n');
        writing = true;
        try { editor.replaceRange(text, position(start), position(end)); }
        finally { writing = false; }
        const nextEnd = start + text.length;
        const delta = text.length - (end - start);
        if (mode === 'end') setSelectionRange(nextEnd, nextEnd);
        else if (mode === 'start') setSelectionRange(start, start);
        else if (mode === 'select') setSelectionRange(start, nextEnd);
        else setSelectionRange(oldStart > end ? oldStart + delta : Math.min(oldStart, start), oldEnd > end ? oldEnd + delta : oldEnd < start ? oldEnd : nextEnd);
    };

    const resize = new ResizeObserver(() => editor.refresh());
    resize.observe(wrapper.parentElement);
    editor.refresh();
    return {
        editor,
        destroy() {
            resize.disconnect();
            searchMarker?.clear();
            editor.toTextArea();
            for (const [key, descriptor] of originalProperties) {
                if (descriptor) Object.defineProperty(textarea, key, descriptor);
                else delete textarea[key];
            }
        },
        refresh: () => editor.refresh(),
        setSearchRange(range) {
            searchMarker?.clear();
            searchMarker = range ? editor.markText(position(range.start), position(range.end), { className: 'code-search-match' }) : null;
        },
        coordinates(offset) {
            const rect = editor.charCoords(position(offset), 'page');
            const bounds = wrapper.getBoundingClientRect();
            return { left: rect.left - bounds.left - window.scrollX, top: rect.top - bounds.top - window.scrollY };
        },
        scrollTopForIndex(offset) {
            return Math.max(0, editor.charCoords(position(offset), 'local').top - textarea.clientHeight * 0.28);
        }
    };
}
