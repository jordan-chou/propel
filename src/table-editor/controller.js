import { buildCellGrid, getCellPosition } from './model.js';
import { toggleCellsBold, toggleRowsActive } from './formatting.js';
import { moveRowsToTableFooter } from './footer.js';
import { classifyTableCaptionLabels } from './caption-suggestions.js';
import {
    applyTableScopes,
    hasHeaderRelationship,
    MANUAL_SCOPE_ATTRIBUTES,
    preserveExistingHeaderRelationships,
    setManualHeaderRelationship
} from './scoping.js';

/** Returns whether opening a table should perform destructive import normalization. */
export function shouldRunInitialTableCleanup(table, previewCleanup, isCleanedTable) {
    return Boolean(previewCleanup && table && !isCleanedTable(table));
}

/**
 * Creates the stateful table-editor UI controller.
 * Publishing transformations and canonical document ownership remain injected dependencies.
 */
export function createTableEditorController(config) {
    const {
        elements,
        inputHTML,
        liveEditor,
        liveEditorHost,
        uiPreferences,
        cleanupTable,
        isCleanedTable,
        defaultTableCleanupOptions,
        renameTag,
        getEditorSelection,
        getClosestElement,
        preserveParagraphsOnEnter,
        getFocusableElements,
        addProcessingLog,
        showActivityToast,
        syncLiveToInputHTML,
        scrollLiveElementIntoView,
        commitTableChanges,
        openComponentLibraryForTable,
        isLiveEditorSelectingText,
        isEnglish
    } = config;
    const {
        tableEditorDialog, tableEditorResizeHandle, tableEditorSnapGuides,
        tableEditorFullscreenBtn, tableEditorCloseBtn, tableEditorCancelBtn, tableEditorComponentBtn,
        tableEditorApplyBtn, tableEditorApplyNextBtn, tableEditorFirstBtn,
        tableEditorPrevBtn, tableEditorNextBtn, tableEditorLastBtn, tableEditorPages,
        tableEditorUndoBtn, tableEditorRedoBtn,
        tableEditorDeselectBtn, tableEditorScopingModeBtn, tableEditorHeaderBtn, tableEditorMergeRowBtn,
        tableEditorMergeCellsBtn, tableEditorActiveBtn, tableEditorAddFooterBtn,
        tableEditorTfootBtn, tableEditorIndentBtn, tableEditorOutdentBtn,
        tableEditorBoldBtn, tableEditorLeftBtn, tableEditorCenterBtn,
        tableEditorRightBtn, tableEditorDeleteRowBtn, tableEditorStatus,
        tableEditorCanvas, tableEditorNumber, tableEditorCaption, tableEditorUnit,
        tableEditorNumberSuggestion, tableEditorCaptionSuggestion,
        tableEditorUnitSuggestion, tableEditorComplexScoping, tableEditorFinancial, tableEditorFrench,
        optionHelpButtons, optionTooltip, toastRegion, liveTableEditPopover, liveTableComponentPopover
    } = elements;

    let tableEditorIndex = 0;
    let tableEditorPreviousFocus = null;
    let tableEditorLastSelectedCell = null;
    let tableEditorDragStartCell = null;
    let tableEditorIsDragging = false;
    let tableEditorPreviewCleanup = false;
    let liveTableEditTarget = null;
    let tableEditorHistory = [];
    let tableEditorHistoryIndex = -1;
    let tableEditorHistoryTimer = null;
    let tableEditorHistoryRestoring = false;
    let tableEditorPendingAction = null;
    let tableEditorCaptionSuggestions = {};
    let tableEditorAcceptedExternalCaptionNodes = new Set();
    let tableEditorScopingMode = false;
    let tableEditorScopeParent = null;
    let tableEditorScopePaintEnabled = null;
    const tableEditorSizeStorageKey = 'tableEditorSize';
    const tableEditorBottomLayoutQuery = window.matchMedia('(orientation: portrait) and (min-width: 768px), (max-width: 767px)');
    const tableEditorMobileLayoutQuery = window.matchMedia('(max-width: 767px)');
    const tableEditorSnapZone = 24;

    /** Synchronizes the table editor number format with the document language. */
    function syncTableEditorFrenchOption() {
        if (tableEditorFrench) tableEditorFrench.checked = !isEnglish();
    }

    /** Creates table editor listeners. */
    function createTableEditorListeners() {
        if (!tableEditorDialog) {
            return;
        }
    
        [tableEditorCloseBtn, tableEditorCancelBtn].forEach((element) => {
            if (element) {
                element.addEventListener('click', closeTableEditor);
            }
        });
    
        if (tableEditorDialog) {
            tableEditorDialog.addEventListener('keydown', handleTableEditorDialogKeydown);
        }
        if (tableEditorFullscreenBtn) {
            tableEditorFullscreenBtn.addEventListener('click', toggleTableEditorFullscreen);
        }
        if (tableEditorResizeHandle) {
            tableEditorResizeHandle.addEventListener('pointerdown', startTableEditorResize);
            tableEditorResizeHandle.addEventListener('keydown', handleTableEditorResizeKeydown);
        }
        tableEditorBottomLayoutQuery.addEventListener('change', updateTableEditorResizeHandle);
        if (tableEditorCanvas) {
            tableEditorCanvas.addEventListener('beforeinput', removeEmptyFooterPlaceholder);
            tableEditorCanvas.addEventListener('input', () => scheduleTableEditorHistoryCommit('Edit table content'));
            tableEditorCanvas.addEventListener('paste', replaceEmptyFooterPlaceholderOnPaste);
            tableEditorCanvas.addEventListener('keydown', preserveParagraphsOnEnter);
            tableEditorCanvas.addEventListener('click', handleTableEditorCanvasClick);
            tableEditorCanvas.addEventListener('mousedown', handleTableEditorCanvasMouseDown);
            tableEditorCanvas.addEventListener('mouseover', handleTableEditorCanvasMouseOver);
            document.addEventListener('mouseup', handleTableEditorDocumentMouseUp);
        }
        if (tableEditorApplyBtn) {
            tableEditorApplyBtn.addEventListener('click', () => applyTableEditorChanges(false));
        }
        if (tableEditorApplyNextBtn) {
            tableEditorApplyNextBtn.addEventListener('click', () => applyTableEditorChanges(true));
        }
        if (tableEditorComponentBtn) {
            tableEditorComponentBtn.addEventListener('click', openActiveTableComponentLibrary);
        }
        if (liveTableComponentPopover) {
            liveTableComponentPopover.addEventListener('click', openHoveredLiveTableComponentLibrary);
        }
        if (tableEditorFirstBtn) {
            tableEditorFirstBtn.addEventListener('click', () => renderTableEditor(0));
        }
        if (tableEditorPrevBtn) {
            tableEditorPrevBtn.addEventListener('click', () => renderTableEditor(tableEditorIndex - 1));
        }
        if (tableEditorNextBtn) {
            tableEditorNextBtn.addEventListener('click', () => renderTableEditor(tableEditorIndex + 1));
        }
        if (tableEditorLastBtn) {
            tableEditorLastBtn.addEventListener('click', () => renderTableEditor(getTableEditorItems().length - 1));
        }
        if (tableEditorDeselectBtn) {
            tableEditorDeselectBtn.addEventListener('click', deselectTableEditorCells);
        }
        if (tableEditorScopingModeBtn) {
            tableEditorScopingModeBtn.addEventListener('click', toggleTableEditorScopingMode);
        }
        if (tableEditorHeaderBtn) {
            tableEditorHeaderBtn.addEventListener('click', () => runTableEditorMutation(toggleTableEditorHeaderRows, 'Header row'));
        }
        if (tableEditorMergeRowBtn) {
            tableEditorMergeRowBtn.addEventListener('click', () => runTableEditorMutation(mergeTableEditorRows, 'Merge row'));
        }
        if (tableEditorMergeCellsBtn) {
            tableEditorMergeCellsBtn.addEventListener('click', () => runTableEditorMutation(mergeTableEditorSelectedCells, 'Merge cells'));
        }
        if (tableEditorActiveBtn) {
            tableEditorActiveBtn.addEventListener('click', () => runTableEditorMutation(toggleTableEditorActiveRows, 'Active row'));
        }
        if (tableEditorAddFooterBtn) {
            tableEditorAddFooterBtn.addEventListener('click', () => runTableEditorMutation(addEmptyTableEditorFooter, 'Add empty footer'));
        }
        if (tableEditorTfootBtn) {
            tableEditorTfootBtn.addEventListener('click', () => runTableEditorMutation(moveTableEditorRowsToFooter, 'Move row content to footer'));
        }
        if (tableEditorIndentBtn) {
            tableEditorIndentBtn.addEventListener('click', () => runTableEditorMutation(() => changeTableEditorIndent(1), 'Indent'));
        }
        if (tableEditorOutdentBtn) {
            tableEditorOutdentBtn.addEventListener('click', () => runTableEditorMutation(() => changeTableEditorIndent(-1), 'Outdent'));
        }
        if (tableEditorBoldBtn) {
            tableEditorBoldBtn.addEventListener('click', boldTableEditorSelection);
        }
        if (tableEditorLeftBtn) {
            tableEditorLeftBtn.addEventListener('click', () => runTableEditorMutation(() => alignTableEditorCells('left'), 'Align left'));
        }
        if (tableEditorCenterBtn) {
            tableEditorCenterBtn.addEventListener('click', () => runTableEditorMutation(() => alignTableEditorCells('center'), 'Align center'));
        }
        if (tableEditorRightBtn) {
            tableEditorRightBtn.addEventListener('click', () => runTableEditorMutation(() => alignTableEditorCells('right'), 'Align right'));
        }
        if (tableEditorDeleteRowBtn) {
            tableEditorDeleteRowBtn.addEventListener('click', () => runTableEditorMutation(deleteTableEditorRows, 'Delete row'));
        }
        if (tableEditorUndoBtn) {
            tableEditorUndoBtn.addEventListener('click', undoTableEditorChange);
        }
        if (tableEditorRedoBtn) {
            tableEditorRedoBtn.addEventListener('click', redoTableEditorChange);
        }
    
        [tableEditorNumber, tableEditorCaption, tableEditorUnit].forEach((field) => {
            if (field) {
                field.addEventListener('beforeinput', () => dismissPendingTableCaptionSuggestion(field));
                field.addEventListener('focus', () => {
                    if (field.hasAttribute('data-caption-suggestion')) {
                        field.select();
                    }
                });
                field.addEventListener('keydown', (event) => {
                    if (event.key !== 'Enter' || !field.hasAttribute('data-caption-suggestion')) {
                        return;
                    }
    
                    event.preventDefault();
                    const type = field.getAttribute('data-caption-suggestion');
                    const suggestionHost = field === tableEditorNumber
                        ? tableEditorNumberSuggestion
                        : field === tableEditorCaption
                            ? tableEditorCaptionSuggestion
                            : tableEditorUnitSuggestion;
                    acceptTableCaptionSuggestion(type, field, suggestionHost);
                    focusNextTableCaptionField(field);
                });
                field.addEventListener('input', () => {
                    updateTableEditorCaption();
                    const suggestionHost = field === tableEditorNumber
                        ? tableEditorNumberSuggestion
                        : field === tableEditorCaption
                            ? tableEditorCaptionSuggestion
                            : tableEditorUnitSuggestion;
                    if (suggestionHost) {
                        suggestionHost.hidden = Boolean(field.value.trim());
                    }
                    scheduleTableEditorHistoryCommit('Edit table caption');
                });
            }
        });
    
        [tableEditorComplexScoping, tableEditorFinancial, tableEditorFrench].forEach((field) => {
            if (field) {
                field.addEventListener('change', () => {
                    const action = field === tableEditorComplexScoping
                        ? 'table.option.complexScoping'
                        : field === tableEditorFinancial ? 'table.option.financial' : 'table.option.french';
                    applyTableOptionChange(field, action);
                    if (field === tableEditorComplexScoping && !field.checked) setTableEditorScopingMode(false);
                });
            }
        });
    
        optionHelpButtons.forEach((button) => {
            button.addEventListener('mouseenter', () => showOptionTooltip(button));
            button.addEventListener('focus', () => showOptionTooltip(button));
            button.addEventListener('mouseleave', () => {
                if (document.activeElement !== button) {
                    hideOptionTooltip();
                }
            });
            button.addEventListener('blur', hideOptionTooltip);
        });
    
        const tableEditorPanel = tableEditorDialog.querySelector('.table-editor-panel');
        if (tableEditorPanel) {
            tableEditorPanel.addEventListener('scroll', hideOptionTooltip);
        }
        window.addEventListener('resize', () => {
            hideOptionTooltip();
            updateTableEditorResizeHandle();
            updateTableEditorToastPosition();
        });
    }
    
    /** Moves focus to next table caption field. */
    function focusNextTableCaptionField(field) {
        const fields = [tableEditorNumber, tableEditorCaption, tableEditorUnit].filter(Boolean);
        const fieldIndex = fields.indexOf(field);
        const nextField = fields[fieldIndex + 1] || tableEditorFinancial;
    
        if (nextField) {
            nextField.focus();
        }
    }
    
    /** Refreshes table editor toast position. */
    function updateTableEditorToastPosition() {
        if (!toastRegion || !tableEditorDialog || tableEditorDialog.hidden) {
            return;
        }
    
        const editorRect = tableEditorDialog.getBoundingClientRect();
        toastRegion.style.setProperty('--table-editor-toast-left', `${Math.round(editorRect.left + 16)}px`);
        toastRegion.style.setProperty('--table-editor-toast-bottom', `${Math.round(window.innerHeight - editorRect.bottom + 14)}px`);
    }
    
    /** Returns stored table editor size. */
    function getStoredTableEditorSize() {
        try {
            return uiPreferences.get(tableEditorSizeStorageKey, {});
        } catch (error) {
            return {};
        }
    }
    
    /** Stores table editor size. */
    function storeTableEditorSize(name, value) {
        const size = getStoredTableEditorSize();
        size[name] = Math.round(value);
        try {
            uiPreferences.set(tableEditorSizeStorageKey, size);
        } catch (error) {
            // The editor remains resizable when storage is unavailable.
        }
    }
    
    /** Refreshes table editor resize handle. */
    function updateTableEditorResizeHandle() {
        if (!tableEditorDialog || !tableEditorResizeHandle) {
            return;
        }
    
        const { isBottomLayout, min, max } = getTableEditorSizeMetrics();
        const value = isBottomLayout ? tableEditorDialog.offsetHeight : tableEditorDialog.offsetWidth;
        tableEditorResizeHandle.setAttribute('aria-orientation', isBottomLayout ? 'horizontal' : 'vertical');
        tableEditorResizeHandle.setAttribute('aria-valuemin', String(min));
        tableEditorResizeHandle.setAttribute('aria-valuemax', String(max));
        tableEditorResizeHandle.setAttribute('aria-valuenow', String(Math.round(value)));
        updateTableEditorSnapGuides();
    }
    
    /** Returns table editor size metrics. */
    function getTableEditorSizeMetrics() {
        const isBottomLayout = tableEditorBottomLayoutQuery.matches;
        const viewportSize = isBottomLayout ? window.innerHeight : window.innerWidth;
        const min = isBottomLayout ? Math.min(360, viewportSize - 24) : Math.min(600, viewportSize - 24);
        const max = Math.max(min, viewportSize - 24);
        const responsiveDefaultRatio = tableEditorMobileLayoutQuery.matches ? 0.72 : 0.86;
        const defaultSize = isBottomLayout
            ? Math.min(viewportSize * responsiveDefaultRatio, tableEditorMobileLayoutQuery.matches ? 760 : 920, max)
            : Math.min(980, max);
    
        return { isBottomLayout, viewportSize, min, max, defaultSize };
    }
    
    /** Returns table editor snap sizes. */
    function getTableEditorSnapSizes(metrics = getTableEditorSizeMetrics()) {
        return [metrics.defaultSize, metrics.viewportSize * (2 / 3)]
            .map((size) => Math.max(metrics.min, Math.min(size, metrics.max)));
    }
    
    /** Refreshes table editor snap guides. */
    function updateTableEditorSnapGuides() {
        const metrics = getTableEditorSizeMetrics();
        const sizes = getTableEditorSnapSizes(metrics);
    
        tableEditorSnapGuides.forEach((guide, index) => {
            const size = sizes[index];
            const duplicatesEarlierGuide = sizes.slice(0, index).some((otherSize) => Math.abs(otherSize - size) < 1);
            guide.hidden = duplicatesEarlierGuide;
            guide.style.setProperty('--table-editor-snap-position', `${metrics.viewportSize - size}px`);
        });
    }
    
    /** Snaps table editor size. */
    function snapTableEditorSize(value, metrics = getTableEditorSizeMetrics()) {
        const snapSize = getTableEditorSnapSizes(metrics).find((size) => Math.abs(value - size) <= tableEditorSnapZone);
        return snapSize === undefined ? value : snapSize;
    }
    
    /** Shows active table editor snap. */
    function showActiveTableEditorSnap(value) {
        const sizes = getTableEditorSnapSizes();
        tableEditorSnapGuides.forEach((guide, index) => {
            guide.classList.toggle('active', Math.abs(sizes[index] - value) < 1);
        });
    }
    
    /** Applies stored table editor size. */
    function applyStoredTableEditorSize() {
        const size = getStoredTableEditorSize();
        if (Number.isFinite(size.width)) {
            tableEditorDialog.style.setProperty('--table-editor-width', `${size.width}px`);
        }
        if (Number.isFinite(size.height)) {
            tableEditorDialog.style.setProperty('--table-editor-height', `${size.height}px`);
        }
        updateTableEditorResizeHandle();
    }
    
    /** Applies the requested table-editor dimension for the current layout. */
    function setTableEditorSize(value) {
        const { isBottomLayout, min, max } = getTableEditorSizeMetrics();
        const nextValue = Math.max(min, Math.min(value, max));
        const name = isBottomLayout ? 'height' : 'width';
        tableEditorDialog.style.setProperty(`--table-editor-${name}`, `${nextValue}px`);
        tableEditorResizeHandle.setAttribute('aria-valuenow', String(Math.round(nextValue)));
        updateTableEditorToastPosition();
        return { name, value: nextValue };
    }
    
    /** Starts table editor resize. */
    function startTableEditorResize(event) {
        if (event.button !== 0 || tableEditorDialog.classList.contains('table-editor-fullscreen')) {
            return;
        }
        event.preventDefault();
        tableEditorResizeHandle.setPointerCapture(event.pointerId);
        tableEditorDialog.classList.add('table-editor-resizing');
        updateTableEditorSnapGuides();
    
        const resize = (moveEvent) => {
            const rawValue = tableEditorBottomLayoutQuery.matches
                ? window.innerHeight - moveEvent.clientY
                : window.innerWidth - moveEvent.clientX;
            const value = snapTableEditorSize(rawValue);
            setTableEditorSize(value);
            showActiveTableEditorSnap(value);
        };
        const finish = () => {
            tableEditorDialog.classList.remove('table-editor-resizing');
            showActiveTableEditorSnap(Number.NaN);
            tableEditorResizeHandle.removeEventListener('pointermove', resize);
            tableEditorResizeHandle.removeEventListener('pointerup', finish);
            tableEditorResizeHandle.removeEventListener('pointercancel', finish);
            tableEditorResizeHandle.removeEventListener('lostpointercapture', finish);
            const isBottomLayout = tableEditorBottomLayoutQuery.matches;
            storeTableEditorSize(isBottomLayout ? 'height' : 'width', isBottomLayout ? tableEditorDialog.offsetHeight : tableEditorDialog.offsetWidth);
        };
        tableEditorResizeHandle.addEventListener('pointermove', resize);
        tableEditorResizeHandle.addEventListener('pointerup', finish);
        tableEditorResizeHandle.addEventListener('pointercancel', finish);
        tableEditorResizeHandle.addEventListener('lostpointercapture', finish);
    }
    
    /** Handles table editor resize keydown. */
    function handleTableEditorResizeKeydown(event) {
        const isBottomLayout = tableEditorBottomLayoutQuery.matches;
        const direction = isBottomLayout
            ? { ArrowUp: 1, ArrowDown: -1 }[event.key]
            : { ArrowLeft: 1, ArrowRight: -1 }[event.key];
        if (!direction) {
            return;
        }
        event.preventDefault();
        const current = isBottomLayout ? tableEditorDialog.offsetHeight : tableEditorDialog.offsetWidth;
        const result = setTableEditorSize(current + direction * (event.shiftKey ? 50 : 10));
        storeTableEditorSize(result.name, result.value);
    }
    
    /** Toggles table editor fullscreen. */
    function toggleTableEditorFullscreen() {
        const fullscreen = tableEditorDialog.classList.toggle('table-editor-fullscreen');
        tableEditorFullscreenBtn.setAttribute('aria-pressed', String(fullscreen));
        tableEditorFullscreenBtn.textContent = fullscreen ? 'Exit fullscreen' : 'Fullscreen';
        updateTableEditorResizeHandle();
        updateTableEditorToastPosition();
    }
    
    /** Shows option tooltip. */
    function showOptionTooltip(button) {
        if (!optionTooltip || !button) {
            return;
        }
    
        optionTooltip.textContent = button.dataset.tooltip || '';
        optionTooltip.hidden = false;
    
        const buttonRect = button.getBoundingClientRect();
        const tooltipRect = optionTooltip.getBoundingClientRect();
        const viewportPadding = 8;
        const centeredLeft = buttonRect.left + (buttonRect.width - tooltipRect.width) / 2;
        const maxLeft = window.innerWidth - tooltipRect.width - viewportPadding;
        const left = Math.max(viewportPadding, Math.min(centeredLeft, maxLeft));
        const above = buttonRect.top - tooltipRect.height - viewportPadding;
        const preferredTop = above >= viewportPadding ? above : buttonRect.bottom + viewportPadding;
        const maxTop = window.innerHeight - tooltipRect.height - viewportPadding;
        const top = Math.max(viewportPadding, Math.min(preferredTop, maxTop));
    
        optionTooltip.style.left = `${left}px`;
        optionTooltip.style.top = `${top}px`;
    }
    
    /** Hides option tooltip. */
    function hideOptionTooltip() {
        if (optionTooltip) {
            optionTooltip.hidden = true;
        }
    }
    
    /** Opens table editor. */
    function openTableEditor(index = 0, options = {}) {
        const items = getTableEditorItems();
    
        if (!tableEditorDialog || items.length === 0) {
            addProcessingLog('No tables available to edit.', 'warning');
            return;
        }
    
        tableEditorPreviewCleanup = options.previewCleanup !== false;
        tableEditorPreviousFocus = document.activeElement;
        tableEditorDialog.hidden = false;
        applyStoredTableEditorSize();
        if (toastRegion) {
            toastRegion.classList.add('table-editor-open');
            updateTableEditorToastPosition();
        }
    
        syncTableEditorFrenchOption();
        renderTableEditor(index);
    
        const firstSuggestedField = [tableEditorNumber, tableEditorCaption, tableEditorUnit]
            .find((field) => field && field.hasAttribute('data-caption-suggestion'));
        const initialField = firstSuggestedField || tableEditorCaption;
    
        if (initialField) {
            initialField.focus();
        }
    }
    
    /** Closes table editor. */
    function closeTableEditor() {
        if (!tableEditorDialog || tableEditorDialog.hidden) {
            return;
        }
    
        tableEditorDialog.hidden = true;
        tableEditorDialog.classList.remove('table-editor-fullscreen');
        if (tableEditorFullscreenBtn) {
            tableEditorFullscreenBtn.setAttribute('aria-pressed', 'false');
            tableEditorFullscreenBtn.textContent = 'Fullscreen';
        }
        hideOptionTooltip();
        if (toastRegion) {
            toastRegion.classList.remove('table-editor-open');
        }
        if (tableEditorCanvas) {
            tableEditorCanvas.innerHTML = '';
        }
        setTableEditorScopingMode(false);
        tableEditorPreviewCleanup = false;
        if (tableEditorPreviousFocus && typeof tableEditorPreviousFocus.focus === 'function') {
            tableEditorPreviousFocus.focus();
        }
        tableEditorPreviousFocus = null;
    }
    
    /** Removes empty footer placeholder. */
    function removeEmptyFooterPlaceholder(event) {
        if (event.inputType !== 'insertText' || event.data === null) {
            return;
        }
    
        const placeholder = getEmptyFooterPlaceholderAtSelection();
    
        if (!placeholder) {
            return;
        }
    
        event.preventDefault();
        replaceEmptyFooterPlaceholder(placeholder, event.data);
    }
    
    /** Replaces empty footer placeholder on paste. */
    function replaceEmptyFooterPlaceholderOnPaste(event) {
        const placeholder = getEmptyFooterPlaceholderAtSelection();
    
        if (!placeholder || !event.clipboardData) {
            return;
        }
    
        event.preventDefault();
        replaceEmptyFooterPlaceholder(placeholder, event.clipboardData.getData('text/plain'));
    }
    
    /** Returns empty footer paragraph at selection. */
    function getEmptyFooterPlaceholderAtSelection() {
        const selection = getEditorSelection(tableEditorCanvas);
        const placeholder = selection && selection.rangeCount > 0
            ? getClosestElement(selection.anchorNode, tableEditorCanvas, 'tfoot p, tfoot td')
            : null;
    
        return placeholder && placeholder.textContent === '\u00a0' ? placeholder : null;
    }
    
    /** Replaces empty footer placeholder. */
    function replaceEmptyFooterPlaceholder(paragraph, text) {
        paragraph.textContent = text;
    
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        range.collapse(false);
        const selection = getEditorSelection(tableEditorCanvas);
        selection.removeAllRanges();
        selection.addRange(range);
    
        paragraph.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            data: text,
            inputType: 'insertText'
        }));
    }
    
    /** Handles table editor dialog keydown. */
    function handleTableEditorDialogKeydown(event) {
        if (!tableEditorDialog || tableEditorDialog.hidden) {
            return;
        }
    
        if (handleTableEditorHistoryShortcut(event)) {
            return;
        }
    
        const key = (event.key || '').toLowerCase();
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && key === 'b') {
            event.preventDefault();
            event.stopPropagation();
            boldTableEditorSelection();
            return;
        }
    
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            handleTableEditorEscape();
            return;
        }
    
        if (event.key !== 'Tab') {
            return;
        }
    
        const focusableElements = getFocusableElements(tableEditorDialog);
        if (focusableElements.length === 0) {
            return;
        }
    
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
    
        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
            return;
        }
    
        if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }
    
    /** Applies bold formatting to table editor selection. */
    function boldTableEditorSelection() {
        runTableEditorMutation(toggleTableEditorBold, 'Bold');
    }
    
    /** Handles table editor history shortcut. */
    function handleTableEditorHistoryShortcut(event) {
        const key = (event.key || '').toLowerCase();
        const isUndo = key === 'z' && !event.shiftKey;
        const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey);
        if (!(event.ctrlKey || event.metaKey) || event.altKey || (!isUndo && !isRedo)) {
            return false;
        }
    
        event.preventDefault();
        event.stopPropagation();
        if (isRedo) {
            redoTableEditorChange();
        } else {
            undoTableEditorChange();
        }
        return true;
    }
    
    /** Returns table editor snapshot. */
    function getTableEditorSnapshot() {
        if (!tableEditorCanvas) {
            return null;
        }
    
        const clone = tableEditorCanvas.cloneNode(true);
        clearScopeVisualization(clone);
        clone.querySelectorAll('.selected').forEach((cell) => cell.classList.remove('selected'));
        return {
            html: clone.innerHTML,
            complexScoping: Boolean(tableEditorComplexScoping && tableEditorComplexScoping.checked),
            financial: Boolean(tableEditorFinancial && tableEditorFinancial.checked),
            french: Boolean(tableEditorFrench && tableEditorFrench.checked),
            acceptedExternalCaptionNodes: Array.from(tableEditorAcceptedExternalCaptionNodes)
        };
    }
    
    /** Reports whether two table-editor snapshots contain equivalent state. */
    function tableEditorSnapshotsEqual(first, second) {
        if (!first || !second) {
            return false;
        }
    
        const firstAccepted = first.acceptedExternalCaptionNodes || [];
        const secondAccepted = second.acceptedExternalCaptionNodes || [];
    
        return first.html === second.html
            && first.complexScoping === second.complexScoping
            && first.financial === second.financial
            && first.french === second.french
            && firstAccepted.length === secondAccepted.length
            && firstAccepted.every((node) => secondAccepted.includes(node));
    }
    
    /** Reinitializes table-editor history from the current table. */
    function resetTableEditorHistory() {
        window.clearTimeout(tableEditorHistoryTimer);
        tableEditorPendingAction = null;
        tableEditorHistory = [];
        tableEditorHistoryIndex = -1;
        commitTableEditorHistory('Open table editor');
    }
    
    /** Schedules table editor history commit. */
    function scheduleTableEditorHistoryCommit(actionLabel = 'Edit table') {
        window.clearTimeout(tableEditorHistoryTimer);
        tableEditorPendingAction = actionLabel;
        tableEditorHistoryTimer = window.setTimeout(() => {
            commitTableEditorHistory(tableEditorPendingAction);
            tableEditorPendingAction = null;
        }, 350);
    }
    
    /** Runs a table mutation and records it as one table-editor history action. */
    function runTableEditorMutation(callback, actionLabel) {
        window.clearTimeout(tableEditorHistoryTimer);
        commitTableEditorHistory(tableEditorPendingAction);
        tableEditorPendingAction = null;
        callback();
        commitTableEditorHistory(actionLabel);
    }

    /** Records a switch and its resulting table cleanup as one history entry. */
    function applyTableOptionChange(field, action) {
        const nextChecked = field.checked;

        window.clearTimeout(tableEditorHistoryTimer);
        field.checked = !nextChecked;
        commitTableEditorHistory(tableEditorPendingAction);
        tableEditorPendingAction = null;

        field.checked = nextChecked;
        recleanTableEditorTable();
        commitTableEditorHistory(action);
        showTableOptionToast(action, 'Applied');
    }
    
    /** Adds the current table-editor snapshot when it differs from the active entry. */
    function commitTableEditorHistory(actionLabel = 'Edit table') {
        if (tableEditorHistoryRestoring) {
            return;
        }
    
        window.clearTimeout(tableEditorHistoryTimer);
        const snapshot = getTableEditorSnapshot();
        if (!snapshot || tableEditorSnapshotsEqual(snapshot, tableEditorHistory[tableEditorHistoryIndex])) {
            return;
        }
    
        snapshot.action = actionLabel || 'Edit table';
        tableEditorHistory.splice(tableEditorHistoryIndex + 1);
        tableEditorHistory.push(snapshot);
        if (tableEditorHistory.length > 100) {
            tableEditorHistory.shift();
        }
        tableEditorHistoryIndex = tableEditorHistory.length - 1;
        updateTableEditorHistoryButtons();
    }
    
    /** Undoes table editor change. */
    function undoTableEditorChange() {
        commitTableEditorHistory(tableEditorPendingAction);
        tableEditorPendingAction = null;
        if (tableEditorHistoryIndex <= 0) {
            return;
        }
        const undoneAction = tableEditorHistory[tableEditorHistoryIndex].action || 'Edit table';
        restoreTableEditorHistory(tableEditorHistoryIndex - 1);
        restoreFocusAfterTableSuggestionUndo(undoneAction);
        if (!showTableOptionToast(undoneAction, 'Undo')) {
            showActivityToast(`Undid ${undoneAction}.`, 'success', 'Table undo');
        }
    }
    
    /** Restores focus after table suggestion undo. */
    function restoreFocusAfterTableSuggestionUndo(action) {
        const match = /^Add suggested table (number|title|unit)$/.exec(action || '');
        if (!match) {
            return;
        }
    
        const field = match[1] === 'number'
            ? tableEditorNumber
            : match[1] === 'title'
                ? tableEditorCaption
                : tableEditorUnit;
    
        if (!field) {
            return;
        }
    
        field.focus();
        if (field.hasAttribute('data-caption-suggestion')) {
            field.select();
        }
    }
    
    /** Redoes table editor change. */
    function redoTableEditorChange() {
        if (tableEditorHistoryIndex >= tableEditorHistory.length - 1) {
            return;
        }
        const nextIndex = tableEditorHistoryIndex + 1;
        const redoneAction = tableEditorHistory[nextIndex].action || 'Edit table';
        restoreTableEditorHistory(nextIndex);
        if (!showTableOptionToast(redoneAction, 'Redo')) {
            showActivityToast(`Redid ${redoneAction}.`, 'success', 'Table redo');
        }
    }

    /** Shows one option-aware message after applying, undoing, or redoing a switch change. */
    function showTableOptionToast(action, phase) {
        const option = action === 'table.option.financial'
            ? {
                name: 'Financial table',
                enabled: Boolean(tableEditorFinancial && tableEditorFinancial.checked)
            }
            : action === 'table.option.complexScoping'
                ? {
                    name: 'Complex scoping',
                    enabled: Boolean(tableEditorComplexScoping && tableEditorComplexScoping.checked)
                }
            : action === 'table.option.french'
                ? {
                    name: 'French number format',
                    enabled: Boolean(tableEditorFrench && tableEditorFrench.checked)
                }
                : null;

        if (!option) {
            return false;
        }

        const state = option.enabled ? 'on' : 'off';
        showActivityToast(`${phase}: ${option.name} turned ${state}.`, 'success', 'Table option');
        return true;
    }
    
    /** Restores a table-editor snapshot, fields, selection state, and history controls. */
    function restoreTableEditorHistory(index) {
        const snapshot = tableEditorHistory[index];
        if (!snapshot || !tableEditorCanvas) {
            return;
        }
    
        tableEditorHistoryRestoring = true;
        tableEditorHistoryIndex = index;
        tableEditorCanvas.innerHTML = snapshot.html;
        tableEditorScopeParent = null;
        if (tableEditorComplexScoping) {
            tableEditorComplexScoping.checked = snapshot.complexScoping;
        }
        if (tableEditorFinancial) {
            tableEditorFinancial.checked = snapshot.financial;
        }
        if (tableEditorFrench) {
            tableEditorFrench.checked = snapshot.french;
        }
        tableEditorAcceptedExternalCaptionNodes = new Set(snapshot.acceptedExternalCaptionNodes || []);
        tableEditorLastSelectedCell = null;
        loadTableEditorCaptionFields();
        loadTableEditorCaptionSuggestions(getTableEditorItems()[tableEditorIndex], false);
        tableEditorHistoryRestoring = false;
        updateTableEditorHistoryButtons();
        refreshScopeVisualization();
    }
    
    /** Refreshes table editor history buttons. */
    function updateTableEditorHistoryButtons() {
        if (tableEditorUndoBtn) {
            tableEditorUndoBtn.disabled = tableEditorHistoryIndex <= 0;
        }
        if (tableEditorRedoBtn) {
            tableEditorRedoBtn.disabled = tableEditorHistoryIndex >= tableEditorHistory.length - 1;
        }
    }
    
    /** Handles table editor escape. */
    function handleTableEditorEscape() {
        if (!tableEditorDialog || tableEditorDialog.hidden) {
            return;
        }
    
        if (getTableEditorSelectedCells().length > 0) {
            deselectTableEditorCells();
            return;
        }
    
        closeTableEditor();
    }
    
    /** Reports whether a table is retained only as part of a converted component. */
    function isConvertedComponentTable(table) {
        return Boolean(table?.matches('[data-propel-component-source="true"]') || table?.closest('figure.panel.panel-default, .component-text-version'));
    }

    /** Returns tables that remain available to the table editor. */
    function getEditableTables(root) {
        return Array.from(root?.querySelectorAll('table') || []).filter(table => !isConvertedComponentTable(table));
    }

    /** Returns table editor items. */
    function getTableEditorItems() {
        return getEditableTables(inputHTML).map((table) => {
            return {
                table,
                container: table.closest('div.table-responsive') || table
            };
        });
    }
    
    /** Returns live table index. */
    function getLiveTableIndex(liveTable) {
        if (!liveEditor || !liveTable) {
            return 0;
        }
    
        return getEditableTables(liveEditor).indexOf(liveTable);
    }
    
    /** Handles live editor table hover. */
    function handleLiveEditorTableHover(event) {
        if (isLiveEditorSelectingText() || hasLiveEditorTextSelection()) {
            hideLiveTableEditPopover();
            return;
        }
    
        const table = getClosestElement(event.target, liveEditor, 'table');

        if (!table || isConvertedComponentTable(table)) {
            hideLiveTableEditPopover();
            return;
        }
    
        liveTableEditTarget = table;
        positionLiveTableEditPopover();
    }
    
    /** Reports whether live editor text selection. */
    function hasLiveEditorTextSelection() {
        const selection = getEditorSelection(liveEditor);
    
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return false;
        }
    
        return liveEditor.contains(selection.anchorNode) || liveEditor.contains(selection.focusNode);
    }
    
    /** Positions the table edit control beside the hovered Live table. */
    function positionLiveTableEditPopover() {
        if (!liveEditor || !liveTableEditPopover || !liveTableEditTarget || !liveEditor.contains(liveTableEditTarget)) {
            return;
        }
    
        const hostRect = liveEditorHost.getBoundingClientRect();
        const tableRect = liveTableEditTarget.getBoundingClientRect();
        liveTableEditPopover.classList.add('visible');
    
        const top = Math.max(8, tableRect.top - hostRect.top + 8);
        const left = Math.max(8, tableRect.right - hostRect.left - liveTableEditPopover.offsetWidth - 8);
    
        liveTableEditPopover.style.top = `${top}px`;
        liveTableEditPopover.style.left = `${left}px`;
        if (liveTableComponentPopover) {
            liveTableComponentPopover.classList.add('visible');
            liveTableComponentPopover.style.top = `${top + liveTableEditPopover.offsetHeight + 6}px`;
            liveTableComponentPopover.style.left = `${Math.max(8, tableRect.right - hostRect.left - liveTableComponentPopover.offsetWidth - 8)}px`;
        }
    }
    
    /** Hides live table edit popover. */
    function hideLiveTableEditPopover() {
        liveTableEditTarget = null;
    
        if (!liveTableEditPopover) {
            return;
        }
    
        liveTableEditPopover.classList.remove('visible');
        liveTableComponentPopover?.classList.remove('visible');
    }
    
    /** Opens hovered live table editor. */
    function openHoveredLiveTableEditor(event) {
        event.preventDefault();
        event.stopPropagation();
    
        if (!liveTableEditTarget) {
            return;
        }
    
        syncLiveToInputHTML();
        openTableEditor(getLiveTableIndex(liveTableEditTarget));
        hideLiveTableEditPopover();
    }

    /** Opens the shared component library for the hovered table. */
    function openHoveredLiveTableComponentLibrary(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!liveTableEditTarget || typeof openComponentLibraryForTable !== 'function') return;
        const target = liveTableEditTarget;
        openComponentLibraryForTable({
            html: target.outerHTML,
            anchor: liveTableComponentPopover,
            apply(convertedHTML) {
                target.outerHTML = convertedHTML;
                syncLiveToInputHTML();
                commitTableChanges();
            }
        });
        liveTableEditTarget = null;
        liveTableEditPopover?.classList.remove('visible');
        liveTableComponentPopover?.classList.remove('visible');
    }
    
    /** Renders table editor. */
    function renderTableEditor(index) {
        const items = getTableEditorItems();
    
        if (!tableEditorCanvas || items.length === 0) {
            return;
        }
    
        tableEditorIndex = Math.min(Math.max(index, 0), items.length - 1);
        const item = items[tableEditorIndex];
        const clone = item.container.cloneNode(true);
        preserveExistingHeaderRelationships(clone.matches('table') ? clone : clone.querySelector('table'));
    
        clone.querySelectorAll('.selected').forEach((element) => element.classList.remove('selected'));
        tableEditorCanvas.innerHTML = '';
        tableEditorCanvas.appendChild(clone);
        tableEditorScopeParent = null;
    
        const sourceTable = item.container.matches('table') ? item.container : item.container.querySelector('table');
        if (shouldRunInitialTableCleanup(sourceTable, tableEditorPreviewCleanup, isCleanedTable)) {
            const table = getTableEditorTable();
            if (table) {
                cleanupTable(table, getTableEditorOptions());
                applyCurrentTableScopes(table);
            }
        }
    
        loadTableEditorCaptionFields();
        loadTableEditorCaptionSuggestions(item);
        updateTableEditorStatus(items.length);
        resetTableEditorHistory();
        scrollLiveToTableEditorTable();
        refreshScopeVisualization();
    }
    
    /** Scrolls live to table editor table. */
    function scrollLiveToTableEditorTable() {
        if (!liveEditor) {
            return;
        }
    
        const liveTable = getEditableTables(liveEditor)[tableEditorIndex];
        if (liveTable) {
            scrollLiveElementIntoView(liveTable);
        }
    }
    
    /** Refreshes table editor status. */
    function updateTableEditorStatus(tableCount = getTableEditorItems().length) {
        if (tableEditorStatus) {
            tableEditorStatus.textContent = `Table ${tableEditorIndex + 1} of ${tableCount}. Use the Live view Edit table button or double-click a table to edit it here.`;
        }
        if (tableEditorFirstBtn) {
            tableEditorFirstBtn.disabled = tableEditorIndex <= 0;
        }
        if (tableEditorPrevBtn) {
            tableEditorPrevBtn.disabled = tableEditorIndex <= 0;
        }
        if (tableEditorNextBtn) {
            tableEditorNextBtn.disabled = tableEditorIndex >= tableCount - 1;
        }
        if (tableEditorLastBtn) {
            tableEditorLastBtn.disabled = tableEditorIndex >= tableCount - 1;
        }
        if (tableEditorApplyNextBtn) {
            tableEditorApplyNextBtn.disabled = tableEditorIndex >= tableCount - 1;
            tableEditorApplyNextBtn.hidden = tableEditorIndex >= tableCount - 1;
        }
        renderTableEditorPagination(tableCount);
    }
    
    /** Renders table editor pagination. */
    function renderTableEditorPagination(tableCount) {
        if (!tableEditorPages) {
            return;
        }
    
        tableEditorPages.innerHTML = '';
        let activeButton = null;
    
        for (let index = 0; index < tableCount; index++) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'table-editor-page-btn';
            button.textContent = String(index + 1);
            button.setAttribute('aria-label', `Edit table ${index + 1}`);
    
            if (index === tableEditorIndex) {
                button.classList.add('active');
                button.setAttribute('aria-current', 'page');
                activeButton = button;
            }
    
            button.addEventListener('click', () => {
                renderTableEditor(index);
            });
    
            tableEditorPages.appendChild(button);
        }
    
        if (activeButton) {
            requestAnimationFrame(() => {
                if (!activeButton.isConnected) {
                    return;
                }
    
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                activeButton.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            });
        }
    }
    
    /** Returns table editor table. */
    function getTableEditorTable() {
        return tableEditorCanvas ? tableEditorCanvas.querySelector('table') : null;
    }
    
    /** Returns table editor container. */
    function getTableEditorContainer() {
        if (!tableEditorCanvas) {
            return null;
        }
    
        return tableEditorCanvas.querySelector('div.table-responsive') || getTableEditorTable();
    }
    
    /** Loads table editor caption fields. */
    function loadTableEditorCaptionFields() {
        const table = getTableEditorTable();
        const caption = table ? table.querySelector(':scope > caption') : null;
    
        if (!tableEditorNumber || !tableEditorCaption || !tableEditorUnit) {
            return;
        }
    
        tableEditorNumber.value = '';
        tableEditorCaption.value = '';
        tableEditorUnit.value = '';
    
        if (!caption) {
            return;
        }
    
        const numberText = Array.from(caption.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.nodeValue)
            .join(' ')
            .trim();
    
        const strong = caption.querySelector('strong');
        const small = caption.querySelector('small');
    
        tableEditorNumber.value = numberText;
        tableEditorCaption.value = strong ? strong.textContent.trim() : '';
        tableEditorUnit.value = small ? small.textContent.trim() : '';
    }
    
    /** Loads table editor caption suggestions. */
    function loadTableEditorCaptionSuggestions(item, resetAcceptedNodes = true) {
        tableEditorCaptionSuggestions = findTableCaptionSuggestions(item);
        if (resetAcceptedNodes) {
            tableEditorAcceptedExternalCaptionNodes = new Set();
        }
    
        renderTableCaptionSuggestion('number', tableEditorNumberSuggestion, tableEditorNumber);
        renderTableCaptionSuggestion('title', tableEditorCaptionSuggestion, tableEditorCaption);
        renderTableCaptionSuggestion('unit', tableEditorUnitSuggestion, tableEditorUnit);
    }
    
    /** Renders table caption suggestion. */
    function renderTableCaptionSuggestion(type, host, field) {
        if (!host || !field) {
            return;
        }
    
        const suggestion = tableEditorCaptionSuggestions[type];
        host.hidden = !suggestion || Boolean(field.value.trim());
    
        if (host.hidden) {
            field.removeAttribute('data-caption-suggestion');
            return;
        }
    
        field.value = suggestion.text;
        field.setAttribute('data-caption-suggestion', type);
        host.onclick = () => acceptTableCaptionSuggestion(type, field, host);
    }
    
    /** Dismisses the suggestion associated with a caption field. */
    function dismissPendingTableCaptionSuggestion(field) {
        if (!field || !field.hasAttribute('data-caption-suggestion')) {
            return;
        }
    
        field.value = '';
        field.removeAttribute('data-caption-suggestion');
        const suggestionHost = field === tableEditorNumber
            ? tableEditorNumberSuggestion
            : field === tableEditorCaption
                ? tableEditorCaptionSuggestion
                : tableEditorUnitSuggestion;
        if (suggestionHost) {
            suggestionHost.hidden = true;
        }
    }
    
    /** Copies an accepted caption suggestion into its destination field. */
    function acceptTableCaptionSuggestion(type, field, host) {
        const suggestion = tableEditorCaptionSuggestions[type];
        if (!suggestion) {
            return;
        }
    
        field.value = suggestion.text;
        field.removeAttribute('data-caption-suggestion');
        if (suggestion.sourceType === 'table') {
            const section = suggestion.node.parentElement;
            suggestion.node.remove();
            if (section && !section.querySelector('tr')) {
                section.remove();
            }
            recleanTableEditorTable();
        } else {
            tableEditorAcceptedExternalCaptionNodes.add(suggestion.node);
        }
        host.hidden = true;
        updateTableEditorCaption();
        commitTableEditorHistory(`Add suggested table ${type}`);
    }
    
    /** Finds nearby document content that can populate table caption fields. */
    function findTableCaptionSuggestions(item) {
        const candidates = [];
        const table = getTableEditorTable();
    
        if (!item || !table) {
            return {};
        }
    
        let sibling = item.container.previousElementSibling;
        while (sibling && candidates.length < 3 && sibling.matches('p, h1, h2, h3, h4, h5, h6, div')) {
            const text = sibling.textContent.replace(/\s+/g, ' ').trim();
            if (!text || sibling.querySelector('table')) {
                break;
            }
            candidates.unshift({ node: sibling, sourceType: 'document', text });
            sibling = sibling.previousElementSibling;
        }
    
        Array.from(table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr')).slice(0, 3).forEach((row) => {
            const cells = row.querySelectorAll(':scope > th, :scope > td');
            if (cells.length !== 1) {
                return;
            }
            const text = cells[0].textContent.replace(/\s+/g, ' ').trim();
            if (text) {
                candidates.push({ node: row, sourceType: 'table', text });
            }
        });
    
        const suggestions = {};
        const groups = ['document', 'table'].map((sourceType) => (
            candidates.filter((candidate) => candidate.sourceType === sourceType)
        ));
        let fallbackUnit = null;

        for (const group of groups) {
            const classification = classifyTableCaptionLabels(group.map((candidate) => candidate.text));
            if (classification.unit !== undefined && !fallbackUnit) {
                fallbackUnit = group[classification.unit];
            }
            if (classification.number === undefined) {
                continue;
            }

            suggestions.number = group[classification.number];
            if (classification.title !== undefined && group[classification.title].text.length <= 240) {
                suggestions.title = group[classification.title];
            }
            if (classification.unit !== undefined) {
                suggestions.unit = group[classification.unit];
            }
            break;
        }

        suggestions.unit ||= fallbackUnit;

        // Preserve the prior fallback for an explicit unit next to a free-form title.
        if (!suggestions.title && suggestions.unit) {
            suggestions.title = candidates.find((candidate) => (
                candidate !== suggestions.unit && candidate.text.length <= 240
            ));
        }
    
        return suggestions;
    }
    
    /** Refreshes table editor caption. */
    function updateTableEditorCaption() {
        const table = getTableEditorTable();
    
        if (!table) {
            return;
        }
    
        const numberValue = tableEditorNumber && !tableEditorNumber.hasAttribute('data-caption-suggestion') ? tableEditorNumber.value.trim() : '';
        const titleValue = tableEditorCaption && !tableEditorCaption.hasAttribute('data-caption-suggestion') ? tableEditorCaption.value.trim() : '';
        const unitValue = tableEditorUnit && !tableEditorUnit.hasAttribute('data-caption-suggestion') ? tableEditorUnit.value.trim() : '';
        let caption = table.querySelector(':scope > caption');
    
        if (!numberValue && !titleValue && !unitValue) {
            if (caption) {
                caption.remove();
            }
            return;
        }
    
        if (!caption) {
            caption = document.createElement('caption');
            caption.classList.add('text-left', 'fnt-nrml');
            table.insertBefore(caption, table.firstElementChild);
        }
    
        caption.textContent = '';
    
        if (numberValue) {
            caption.appendChild(document.createTextNode(numberValue));
        }
        if (titleValue) {
            if (numberValue) {
                caption.appendChild(document.createElement('br'));
            }
            const strong = document.createElement('strong');
            strong.textContent = titleValue;
            caption.appendChild(strong);
        }
        if (unitValue) {
            if (numberValue || titleValue) {
                caption.appendChild(document.createElement('br'));
            }
            const small = document.createElement('small');
            small.textContent = unitValue;
            caption.appendChild(small);
        }
    }
    
    /** Handles table editor canvas click. */
    function handleTableEditorCanvasClick(event) {
        const cell = event.target && event.target.closest ? event.target.closest('th, td') : null;
    
        if (!cell || !tableEditorCanvas.contains(cell)) {
            return;
        }

        if (tableEditorScopingMode) {
            event.preventDefault();
            if (!tableEditorScopeParent && cell.tagName.toLowerCase() === 'th') {
                tableEditorScopeParent = cell;
                refreshScopeVisualization();
                showActivityToast('Parent selected. Paint child cells by clicking or dragging.', 'success', 'Scoping mode');
            } else if (cell === tableEditorScopeParent) {
                tableEditorScopeParent = null;
                refreshScopeVisualization();
            }
            return;
        }
    
        if (tableEditorIsDragging) {
            return;
        }
    
        if (event.shiftKey && tableEditorLastSelectedCell) {
            event.preventDefault();
            selectTableEditorCellRange(tableEditorLastSelectedCell, cell, event.metaKey || event.ctrlKey);
            tableEditorLastSelectedCell = cell;
            clearTableEditorTextSelectionForMultiCellSelection();
            return;
        }
    
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
            deselectTableEditorCells(cell);
        }
    
        cell.classList.toggle('selected');
        tableEditorLastSelectedCell = cell;
        clearTableEditorTextSelectionForMultiCellSelection();
    }
    
    /** Handles table editor canvas mouse down. */
    function handleTableEditorCanvasMouseDown(event) {
        const cell = event.target && event.target.closest ? event.target.closest('th, td') : null;
    
        if (!cell || !tableEditorCanvas.contains(cell)) {
            return;
        }

        if (tableEditorScopingMode) {
            event.preventDefault();
            if (!tableEditorScopeParent || cell === tableEditorScopeParent) return;
            tableEditorScopePaintEnabled = !hasHeaderRelationship(tableEditorScopeParent, cell);
            paintTableEditorScopeCell(cell);
            tableEditorDragStartCell = cell;
            tableEditorIsDragging = false;
            return;
        }
    
        tableEditorDragStartCell = cell;
        tableEditorIsDragging = false;
    }
    
    /** Handles table editor canvas mouse over. */
    function handleTableEditorCanvasMouseOver(event) {
        const cell = event.target && event.target.closest ? event.target.closest('th, td') : null;
    
        if (!cell || !tableEditorDragStartCell || !tableEditorCanvas.contains(cell)) {
            return;
        }

        if (tableEditorScopingMode) {
            event.preventDefault();
            tableEditorIsDragging = true;
            paintTableEditorScopeCell(cell);
            return;
        }
    
        if (cell === tableEditorDragStartCell && !tableEditorIsDragging) {
            return;
        }
    
        event.preventDefault();
        tableEditorIsDragging = true;
        selectTableEditorCellRange(tableEditorDragStartCell, cell, false);
        tableEditorLastSelectedCell = cell;
        clearTableEditorTextSelectionForMultiCellSelection();
    }
    
    /** Handles table editor document mouse up. */
    function handleTableEditorDocumentMouseUp() {
        const paintedScope = tableEditorScopingMode && tableEditorScopePaintEnabled !== null;
        tableEditorDragStartCell = null;
        tableEditorScopePaintEnabled = null;

        if (paintedScope) {
            commitTableEditorHistory('Paint scoping relationship');
            refreshScopeVisualization();
        }
    
        if (!tableEditorIsDragging) {
            return;
        }
    
        window.setTimeout(() => {
            tableEditorIsDragging = false;
            clearTableEditorTextSelectionForMultiCellSelection();
        }, 0);
    }

    /** Enables or disables relationship painting in the table preview. */
    function toggleTableEditorScopingMode() {
        setTableEditorScopingMode(!tableEditorScopingMode);
    }

    function setTableEditorScopingMode(enabled) {
        tableEditorScopingMode = Boolean(enabled);
        tableEditorScopeParent = null;
        tableEditorScopePaintEnabled = null;
        if (tableEditorScopingMode) {
            if (tableEditorComplexScoping && !tableEditorComplexScoping.checked) {
                tableEditorComplexScoping.checked = true;
                commitTableEditorHistory('Turn on complex scoping');
            }
            applyCurrentTableScopes(getTableEditorTable());
        }
        if (tableEditorScopingModeBtn) tableEditorScopingModeBtn.setAttribute('aria-pressed', String(tableEditorScopingMode));
        if (tableEditorCanvas) {
            tableEditorCanvas.classList.toggle('scoping-mode', tableEditorScopingMode);
            tableEditorCanvas.setAttribute('contenteditable', String(!tableEditorScopingMode));
            tableEditorCanvas.setAttribute('aria-label', tableEditorScopingMode
                ? 'Table scoping editor. Select a parent header, then paint child cells.'
                : 'Editable table');
        }
        refreshScopeVisualization();
    }

    function paintTableEditorScopeCell(cell) {
        if (!tableEditorScopeParent || cell === tableEditorScopeParent) return;
        setManualHeaderRelationship(tableEditorScopeParent, cell, tableEditorScopePaintEnabled);
        refreshScopeVisualization();
    }

    function refreshScopeVisualization() {
        if (!tableEditorCanvas) return;
        clearScopeVisualization(tableEditorCanvas);
        if (!tableEditorScopingMode) return;

        const cells = Array.from(tableEditorCanvas.querySelectorAll('th, td'));
        if (!tableEditorScopeParent) {
            cells.filter((cell) => cell.tagName.toLowerCase() === 'th').forEach((cell, index) => {
                cell.classList.add('scope-parent-candidate');
                cell.style.setProperty('--scope-color', getScopeColor(index));
            });
            return;
        }

        const headers = Array.from(tableEditorCanvas.querySelectorAll('th'));
        const color = getScopeColor(headers.indexOf(tableEditorScopeParent));
        cells.forEach((cell) => {
            cell.style.setProperty('--scope-color', color);
            cell.classList.add(hasHeaderRelationship(tableEditorScopeParent, cell) ? 'scope-child' : 'scope-unrelated');
        });
        tableEditorScopeParent.classList.remove('scope-child', 'scope-unrelated');
        tableEditorScopeParent.classList.add('scope-parent');
    }

    function clearScopeVisualization(root) {
        root.querySelectorAll('.scope-parent, .scope-parent-candidate, .scope-child, .scope-unrelated').forEach((cell) => {
            cell.classList.remove('scope-parent', 'scope-parent-candidate', 'scope-child', 'scope-unrelated');
            cell.style.removeProperty('--scope-color');
            if (!cell.getAttribute('style')) cell.removeAttribute('style');
        });
    }

    function getScopeColor(index) {
        const colors = ['#2563eb', '#7c3aed', '#db2777', '#c2410c', '#047857', '#0369a1'];
        return colors[Math.max(0, index) % colors.length];
    }
    
    /** Clears selection from table editor cells. */
    function deselectTableEditorCells(exceptCell = null) {
        if (!tableEditorCanvas) {
            return;
        }
    
        tableEditorCanvas.querySelectorAll('.selected').forEach((selectedCell) => {
            if (selectedCell !== exceptCell) {
                selectedCell.classList.remove('selected');
            }
        });
        clearTableEditorTextSelectionForMultiCellSelection();
    }
    
    /** Selects table editor cell range. */
    function selectTableEditorCellRange(startCell, endCell, preserveExisting) {
        const startPosition = getTableEditorCellPosition(startCell);
        const endPosition = getTableEditorCellPosition(endCell);
    
        if (!startPosition || !endPosition) {
            return;
        }
    
        if (!preserveExisting) {
            deselectTableEditorCells();
        }
    
        const minRow = Math.min(startPosition.row, endPosition.row);
        const maxRow = Math.max(startPosition.row, endPosition.row);
        const minColumn = Math.min(startPosition.column, endPosition.column);
        const maxColumn = Math.max(startPosition.column, endPosition.column);
    
        getTableEditorCellGrid().forEach((entry) => {
            if (
                entry.row >= minRow &&
                entry.row <= maxRow &&
                entry.column >= minColumn &&
                entry.column <= maxColumn
            ) {
                entry.cell.classList.add('selected');
            }
        });
        clearTableEditorTextSelectionForMultiCellSelection();
    }
    
    /** Clears table editor text selection for multi cell selection. */
    function clearTableEditorTextSelectionForMultiCellSelection() {
        if (getTableEditorSelectedCells().length <= 1) {
            return;
        }
    
        const selection = window.getSelection ? window.getSelection() : null;
    
        if (selection && selection.rangeCount > 0) {
            selection.removeAllRanges();
        }
    }
    
    /** Returns table editor cell position. */
    function getTableEditorCellPosition(cell) {
        return getCellPosition(getTableEditorTable(), cell);
    }
    
    /** Returns table editor cell grid. */
    function getTableEditorCellGrid() {
        return buildCellGrid(getTableEditorTable());
    }
    
    /** Returns table editor selected cells. */
    function getTableEditorSelectedCells() {
        return tableEditorCanvas ? Array.from(tableEditorCanvas.querySelectorAll('th.selected, td.selected')) : [];
    }
    
    /** Returns table editor selected rows. */
    function getTableEditorSelectedRows() {
        const rows = new Set();
    
        getTableEditorSelectedCells().forEach((cell) => {
            const row = cell.closest('tr');
            if (row) {
                rows.add(row);
            }
        });
    
        return Array.from(rows);
    }
    
    /** Returns table editor options. */
    function getTableEditorOptions() {
        return {
            ...defaultTableCleanupOptions,
            financialTable: tableEditorFinancial ? tableEditorFinancial.checked : defaultTableCleanupOptions.financialTable,
            addScope: true,
            addTfoot: false,
            frenchNumbers: tableEditorFrench ? tableEditorFrench.checked : defaultTableCleanupOptions.frenchNumbers
        };
    }

    /** Returns cleanup options that update table settings without repeating import normalization. */
    function getTableEditorRefreshOptions() {
        return {
            ...getTableEditorOptions(),
            trim: false,
            removeBoldFromRowHeaders: false,
            removeAttributes: [],
            unwrapTags: []
        };
    }
    
    /** Re-cleans table editor table. */
    function recleanTableEditorTable() {
        const table = getTableEditorTable();
    
        if (!table) {
            return;
        }
    
        updateTableEditorCaption();
        cleanupTable(table, getTableEditorRefreshOptions());
        applyCurrentTableScopes(table);
    }

    /** Applies the selected simple or complex header association strategy. */
    function applyCurrentTableScopes(table) {
        applyTableScopes(table, {
            complex: tableEditorComplexScoping ? tableEditorComplexScoping.checked : true,
            idRoot: inputHTML,
            renameTag
        });
    }
    
    /** Toggles table editor header rows. */
    function toggleTableEditorHeaderRows() {
        const table = getTableEditorTable();
    
        if (!table) {
            return;
        }
    
        const tbody = table.querySelector('tbody') || table.appendChild(document.createElement('tbody'));
        let thead = table.querySelector('thead');
        if (!thead) {
            thead = document.createElement('thead');
            table.insertBefore(thead, tbody);
        }
    
        getTableEditorSelectedRows().forEach((row) => {
            if (row.closest('thead')) {
                row.classList.remove('bg-dark', 'text-white');
                Array.from(row.querySelectorAll('th, td')).forEach((cell, index) => {
                    const nextCell = index === 0 ? renameTag(cell, 'th') : renameTag(cell, 'td');
                    if (index === 0) {
                        nextCell.setAttribute('scope', 'row');
                    } else {
                        nextCell.removeAttribute('scope');
                    }
                });
                tbody.insertBefore(row, tbody.firstChild);
                return;
            }
    
            row.classList.add('bg-dark', 'text-white');
            row.classList.remove('active');
            Array.from(row.querySelectorAll('th, td')).forEach((cell, index) => {
                const nextCell = renameTag(cell, 'th');
                nextCell.setAttribute('scope', 'col');
                if (tableEditorFinancial && tableEditorFinancial.checked && index > 0) {
                    nextCell.classList.add('text-right');
                } else if (index > 0) {
                    nextCell.classList.remove('text-right');
                }
            });
            thead.appendChild(row);
        });
    }
    
    /** Toggles table editor active rows. */
    function toggleTableEditorActiveRows() {
        toggleRowsActive(getTableEditorSelectedRows());
    }
    
    /** Merges table editor rows. */
    function mergeTableEditorRows() {
        getTableEditorSelectedRows().forEach((row) => {
            Array.from(row.querySelectorAll('th, td')).forEach((cell) => cell.classList.add('selected'));
            mergeTableEditorCellsInRow(row);
        });
    }
    
    /** Merges table editor selected cells. */
    function mergeTableEditorSelectedCells() {
        getTableEditorSelectedRows().forEach(mergeTableEditorCellsInRow);
    }
    
    /** Merges table editor cells in row. */
    function mergeTableEditorCellsInRow(row) {
        const selectedCells = Array.from(row.querySelectorAll('th.selected, td.selected'));
    
        if (selectedCells.length <= 1) {
            return;
        }
    
        const firstCell = selectedCells[0];
        let colspan = Number(firstCell.getAttribute('colspan') || 1);
        let hasMergedContent = Boolean(firstCell.textContent.trim() || firstCell.querySelector('img, table, ul, ol, dl'));
    
        selectedCells.slice(1).forEach((cell) => {
            const hasCellContent = Boolean(cell.textContent.trim() || cell.querySelector('img, table, ul, ol, dl'));
            const mergedContent = document.createDocumentFragment();
    
            if (hasCellContent) {
                if (hasMergedContent) {
                    mergedContent.appendChild(document.createElement('br'));
                }
    
                while (cell.firstChild) {
                    mergedContent.appendChild(cell.firstChild);
                }
    
                firstCell.appendChild(mergedContent);
                hasMergedContent = true;
            }
    
            colspan += Number(cell.getAttribute('colspan') || 1);
            cell.remove();
        });
    
        firstCell.setAttribute('colspan', String(colspan));
        firstCell.classList.add('selected');
    }
    
    /** Adds empty table editor footer. */
    function addEmptyTableEditorFooter() {
        const table = getTableEditorTable();
    
        if (!table) {
            return;
        }
    
        const tfoot = ensureTableEditorTfoot(table);
        const footerRow = document.createElement('tr');
        const footerCell = document.createElement('td');
    
        footerRow.classList.add('small');
        footerCell.setAttribute('colspan', String(getTableEditorWidth(table)));
        if (tableEditorFinancial && tableEditorFinancial.checked) {
            footerCell.textContent = '\u00a0';
        } else {
            const footerParagraph = document.createElement('p');
            footerParagraph.textContent = '\u00a0';
            footerCell.appendChild(footerParagraph);
        }
        footerRow.appendChild(footerCell);
        tfoot.appendChild(footerRow);
    }
    
    /** Moves selected table row contents into footer paragraphs. */
    function moveTableEditorRowsToFooter() {
        const table = getTableEditorTable();
        const selectedRows = getTableEditorSelectedRows();

        moveRowsToTableFooter(table, selectedRows);
    }
    
    /** Returns the table footer, creating it after the body when necessary. */
    function ensureTableEditorTfoot(table) {
        let tfoot = table.querySelector('tfoot');
    
        if (!tfoot) {
            tfoot = document.createElement('tfoot');
            table.appendChild(tfoot);
        }
    
        return tfoot;
    }
    
    /** Changes table editor indent. */
    function changeTableEditorIndent(direction) {
        const levels = ['mrgn-lft-md', 'mrgn-lft-lg', 'mrgn-lft-xl'];
    
        getTableEditorSelectedCells().forEach((cell) => {
            if (cell.tagName.toLowerCase() !== 'th' || !cell.closest('tbody')) {
                return;
            }
    
            let wrapper = getTableEditorIndentWrapper(cell, levels);
            let currentIndex = wrapper ? levels.findIndex((className) => wrapper.classList.contains(className)) : -1;
            const nextIndex = Math.min(Math.max(currentIndex + direction, -1), levels.length - 1);
    
            if (nextIndex === -1) {
                if (wrapper) {
                    unwrapTableEditorIndentWrapper(wrapper);
                }
                return;
            }
    
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.classList.add('text-left', 'fnt-nrml');
                while (cell.firstChild) {
                    wrapper.appendChild(cell.firstChild);
                }
                cell.appendChild(wrapper);
            }
    
            wrapper.classList.remove(...levels);
            wrapper.classList.add(levels[nextIndex], 'text-left', 'fnt-nrml');
        });
    }
    
    /** Returns table editor indent wrapper. */
    function getTableEditorIndentWrapper(cell, levels) {
        return Array.from(cell.children).find((child) => {
            return levels.some((className) => child.classList.contains(className));
        }) || null;
    }
    
    /** Removes an indentation wrapper while preserving its contents. */
    function unwrapTableEditorIndentWrapper(wrapper) {
        const parent = wrapper.parentNode;
    
        while (wrapper.firstChild) {
            parent.insertBefore(wrapper.firstChild, wrapper);
        }
    
        wrapper.remove();
    }
    
    /** Returns table editor width. */
    function getTableEditorWidth(table) {
        return Array.from(table.querySelectorAll('tr')).reduce((width, row) => {
            const rowWidth = Array.from(row.querySelectorAll('th, td')).reduce((total, cell) => {
                return total + Number(cell.getAttribute('colspan') || 1);
            }, 0);
    
            return Math.max(width, rowWidth);
        }, 1);
    }
    
    /** Toggles table editor bold. */
    function toggleTableEditorBold() {
        toggleCellsBold(getTableEditorSelectedCells());
    }
    
    /** Aligns table editor cells. */
    function alignTableEditorCells(alignment) {
        getTableEditorSelectedCells().forEach((cell) => {
            cell.classList.remove('text-center', 'text-right');
    
            if (alignment === 'center') {
                cell.classList.add('text-center');
            }
            if (alignment === 'right') {
                cell.classList.add('text-right');
            }
        });
    }
    
    /** Deletes table editor rows. */
    function deleteTableEditorRows() {
        getTableEditorSelectedRows().forEach((row) => row.remove());
    }
    
    /** Commits the active table edit to canonical document state and optionally advances. */
    function applyTableEditorChanges(moveNext) {
        const items = getTableEditorItems();
        const item = items[tableEditorIndex];
        const editedContainer = getTableEditorContainer();
    
        if (!item || !editedContainer) {
            return;
        }
    
        updateTableEditorCaption();
        applyCurrentTableScopes(getTableEditorTable());
    
        const cleanClone = editedContainer.cloneNode(true);
        clearScopeVisualization(cleanClone);
        cleanClone.querySelectorAll(MANUAL_SCOPE_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(',')).forEach((cell) => {
            MANUAL_SCOPE_ATTRIBUTES.forEach((attribute) => cell.removeAttribute(attribute));
        });
        cleanClone.querySelectorAll('.selected').forEach((element) => {
            element.classList.remove('selected');
            if (element.classList.length === 0) {
                element.removeAttribute('class');
            }
        });
    
        item.container.replaceWith(cleanClone);
        tableEditorAcceptedExternalCaptionNodes.forEach((node) => {
            if (node.parentNode) {
                node.remove();
            }
        });
        tableEditorAcceptedExternalCaptionNodes.clear();
        commitTableChanges();
        addProcessingLog(`Applied edits to table ${tableEditorIndex + 1}.`, 'success');
    
        if (moveNext && tableEditorIndex < getTableEditorItems().length - 1) {
            renderTableEditor(tableEditorIndex + 1);
            return;
        }
    
        closeTableEditor();
    }

    /** Opens the shared component chooser for the table currently being edited. */
    function openActiveTableComponentLibrary() {
        const item = getTableEditorItems()[tableEditorIndex];
        if (!item || typeof openComponentLibraryForTable !== 'function') return;
        openComponentLibraryForTable({
            html: item.container.outerHTML,
            anchor: tableEditorComponentBtn,
            apply(convertedHTML) {
                item.container.outerHTML = convertedHTML;
                commitTableChanges();
                const remainingItems = getTableEditorItems();
                if (remainingItems.length === 0) {
                    closeTableEditor();
                    return;
                }
                renderTableEditor(Math.min(tableEditorIndex, remainingItems.length - 1));
            }
        });
    }

    return {
        createListeners: createTableEditorListeners,
        open: openTableEditor,
        close: closeTableEditor,
        getLiveTableIndex,
        handleLiveTableHover: handleLiveEditorTableHover,
        positionLiveTablePopover: positionLiveTableEditPopover,
        hideLiveTablePopover: hideLiveTableEditPopover,
        openHoveredLiveTable: openHoveredLiveTableEditor,
        handleEscape: handleTableEditorEscape,
        handleHistoryShortcut: handleTableEditorHistoryShortcut,
        syncLanguage: syncTableEditorFrenchOption,
        updateToastPosition: updateTableEditorToastPosition,
        isOpen: () => Boolean(tableEditorDialog && !tableEditorDialog.hidden)
    };
}
