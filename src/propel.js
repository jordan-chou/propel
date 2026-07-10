/**
 * Convert a Word document into HTML code using the Mammoth library.
 * https://github.com/mwilliamson/mammoth.js/
 * 
 * Author: Jordan Chou
 */

/* Import JS */
import { modifyHeadings, modifyFigures, modifyTables, createOnThisPage } from './commands/anchors-aweigh.js';
import { createBodyFtnTags, replaceFootnoteSection } from './commands/footnote-generator.js';
import { splitH1s, createSplitButton } from './commands/split-h1s.js';
import { setInputHTMLForNbsp, fixAllIssues } from './commands/nbsp.js';
import { cleanupTable, defaultTableCleanupOptions, renameTag } from './commands/table-cleanup.js';
import { collapseAll, setCodeTheme, countTags, qaHelperTagsDefault, setUpPresetBtns } from './commands/qa-helper.js';

import { engStrings, frStrings } from './strings.js';
import * as Utils from './util.js';

/* HTML Elements */
const file = document.getElementById('file');
const outputSection = document.getElementById('outputSection');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const topBtn = document.getElementById('topBtn');
const langBtn = document.getElementById('langBtn');

// Anchors Aweigh elements
const onThisPageBox = document.getElementById('onThisPageOption');
const otpSettings = document.getElementById('otpSettings');
const headerDepth = document.getElementById('headerDepth');
const isToC = document.getElementById('isToC');

// QA Helper elements
const countBtn = document.getElementById('qaHelperCountBtn');
const collapseBtn = document.getElementById('collapseBtn');
const lightTheme = document.getElementById('lightTheme');
const darkTheme = document.getElementById('darkTheme');

// Commands section elements
const addIDsBtn = document.getElementById('addIDsBtn');
const footnotesBtn = document.getElementById('footnotesBtn');
const nbspBtn = document.getElementById('nbspBtn');
const tableCleanupBtn = document.getElementById('tableCleanupBtn');
const splitBtn = document.getElementById('splitBtn');
const addIDsSettingsBtn = document.getElementById('addIDsSettingsBtn');
const addIDsSettingsCloseBtn = document.getElementById('addIDsSettingsCloseBtn');
const addIDsApplyBtn = document.getElementById('addIDsApplyBtn');
const addIDsSettingsBackdrop = document.getElementById('addIDsSettingsBackdrop');
const addIDsSettingsParent = otpSettings ? otpSettings.parentNode : null;
const addIDsSettingsNextSibling = otpSettings ? otpSettings.nextSibling : null;

// Phase 1 redesign elements. These are optional so the same JS can still run on the old layout.
const processingLog = document.getElementById('processingLog');
const processingLogPanel = document.getElementById('processingLogPanel');
const activityToggleBtn = document.getElementById('activityToggleBtn');
const activityCloseBtn = document.getElementById('activityCloseBtn');
const shortcutHelpBtn = document.getElementById('shortcutHelpBtn');
const shortcutHelpDialog = document.getElementById('shortcutHelpDialog');
const shortcutHelpCloseBtn = document.getElementById('shortcutHelpCloseBtn');
const shortcutHelpBackdrop = document.getElementById('shortcutHelpBackdrop');
const toastRegion = document.getElementById('toastRegion');
const documentHealth = document.getElementById('documentHealth');
const documentOutline = document.getElementById('documentOutline');
const documentIssues = document.getElementById('documentIssues');
const htmlPreview = document.getElementById('htmlPreview');
const healthScore = document.getElementById('healthScore');
const reviewTabs = document.querySelectorAll('[data-review-tab]');
const workflowTabs = document.querySelectorAll('[data-workflow-tab]');
const standardCleanupBtn = document.getElementById('standardCleanupBtn');
const fileDropZone = document.getElementById('fileDropZone');
const liveEditorHost = document.getElementById('liveEditor');
const liveEditor = createWetLiveEditor(liveEditorHost);
const editorDropZone = document.getElementById('editorDropZone');
const editorPanel = document.querySelector('.editor-panel');
const paneSplitter = document.getElementById('paneSplitter');
const paneSnapGuides = document.querySelectorAll('.pane-snap-guide');
const codeEditor = document.getElementById('codeEditor');
const codeHighlight = document.getElementById('codeHighlight');
const editorViewButtons = document.querySelectorAll('[data-editor-view]');
const wysiwygButtons = document.querySelectorAll('[data-edit-command]');
const blockFormatSelect = document.getElementById('blockFormatSelect');
const liveTableEditPopover = liveEditor ? liveEditor.getRootNode().getElementById('tableEditPopover') : null;
const tableEditorDialog = document.getElementById('tableEditorDialog');
const tableEditorCloseBtn = document.getElementById('tableEditorCloseBtn');
const tableEditorCancelBtn = document.getElementById('tableEditorCancelBtn');
const tableEditorApplyBtn = document.getElementById('tableEditorApplyBtn');
const tableEditorApplyNextBtn = document.getElementById('tableEditorApplyNextBtn');
const tableEditorPrevBtn = document.getElementById('tableEditorPrevBtn');
const tableEditorNextBtn = document.getElementById('tableEditorNextBtn');
const tableEditorPages = document.getElementById('tableEditorPages');
const tableEditorRecleanBtn = document.getElementById('tableEditorRecleanBtn');
const tableEditorDeselectBtn = document.getElementById('tableEditorDeselectBtn');
const tableEditorHeaderBtn = document.getElementById('tableEditorHeaderBtn');
const tableEditorMergeRowBtn = document.getElementById('tableEditorMergeRowBtn');
const tableEditorMergeCellsBtn = document.getElementById('tableEditorMergeCellsBtn');
const tableEditorActiveBtn = document.getElementById('tableEditorActiveBtn');
const tableEditorAddFooterBtn = document.getElementById('tableEditorAddFooterBtn');
const tableEditorTfootBtn = document.getElementById('tableEditorTfootBtn');
const tableEditorIndentBtn = document.getElementById('tableEditorIndentBtn');
const tableEditorOutdentBtn = document.getElementById('tableEditorOutdentBtn');
const tableEditorBoldBtn = document.getElementById('tableEditorBoldBtn');
const tableEditorLeftBtn = document.getElementById('tableEditorLeftBtn');
const tableEditorCenterBtn = document.getElementById('tableEditorCenterBtn');
const tableEditorRightBtn = document.getElementById('tableEditorRightBtn');
const tableEditorDeleteRowBtn = document.getElementById('tableEditorDeleteRowBtn');
const tableEditorStatus = document.getElementById('tableEditorStatus');
const tableEditorCanvas = document.getElementById('tableEditorCanvas');
const tableEditorNumber = document.getElementById('tableEditorNumber');
const tableEditorCaption = document.getElementById('tableEditorCaption');
const tableEditorUnit = document.getElementById('tableEditorUnit');
const tableEditorFinancial = document.getElementById('tableEditorFinancial');
const tableEditorFrench = document.getElementById('tableEditorFrench');

// Local HTML for input
const inputHTML = document.createElement('div');

/* Global Variables */
// Elapsed time
var startTime, endTime;
var modifiedComponents = [];
var headingIDCount, tableIDCount, figureIDCount = 0;
var logCount = 0;
var activeEditorView = 'live';
var elementSyncLineMap = [];
var lastLiveSelectionRange = null;
var shortcutHelpPreviousFocus = null;
var livePaneWidthRatio = null;
var tableEditorIndex = 0;
var tableEditorPreviousFocus = null;
var tableEditorLastSelectedCell = null;
var tableEditorDragStartCell = null;
var tableEditorIsDragging = false;
var tableEditorPreviewCleanup = false;
var liveTableEditTarget = null;
var liveEditorIsSelectingText = false;
const paneSplitterStorageKey = 'propel.livePaneWidthRatio';
const paneSplitterSnapRatios = [1 / 2, 2 / 3];
const paneSplitterSnapZone = 24;

// Footnote generator
var showFullPreview = false;
var isEngLang = true;
var langStrings = engStrings;

/* Main */
createListeners();
createModernDashboardListeners();
updateShortcutHelpForPlatform();

// Set up 'Presets' button from JSON file
fetch("./src/presetButtons.json")
    .then(response => { return response.json(); })
    .then(data => setUpPresetBtns(data));

// Default values
const tagText = document.getElementById('tagList');
if (tagText) {
    tagText.value = qaHelperTagsDefault.trim();
}

refreshReviewPanel();
updateLanguageSwitch();

/* Functions */

function updateShortcutHelpForPlatform() {
    if (!shortcutHelpDialog) {
        return;
    }

    const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
    const isApplePlatform = /mac|iphone|ipad|ipod/i.test(platform);
    const keyLabels = isApplePlatform
        ? { primary: 'Cmd', alternate: 'Option' }
        : { primary: 'Ctrl', alternate: 'Alt' };

    shortcutHelpDialog.querySelectorAll('[data-shortcut-key]').forEach((key) => {
        key.textContent = keyLabels[key.dataset.shortcutKey];
    });
}

function createWetLiveEditor(host) {
    if (!host) {
        return null;
    }

    const placeholder = host.getAttribute('data-placeholder') || '';
    host.removeAttribute('contenteditable');
    host.removeAttribute('role');
    host.removeAttribute('aria-multiline');

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
        <link rel="stylesheet" href="css/wet-boew.min.css">
        <link rel="stylesheet" href="css/theme.min.css">
        <style>
            * {
                box-sizing: border-box;
            }

            :host {
                display: block;
                position: relative;
                height: 100%;
                min-height: 0;
                background: #fff;
                color: #333;
            }

            .wet-live-editor {
                min-height: 100%;
                height: 100%;
                overflow: auto;
                padding: 16px;
                outline: none;
                background: #fff;
                color: #333;
                font-family: "Noto Sans", sans-serif;
                font-size: 16px;
                line-height: 1.4375;
                -webkit-user-select: text;
                user-select: text;
            }

            .wet-live-editor:empty::before {
                content: attr(data-placeholder);
                color: #6f6f6f;
            }

            .wet-live-editor h1:first-child {
                margin-top: 0;
            }

            .wet-live-editor img {
                max-width: 100%;
                height: auto;
            }

            .wet-live-editor table,
            .wet-live-editor .table-responsive {
                transition: outline-color 0.15s ease, box-shadow 0.15s ease;
            }

            .wet-live-editor table:hover,
            .wet-live-editor .table-responsive:hover {
                outline: 2px solid rgba(37,87,214,0.58);
                outline-offset: 3px;
                box-shadow: 0 0 0 6px rgba(37,87,214,0.08);
            }

            .table-edit-popover {
                position: absolute;
                z-index: 20;
                display: none;
                align-items: center;
                gap: 6px;
                min-height: 32px;
                padding: 5px 10px;
                border: 1px solid rgba(37,87,214,0.36);
                border-radius: 999px;
                background: #fff;
                color: #0f3557;
                font: 700 0.82rem/1.2 "Noto Sans", sans-serif;
                box-shadow: 0 10px 26px rgba(16, 24, 40, 0.18);
                cursor: pointer;
                -webkit-user-select: none;
                user-select: none;
            }

            .table-edit-popover.visible {
                display: inline-flex;
            }

            .table-edit-popover:hover,
            .table-edit-popover:focus {
                border-color: rgba(37,87,214,0.68);
                background: #eef4ff;
                outline: 2px solid rgba(37,87,214,0.24);
                outline-offset: 1px;
            }

            .table-edit-popover-icon {
                position: relative;
                display: inline-block;
                width: 15px;
                height: 15px;
                border: 1px solid currentColor;
                border-radius: 2px;
                background:
                    linear-gradient(currentColor, currentColor) 0 33% / 100% 1px no-repeat,
                    linear-gradient(currentColor, currentColor) 0 66% / 100% 1px no-repeat,
                    linear-gradient(currentColor, currentColor) 33% 0 / 1px 100% no-repeat,
                    linear-gradient(currentColor, currentColor) 66% 0 / 1px 100% no-repeat;
            }
        </style>
        <div id="wetLiveEditor" class="wet-live-editor" contenteditable="true" role="textbox" aria-multiline="true" tabindex="0"></div>
        <button type="button" id="tableEditPopover" class="table-edit-popover" aria-label="Edit table">
            <span class="table-edit-popover-icon" aria-hidden="true"></span>
            <span>Edit table</span>
        </button>
    `;

    const editor = shadow.getElementById('wetLiveEditor');
    editor.setAttribute('data-placeholder', placeholder);
    host.setAttribute('tabindex', '0');
    return editor;
}


/**
 * Optional listeners for the modern dashboard layout.
 * These are intentionally separate from the core conversion logic.
 */
function createModernDashboardListeners() {
    reviewTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            switchReviewTab(tab.getAttribute('data-review-tab'));
        });
    });

    workflowTabs.forEach((tab) => {
        tab.addEventListener('click', (event) => {
            const targetSelector = tab.getAttribute('href');
            const target = targetSelector ? document.querySelector(targetSelector) : null;
            if (!target) {
                return;
            }
            event.preventDefault();
            document.querySelectorAll('[data-workflow-tab]').forEach((item) => item.classList.remove('active'));
            tab.classList.add('active');
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    if (standardCleanupBtn) {
        standardCleanupBtn.addEventListener('click', standardCleanupCommand);
    }

    if (activityToggleBtn) {
        activityToggleBtn.addEventListener('click', () => {
            setActivityPanelOpen(!isActivityPanelOpen());
        });
    }

    if (activityCloseBtn) {
        activityCloseBtn.addEventListener('click', () => {
            setActivityPanelOpen(false);
        });
    }

    if (shortcutHelpBtn) {
        shortcutHelpBtn.addEventListener('click', openShortcutHelp);
    }

    if (shortcutHelpCloseBtn) {
        shortcutHelpCloseBtn.addEventListener('click', closeShortcutHelp);
    }

    if (shortcutHelpBackdrop) {
        shortcutHelpBackdrop.addEventListener('click', closeShortcutHelp);
    }

    if (shortcutHelpDialog) {
        shortcutHelpDialog.addEventListener('keydown', handleShortcutHelpDialogKeydown);
    }

    createTableEditorListeners();

    document.addEventListener('keydown', handleGlobalKeydown);

    if (healthScore) {
        healthScore.addEventListener('click', openActivityReviewTab);
        healthScore.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            event.preventDefault();
            openActivityReviewTab();
        });
    }

    editorViewButtons.forEach((button) => {
        button.addEventListener('click', () => {
            switchEditorView(button.getAttribute('data-editor-view'));
        });
    });

    wysiwygButtons.forEach((button) => {
        button.tabIndex = -1;

        button.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            runWysiwygCommand(button);
        });

        button.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    });

    if (blockFormatSelect) {
        blockFormatSelect.addEventListener('pointerdown', rememberLiveSelection);
        blockFormatSelect.addEventListener('focus', rememberLiveSelection);
        blockFormatSelect.addEventListener('change', () => {
            runBlockFormatCommand(blockFormatSelect.value);
        });
    }

    if (liveEditor) {
        if (liveEditorHost) {
            liveEditorHost.addEventListener('focus', () => {
                liveEditor.focus();
            });
        }

        liveEditor.addEventListener('focus', () => {
            activeEditorView = 'live';
            rememberLiveSelection();
            updateBlockFormatSelect();
        });

        liveEditor.addEventListener('mouseup', () => {
            rememberLiveSelection();
            updateBlockFormatSelect();
        });
        liveEditor.addEventListener('keydown', handleLiveEditorKeydown);
        liveEditor.addEventListener('beforeinput', combineLiveEditorComponents);
        liveEditor.addEventListener('keyup', () => {
            rememberLiveSelection();
            updateBlockFormatSelect();
        });

        liveEditor.addEventListener('input', () => {
            syncLiveToInputHTML();
            updateCodeView();
            refreshReviewPanel();
            rememberLiveSelection();
            updateBlockFormatSelect();
        });

        liveEditor.addEventListener('click', (event) => {
            scrollCodeToLiveElement(event.target);
        });

        liveEditor.addEventListener('mousedown', () => {
            liveEditorIsSelectingText = true;
            hideLiveTableEditPopover();
        });
        liveEditor.addEventListener('mouseup', () => {
            window.setTimeout(() => {
                liveEditorIsSelectingText = false;
            }, 0);
        });
        liveEditor.addEventListener('mousemove', handleLiveEditorTableHover);
        liveEditor.addEventListener('scroll', positionLiveTableEditPopover);
        liveEditor.addEventListener('mouseleave', (event) => {
            if (liveTableEditPopover && event.relatedTarget === liveTableEditPopover) {
                return;
            }
            hideLiveTableEditPopover();
        });

        if (liveTableEditPopover) {
            liveTableEditPopover.addEventListener('click', openHoveredLiveTableEditor);
            liveTableEditPopover.addEventListener('mouseleave', (event) => {
                if (liveEditor.contains(event.relatedTarget)) {
                    return;
                }
                hideLiveTableEditPopover();
            });
        }

        liveEditor.addEventListener('dblclick', (event) => {
            if (tableEditorDialog && !tableEditorDialog.hidden) {
                return;
            }

            const table = getClosestElement(event.target, liveEditor, 'table');
            if (!table) {
                return;
            }

            event.preventDefault();
            syncLiveToInputHTML();
            openTableEditor(getLiveTableIndex(table));
        });

        liveEditor.addEventListener('blur', () => {
            syncLiveToInputHTML();
            updateCodeView();
        });
    }

    document.addEventListener('selectionchange', () => {
        rememberLiveSelection();
        updateBlockFormatSelect();
    });

    if (editorDropZone && file) {
        ['dragenter', 'dragover'].forEach((eventName) => {
            editorDropZone.addEventListener(eventName, (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (editorPanel) {
                    editorPanel.classList.add('drag-active');
                }
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            editorDropZone.addEventListener(eventName, (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (editorPanel) {
                    editorPanel.classList.remove('drag-active');
                }
            });
        });

        editorDropZone.addEventListener('drop', handleFileDrop);
    }

    if (paneSplitter && editorDropZone) {
        applySavedPaneSplitterLocation();
        updatePaneSplitterOrientation();
        paneSplitter.addEventListener('pointerdown', startPaneResize);
        window.addEventListener('resize', () => {
            updatePaneSplitterOrientation();
            applyCurrentPaneSplitterLocation();
        });
    }

    if (fileDropZone && file) {
        fileDropZone.addEventListener('click', (event) => {
            if (event.target !== file) {
                file.click();
            }
        });

        ['dragenter', 'dragover'].forEach((eventName) => {
            fileDropZone.addEventListener(eventName, (event) => {
                event.preventDefault();
                event.stopPropagation();
                fileDropZone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            fileDropZone.addEventListener(eventName, (event) => {
                event.preventDefault();
                event.stopPropagation();
                fileDropZone.classList.remove('drag-active');
            });
        });

        fileDropZone.addEventListener('drop', handleFileDrop);
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        document.addEventListener(eventName, (event) => {
            event.preventDefault();
        });
    });
}

function switchReviewTab(targetId) {
    if (!targetId) {
        return;
    }

    document.querySelectorAll('.review-tab').forEach((item) => {
        item.classList.toggle('active', item.getAttribute('data-review-tab') === targetId);
    });

    document.querySelectorAll('.review-pane').forEach((pane) => {
        pane.classList.toggle('active', pane.id === targetId);
    });
}

function openActivityReviewTab() {
    setActivityPanelOpen(true);
    switchReviewTab('issuesPane');
}

function getPaneResizeMetrics() {
    const rect = editorDropZone.getBoundingClientRect();
    const isStacked = isPaneSplitterStacked();
    const minPaneSize = 260;
    const splitterSize = isStacked ? paneSplitter.offsetHeight || 8 : paneSplitter.offsetWidth || 8;
    const liveToolbar = editorDropZone.querySelector('.wysiwyg-toolbar');
    const codeToolbar = editorDropZone.querySelector('.code-toolbar');
    const axisStart = isStacked ? liveToolbar.offsetHeight : 0;
    const toolbarSize = isStacked ? liveToolbar.offsetHeight + codeToolbar.offsetHeight : 0;
    const availableSize = (isStacked ? rect.height : rect.width) - splitterSize - toolbarSize;

    return {
        isStacked,
        minPaneSize,
        availableSize,
        axisStart,
        minRatio: minPaneSize / availableSize,
        maxRatio: (availableSize - minPaneSize) / availableSize
    };
}

function isPaneSplitterStacked() {
    return window.matchMedia('(orientation: portrait) and (min-width: 768px)').matches;
}

function updatePaneSplitterOrientation() {
    paneSplitter.setAttribute('aria-orientation', isPaneSplitterStacked() ? 'horizontal' : 'vertical');
    updatePaneSnapGuides();
}

function updatePaneSnapGuides() {
    const metrics = getPaneResizeMetrics();

    paneSnapGuides.forEach((guide) => {
        const ratio = Number(guide.dataset.snapRatio);
        const isAvailable = metrics.availableSize > 0 && ratio >= metrics.minRatio && ratio <= metrics.maxRatio;
        const position = metrics.axisStart + metrics.availableSize * ratio;
        guide.hidden = !isAvailable;
        guide.style.setProperty('--pane-snap-position', `${position}px`);
    });
}

function showActivePaneSnap(ratio) {
    paneSnapGuides.forEach((guide) => {
        const guideRatio = Number(guide.dataset.snapRatio);
        guide.classList.toggle('active', paneSplitterSnapRatios.includes(ratio) && Math.abs(guideRatio - ratio) < 0.0001);
    });
}

function clampPaneWidthRatio(ratio) {
    const metrics = getPaneResizeMetrics();

    if (!Number.isFinite(ratio) || metrics.availableSize <= 0 || metrics.availableSize <= metrics.minPaneSize * 2) {
        return null;
    }

    return Math.min(Math.max(ratio, metrics.minRatio), metrics.maxRatio);
}

function snapPaneWidthRatio(ratio, metrics) {
    if (!Number.isFinite(ratio) || metrics.availableSize <= 0) {
        return ratio;
    }

    const snapRatio = paneSplitterSnapRatios.find((targetRatio) => {
        const targetIsAvailable = targetRatio >= metrics.minRatio && targetRatio <= metrics.maxRatio;
        return targetIsAvailable && Math.abs(ratio - targetRatio) * metrics.availableSize <= paneSplitterSnapZone;
    });

    return snapRatio === undefined ? ratio : snapRatio;
}

function setLivePaneWidthFromRatio(ratio) {
    const nextRatio = clampPaneWidthRatio(ratio);

    if (nextRatio === null) {
        return;
    }

    livePaneWidthRatio = nextRatio;
    const size = getPaneResizeMetrics().availableSize * nextRatio;
    editorDropZone.style.setProperty('--live-pane-width', `${size}px`);
}

function applySavedPaneSplitterLocation() {
    try {
        const savedRatio = localStorage.getItem(paneSplitterStorageKey);

        if (savedRatio !== null) {
            setLivePaneWidthFromRatio(Number(savedRatio));
        }
    } catch (error) {
        console.warn('Could not restore pane splitter location.', error);
    }
}

function applyCurrentPaneSplitterLocation() {
    if (livePaneWidthRatio !== null) {
        setLivePaneWidthFromRatio(livePaneWidthRatio);
    }
}

function savePaneSplitterLocation() {
    if (livePaneWidthRatio === null) {
        return;
    }

    try {
        localStorage.setItem(paneSplitterStorageKey, String(livePaneWidthRatio));
    } catch (error) {
        console.warn('Could not save pane splitter location.', error);
    }
}

function startPaneResize(event) {
    event.preventDefault();
    paneSplitter.setPointerCapture(event.pointerId);
    paneSplitter.classList.add('drag-active');
    editorDropZone.classList.add('pane-resizing');
    updatePaneSnapGuides();

    const handleMove = (moveEvent) => {
        const rect = editorDropZone.getBoundingClientRect();
        const metrics = getPaneResizeMetrics();
        const pointerPosition = metrics.isStacked ? moveEvent.clientY - rect.top : moveEvent.clientX - rect.left;
        const rawSize = pointerPosition - metrics.axisStart;
        const nextSize = Math.min(Math.max(rawSize, metrics.minPaneSize), metrics.availableSize - metrics.minPaneSize);
        const nextRatio = snapPaneWidthRatio(nextSize / metrics.availableSize, metrics);
        setLivePaneWidthFromRatio(nextRatio);
        showActivePaneSnap(nextRatio);
    };

    const stopResize = () => {
        paneSplitter.classList.remove('drag-active');
        editorDropZone.classList.remove('pane-resizing');
        showActivePaneSnap(null);
        savePaneSplitterLocation();
        paneSplitter.removeEventListener('pointermove', handleMove);
        paneSplitter.removeEventListener('pointerup', stopResize);
        paneSplitter.removeEventListener('pointercancel', stopResize);
        paneSplitter.removeEventListener('lostpointercapture', stopResize);
    };

    paneSplitter.addEventListener('pointermove', handleMove);
    paneSplitter.addEventListener('pointerup', stopResize);
    paneSplitter.addEventListener('pointercancel', stopResize);
    paneSplitter.addEventListener('lostpointercapture', stopResize);
}

/**
 * Attaches click listeners to page's buttons
 */
function createListeners() {
    if (file) {
        file.addEventListener('change', handleFileInputChange);
    }
    updateFileDropZoneState(false);

    copyBtn.addEventListener('click', async () => {
        try {
            const html = getHTMLForCopy();
            await Utils.copyToClipboard(html);
            addProcessingLog('Copied HTML to clipboard.', 'success');
        } catch (error) {
            console.error(error);
            addProcessingLog('Could not copy HTML to clipboard.', 'error');
        }
    });

    topBtn.addEventListener('click', Utils.goToTop);

    langBtn.addEventListener('click', toggleLanguage);

    onThisPageBox.addEventListener('click', handleToggleOnThisPageBox);
    [onThisPageBox, headerDepth, isToC].forEach((control) => {
        if (control) {
            control.addEventListener('change', updateAddIDsSettingsState);
        }
    });
    if (otpSettings) {
        [addIDsBtn, addIDsSettingsBtn].forEach((trigger) => {
            if (!trigger) {
                return;
            }

            trigger.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleAddIDsSettings();
            });
        });

        if (addIDsApplyBtn) {
            addIDsApplyBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                addIDsCommand();
                closeAddIDsSettings();
            });
        }

        otpSettings.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        if (addIDsSettingsCloseBtn) {
            addIDsSettingsCloseBtn.addEventListener('click', () => {
                closeAddIDsSettings();
            });
        }

        if (addIDsSettingsBackdrop) {
            addIDsSettingsBackdrop.addEventListener('click', () => {
                closeAddIDsSettings();
            });
        }

        document.addEventListener('click', () => {
            closeAddIDsSettings();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeAddIDsSettings();
            }
        });

        window.addEventListener('resize', positionAddIDsSettings);
        document.addEventListener('scroll', positionAddIDsSettings, true);
    }

    updateAddIDsSettingsState();

    outputText.addEventListener('input', () => {
        activeEditorView = 'code';
        syncEditorToInputHTML();
        updateLiveView();
        refreshReviewPanel();
        updateCodeHighlight();
    });
    outputText.addEventListener('focus', () => {
        activeEditorView = 'code';
    });
    outputText.addEventListener('keydown', handleCodeEditorKeydown);
    outputText.addEventListener('scroll', () => {
        syncCodeHighlightScroll();
    });
    outputText.addEventListener('click', (event) => {
        scrollLiveToCodeClick(event);
    });

    // Input box. Use change instead of input so the formatter does not fight the user while typing.
    outputText.addEventListener('change', updateInputHTML);

    // Command buttons
    footnotesBtn.addEventListener('click', generateFootnotesCommand);
    nbspBtn.addEventListener('click', validateNbspCommand);
    tableCleanupBtn.addEventListener('click', tableCleanupCommand);
    splitBtn.addEventListener('click', splitByH1Command);

    // QA Helper buttons
    countBtn.addEventListener('click', qaHelperCount);
    collapseBtn.addEventListener('click', collapseAll);
    lightTheme.addEventListener('click', setCodeTheme);
    darkTheme.addEventListener('click', setCodeTheme);
}

/**
 * Toggles the switch and language
 */
function toggleLanguage() {
    setCommandLanguage(isEngLang ? 'fr' : 'en');
    addProcessingLog(`Language changed to ${langStrings['LANG_BTN']}.`, 'info');
}

function setCommandLanguage(language) {
    if (language !== 'en' && language !== 'fr') {
        return false;
    }

    const nextIsEngLang = language === 'en';
    const changed = isEngLang !== nextIsEngLang;
    isEngLang = nextIsEngLang;
    langStrings = isEngLang ? engStrings : frStrings;
    updateLanguageSwitch();
    return changed;
}

function updateLanguageSwitch() {
    if (!langBtn) {
        return;
    }

    langBtn.setAttribute('aria-checked', isEngLang ? 'true' : 'false');
    langBtn.setAttribute('aria-label', isEngLang ? 'Command language: English' : 'Command language: French');
    langBtn.querySelectorAll('[data-language-option]').forEach((option) => {
        option.classList.toggle('active', option.getAttribute('data-language-option') === (isEngLang ? 'en' : 'fr'));
    });
}

function switchEditorView(view) {
    if (!view || view === activeEditorView) {
        return;
    }

    syncActiveEditorToInputHTML();
    activeEditorView = view;

    document.querySelectorAll('.editor-view').forEach((editorView) => {
        editorView.classList.remove('active');
    });
    editorViewButtons.forEach((button) => {
        button.classList.toggle('active', button.getAttribute('data-editor-view') === view);
    });

    if (view === 'code') {
        updateCodeView();
        if (codeEditor) {
            codeEditor.classList.add('active');
        }
        if (liveEditorHost) {
            liveEditorHost.classList.remove('active');
        }
        outputText.focus();
        addProcessingLog('Switched to Code view.', 'info');
        return;
    }

    updateLiveView();
    if (liveEditorHost) {
        liveEditorHost.classList.add('active');
    }
    if (liveEditor) {
        liveEditor.focus();
    }
    if (codeEditor) {
        codeEditor.classList.remove('active');
    }
    addProcessingLog('Switched to Live view.', 'info');
}

function runWysiwygCommand(button) {
    if (!button) {
        return;
    }

    const command = button.getAttribute('data-edit-command');
    let value = button.getAttribute('data-edit-value') || null;

    if (command === 'createLink') {
        value = prompt('Link URL');
        if (!value) {
            return;
        }
    }

    runLiveEditCommand(command, value, getWysiwygButtonLabel(button));
}

function runLiveEditCommand(command, value = null, label = '') {
    if (!liveEditor || !command) {
        return;
    }

    if (activeEditorView !== 'live') {
        switchEditorView('live');
    }

    const selectionRange = getTextSelectionRange(liveEditor) || lastLiveSelectionRange;
    restoreTextSelectionRange(liveEditor, selectionRange);

    if ((command === 'indent' || command === 'outdent') && !getSelectedListItem(liveEditor)) {
        addProcessingLog('Place the cursor in a list item to change list indent.', 'warning');
        return;
    }

    document.execCommand(command, false, value);
    restoreTextSelectionRange(liveEditor, selectionRange);
    syncLiveToInputHTML();
    updateCodeView();
    refreshReviewPanel();
    updateBlockFormatSelect();
    if (command === 'bold') {
        restoreTextSelectionRange(liveEditor, selectionRange);
        requestAnimationFrame(() => {
            restoreTextSelectionRange(liveEditor, selectionRange);
        });
        setTimeout(() => {
            restoreTextSelectionRange(liveEditor, selectionRange);
        }, 0);
    }
    rememberLiveSelection();
    if (label && command !== 'bold') {
        addProcessingLog(`Applied Live view edit: ${label}.`, 'info');
    }
}

function runBlockFormatCommand(value) {
    if (!liveEditor || !value) {
        return;
    }

    if (activeEditorView !== 'live') {
        switchEditorView('live');
    }

    runLiveEditCommand('formatBlock', value, getBlockFormatLabel(value));
}

function updateBlockFormatSelect() {
    if (!blockFormatSelect || !liveEditor) {
        return;
    }

    const selection = getEditorSelection(liveEditor);
    if (!selection || selection.rangeCount === 0 || !liveEditor.contains(selection.anchorNode)) {
        return;
    }

    blockFormatSelect.value = getCurrentBlockFormat(selection.anchorNode);
}

function getCurrentBlockFormat(node) {
    const block = getClosestElement(node, liveEditor, 'h1, h2, h3, h4, h5, h6, p');
    return block ? block.tagName.toLowerCase() : 'p';
}

function getBlockFormatLabel(value) {
    if (value === 'p') {
        return 'Paragraph';
    }

    return `Heading ${value.substring(1)}`;
}

function getWysiwygButtonLabel(button) {
    return button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent.trim();
}

function handleLiveEditorKeydown(event) {
    preserveParagraphsOnEnter(event);

    const shortcut = getLiveEditorShortcut(event);
    if (!shortcut) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (shortcut.type === 'formatBlock') {
        runBlockFormatCommand(shortcut.value);
        return;
    }

    if (shortcut.command === 'createLink') {
        const value = prompt('Link URL');
        if (!value) {
            return;
        }
        runLiveEditCommand(shortcut.command, value, shortcut.label);
        return;
    }

    runLiveEditCommand(shortcut.command, null, shortcut.label);
}

function combineLiveEditorComponents(event) {
    if (!liveEditor || !event || event.defaultPrevented || !event.inputType) {
        return;
    }

    const isBackward = event.inputType === 'deleteContentBackward';
    const isForward = event.inputType === 'deleteContentForward';
    if (!isBackward && !isForward) {
        return;
    }

    const selection = getEditorSelection(liveEditor);
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
        return;
    }

    const range = selection.getRangeAt(0);
    const component = getLiveEditorComponent(range.startContainer);
    if (!component || !isCaretAtComponentEdge(range, component, isBackward)) {
        return;
    }

    const sibling = isBackward ? component.previousElementSibling : component.nextElementSibling;
    if (!sibling) {
        return;
    }

    event.preventDefault();

    const target = isBackward ? sibling : component;
    const source = isBackward ? component : sibling;
    const joinRange = document.createRange();
    joinRange.selectNodeContents(target);
    joinRange.collapse(false);

    while (source.firstChild) {
        target.appendChild(source.firstChild);
    }
    source.remove();

    selection.removeAllRanges();
    selection.addRange(joinRange);
    syncLiveToInputHTML();
    updateCodeView();
    refreshReviewPanel();
    rememberLiveSelection();
    updateBlockFormatSelect();
}

function getLiveEditorComponent(node) {
    let component = node && node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (component && component.parentElement !== liveEditor) {
        component = component.parentElement;
    }
    return component && component.parentElement === liveEditor ? component : null;
}

function isCaretAtComponentEdge(range, component, atStart) {
    const edgeRange = range.cloneRange();
    edgeRange.selectNodeContents(component);
    if (atStart) {
        edgeRange.setEnd(range.startContainer, range.startOffset);
    } else {
        edgeRange.setStart(range.startContainer, range.startOffset);
    }
    return edgeRange.collapsed || edgeRange.toString() === '';
}

function preserveParagraphsOnEnter(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    document.execCommand('formatBlock', false, 'p');
    document.execCommand('insertParagraph', false, null);
}

function getLiveEditorShortcut(event) {
    const key = event.key ? event.key.toLowerCase() : '';
    const primaryKey = event.ctrlKey !== event.metaKey;
    const digit = getShortcutDigit(event);

    if (primaryKey && event.altKey && !event.shiftKey && digit !== null) {
        if (digit === '0') {
            return { type: 'formatBlock', value: 'p' };
        }
        return { type: 'formatBlock', value: `h${digit}` };
    }

    if (primaryKey && !event.altKey && !event.shiftKey && key === 'b') {
        return { command: 'bold', label: 'Bold' };
    }

    if (primaryKey && !event.altKey && !event.shiftKey && key === 'i') {
        return { command: 'italic', label: 'Italic' };
    }

    if (primaryKey && !event.altKey && !event.shiftKey && key === 'k') {
        return { command: 'createLink', label: 'Create link' };
    }

    if (primaryKey && !event.altKey && event.shiftKey && isShortcutDigit(event, '8')) {
        return { command: 'insertUnorderedList', label: 'Bulleted list' };
    }

    if (primaryKey && !event.altKey && event.shiftKey && isShortcutDigit(event, '7')) {
        return { command: 'insertOrderedList', label: 'Numbered list' };
    }

    if (primaryKey && !event.altKey && !event.shiftKey && key === '[') {
        return { command: 'outdent', label: 'Decrease list indent' };
    }

    if (primaryKey && !event.altKey && !event.shiftKey && key === ']') {
        return { command: 'indent', label: 'Increase list indent' };
    }

    if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) {
        return {
            command: event.shiftKey ? 'outdent' : 'indent',
            label: event.shiftKey ? 'Decrease list indent' : 'Increase list indent'
        };
    }

    return null;
}

function handleCodeEditorKeydown(event) {
    const key = (event.key || '').toLowerCase();

    if (event.altKey && !event.ctrlKey && !event.metaKey && (key === 'w' || event.code === 'KeyW')) {
        event.preventDefault();
        activeEditorView = 'code';
        wrapCodeEditorSelectionWithTag();
        return;
    }

    if (event.key !== 'Tab') {
        return;
    }

    event.preventDefault();
    activeEditorView = 'code';

    indentCodeEditorSelection(event.shiftKey ? -1 : 1);
    syncCodeEditorAfterProgrammaticEdit();
}

function wrapCodeEditorSelectionWithTag() {
    if (!outputText) {
        return;
    }

    const tagInput = prompt('Wrap with HTML tag', 'p');
    const tag = parseCodeEditorWrapTag(tagInput);

    if (!tag) {
        return;
    }

    const selectionStart = outputText.selectionStart;
    const selectionEnd = outputText.selectionEnd;
    const selectedText = outputText.value.slice(selectionStart, selectionEnd);
    const openTag = tag.attributes ? `<${tag.name} ${tag.attributes}>` : `<${tag.name}>`;
    const closeTag = `</${tag.name}>`;
    const wrappedText = `${openTag}${selectedText}${closeTag}`;

    outputText.setRangeText(wrappedText, selectionStart, selectionEnd, 'end');

    if (!selectedText) {
        const cursor = selectionStart + openTag.length;
        outputText.setSelectionRange(cursor, cursor);
    } else {
        outputText.setSelectionRange(selectionStart, selectionStart + wrappedText.length);
    }

    syncCodeEditorAfterProgrammaticEdit();
}

function parseCodeEditorWrapTag(tagInput) {
    if (!tagInput) {
        return null;
    }

    const normalized = tagInput.trim()
        .replace(/^<\s*/, '')
        .replace(/\s*\/?>$/, '');
    const match = normalized.match(/^([A-Za-z][A-Za-z0-9-]*)(?:\s+([\s\S]+))?$/);

    if (!match) {
        return null;
    }

    return {
        name: match[1].toLowerCase(),
        attributes: match[2] ? match[2].trim() : ''
    };
}

function indentCodeEditorSelection(direction) {
    const indent = '    ';
    const value = outputText.value;
    const selectionStart = outputText.selectionStart;
    const selectionEnd = outputText.selectionEnd;
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const lineEnd = selectionEnd === selectionStart
        ? value.indexOf('\n', selectionEnd)
        : value.indexOf('\n', selectionEnd - 1);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    const selectedBlock = value.slice(lineStart, actualLineEnd);
    const lines = selectedBlock.split('\n');
    let removedBeforeSelection = 0;

    const nextLines = lines.map((line, index) => {
        if (direction > 0) {
            return `${indent}${line}`;
        }

        if (line.startsWith(indent)) {
            if (index === 0) {
                removedBeforeSelection = Math.min(indent.length, selectionStart - lineStart);
            }
            return line.slice(indent.length);
        }

        const leadingSpaces = line.match(/^ {1,3}/);
        if (leadingSpaces) {
            if (index === 0) {
                removedBeforeSelection = Math.min(leadingSpaces[0].length, selectionStart - lineStart);
            }
            return line.slice(leadingSpaces[0].length);
        }

        return line;
    });

    const nextBlock = nextLines.join('\n');
    outputText.setRangeText(nextBlock, lineStart, actualLineEnd, 'preserve');

    if (selectionStart === selectionEnd) {
        const nextCursor = direction > 0
            ? selectionStart + indent.length
            : Math.max(lineStart, selectionStart - removedBeforeSelection);
        outputText.setSelectionRange(nextCursor, nextCursor);
        return;
    }

    const delta = nextBlock.length - selectedBlock.length;
    const nextStart = direction > 0 ? selectionStart + indent.length : Math.max(lineStart, selectionStart - removedBeforeSelection);
    outputText.setSelectionRange(nextStart, selectionEnd + delta);
}

function syncCodeEditorAfterProgrammaticEdit() {
    syncEditorToInputHTML();
    updateLiveView();
    refreshReviewPanel();
    updateCodeHighlight();
}

function getShortcutDigit(event) {
    if (/^[0-6]$/.test(event.key)) {
        return event.key;
    }

    const match = /^Digit([0-6])$/.exec(event.code || '');
    return match ? match[1] : null;
}

function isShortcutDigit(event, digit) {
    return event.key === digit || event.code === `Digit${digit}`;
}

function getSelectedListItem(root, selection = getEditorSelection(root)) {
    if (!root || !selection || selection.rangeCount === 0) {
        return null;
    }

    return getClosestElement(selection.anchorNode, root, 'li');
}

function getEditorSelection(root) {
    if (!root) {
        return null;
    }

    const rootNode = root.getRootNode ? root.getRootNode() : document;
    if (rootNode && typeof rootNode.getSelection === 'function') {
        const selection = rootNode.getSelection();
        if (selection && selection.rangeCount > 0) {
            return selection;
        }
    }

    return window.getSelection ? window.getSelection() : null;
}

function getClosestElement(node, root, selector) {
    let element = node && node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

    while (element && element !== root) {
        if (element.matches(selector)) {
            return element;
        }
        element = element.parentElement;
    }

    return null;
}

function replaceElementTag(root, sourceTag, targetTag) {
    if (!root) {
        return;
    }

    Array.from(root.querySelectorAll(sourceTag)).forEach((sourceElement) => {
        const targetElement = document.createElement(targetTag);
        Array.from(sourceElement.attributes).forEach((attribute) => {
            targetElement.setAttribute(attribute.name, attribute.value);
        });
        while (sourceElement.firstChild) {
            targetElement.appendChild(sourceElement.firstChild);
        }
        sourceElement.replaceWith(targetElement);
    });
}

function removeEmptyStyleAttributes(root) {
    if (!root) {
        return;
    }

    Array.from(root.querySelectorAll('[style]')).forEach((element) => {
        if (!element.getAttribute('style').trim()) {
            element.removeAttribute('style');
        }
    });
}

function getTextSelectionRange(root) {
    const selection = getEditorSelection(root);
    if (!root || !selection || selection.rangeCount === 0) {
        return null;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        return null;
    }

    const beforeStart = range.cloneRange();
    beforeStart.selectNodeContents(root);
    beforeStart.setEnd(range.startContainer, range.startOffset);

    const beforeEnd = range.cloneRange();
    beforeEnd.selectNodeContents(root);
    beforeEnd.setEnd(range.endContainer, range.endOffset);

    return {
        start: beforeStart.toString().length,
        end: beforeEnd.toString().length
    };
}

function rememberLiveSelection() {
    const selectionRange = getTextSelectionRange(liveEditor);
    if (selectionRange) {
        lastLiveSelectionRange = selectionRange;
    }
}

function restoreTextSelectionRange(root, savedRange) {
    if (!root || !savedRange) {
        return;
    }

    const selection = getEditorSelection(root);
    if (!selection) {
        return;
    }

    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startSet = false;
    let endSet = false;

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const nextOffset = currentOffset + node.nodeValue.length;

        if (!startSet && savedRange.start >= currentOffset && savedRange.start <= nextOffset) {
            range.setStart(node, savedRange.start - currentOffset);
            startSet = true;
        }

        if (!endSet && savedRange.end >= currentOffset && savedRange.end <= nextOffset) {
            range.setEnd(node, savedRange.end - currentOffset);
            endSet = true;
            break;
        }

        currentOffset = nextOffset;
    }

    if (!startSet) {
        range.setStart(root, 0);
    }
    if (!endSet) {
        range.setEnd(root, root.childNodes.length);
    }

    root.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * Handles a file chosen through the file input.
 */
function handleFileInputChange(event) {
    const selectedFile = event && event.target && event.target.files ? event.target.files[0] : null;
    processSelectedFile(selectedFile);
}

/**
 * Backward-compatible wrapper for older markup or scripts that still call handleConversion().
 */
function handleConversion() {
    if (!file || file.files.length === 0) {
        console.warn("No file selected");
        setFileUploadStatus('No file selected.');
        addProcessingLog('No file selected.', 'warning');
        return;
    }

    processSelectedFile(file.files[0]);
}

function handleFileDrop(event) {
    const droppedFiles = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : [];
    if (!droppedFiles.length) {
        addProcessingLog('No file detected in drop.', 'warning');
        return;
    }

    const droppedFile = droppedFiles[0];

    try {
        const transfer = new DataTransfer();
        transfer.items.add(droppedFile);
        file.files = transfer.files;
    } catch (error) {
        console.warn('Could not sync dropped file to file input:', error);
    }

    processSelectedFile(droppedFile);
}

function processSelectedFile(selectedFile) {
    if (!selectedFile) {
        updateFileDropZoneState(false);
        addProcessingLog('No file selected.', 'warning');
        return;
    }

    const validExtension = /\.docx?$/i.test(selectedFile.name);
    if (!validExtension) {
        updateFileDropZoneState(false);
        setFileUploadStatus('Unsupported file type. Please use a .docx file.');
        addProcessingLog('Unsupported file type. Please use a .docx file.', 'danger');
        return;
    }

    if (!getMammothLibrary()) {
        setFileUploadStatus('Mammoth is not loaded. Check that src/mammoth.browser.js is loading before propel.js.');
        addProcessingLog('Mammoth is not loaded. Check that src/mammoth.browser.js is loading before propel.js.', 'danger');
        return;
    }

    getStartTime();
    updateFileDropZoneState(true);
    setFileUploadStatus(`Selected: ${selectedFile.name}`);
    addProcessingLog(`Started conversion: ${selectedFile.name}`, 'info');
    convertUsingMammoth(selectedFile);
}

function updateFileDropZoneState(hasFile) {
    if (!fileDropZone) {
        return;
    }

    fileDropZone.classList.toggle('needs-file', !hasFile);
    fileDropZone.classList.toggle('has-file', hasFile);
}

/**
 * Perform actions whenever On this page checkbox is pressed
 */
function handleToggleOnThisPageBox() {
    addProcessingLog(`${onThisPageBox.checked ? 'Enabled' : 'Disabled'} On this page generation.`, 'info');
    updateAddIDsSettingsState();
}

function toggleAddIDsSettings() {
    if (!otpSettings) {
        return;
    }

    const isOpen = !otpSettings.classList.contains('open');
    if (isOpen) {
        // Render outside the command rail so its overflow cannot clip the popover.
        document.body.appendChild(otpSettings);
        otpSettings.classList.add('open');
    } else {
        closeAddIDsSettings();
        return;
    }
    setAddIDsPopoverExpanded(isOpen);
    if (addIDsSettingsBackdrop) {
        addIDsSettingsBackdrop.classList.toggle('open', isOpen);
    }
    if (isOpen) {
        positionAddIDsSettings();
    }
}

function positionAddIDsSettings() {
    if (!otpSettings || !otpSettings.classList.contains('open')) {
        return;
    }

    const trigger = addIDsSettingsBtn || addIDsBtn;
    if (!trigger) {
        return;
    }

    const gap = 8;
    const viewportPadding = 16;
    const triggerRect = trigger.getBoundingClientRect();
    const dialogRect = otpSettings.getBoundingClientRect();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - dialogRect.width - viewportPadding);
    const left = Math.min(Math.max(triggerRect.right - dialogRect.width, viewportPadding), maxLeft);
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const top = spaceBelow >= dialogRect.height
        ? triggerRect.bottom + gap
        : Math.max(viewportPadding, triggerRect.top - dialogRect.height - gap);

    otpSettings.style.left = `${left}px`;
    otpSettings.style.top = `${top}px`;
}

function closeAddIDsSettings() {
    if (!otpSettings) {
        return;
    }

    otpSettings.classList.remove('open');
    setAddIDsPopoverExpanded(false);
    if (addIDsSettingsBackdrop) {
        addIDsSettingsBackdrop.classList.remove('open');
    }
    if (addIDsSettingsParent && otpSettings.parentNode !== addIDsSettingsParent) {
        addIDsSettingsParent.insertBefore(otpSettings, addIDsSettingsNextSibling);
    }
}

function setAddIDsPopoverExpanded(isOpen) {
    [addIDsBtn, addIDsSettingsBtn].forEach((trigger) => {
        if (trigger) {
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    });
}

function openShortcutHelp() {
    if (!shortcutHelpDialog) {
        return;
    }

    shortcutHelpPreviousFocus = document.activeElement;
    shortcutHelpDialog.hidden = false;
    if (shortcutHelpBackdrop) {
        shortcutHelpBackdrop.classList.add('open');
    }
    if (shortcutHelpBtn) {
        shortcutHelpBtn.setAttribute('aria-expanded', 'true');
    }
    if (shortcutHelpCloseBtn) {
        shortcutHelpCloseBtn.focus();
    }
}

function handleGlobalKeydown(event) {
    if (event.key === 'Escape') {
        closeShortcutHelp();
        handleTableEditorEscape();
    }
}

function handleShortcutHelpDialogKeydown(event) {
    if (event.key !== 'Tab' || !shortcutHelpDialog || shortcutHelpDialog.hidden) {
        return;
    }

    const focusableElements = getFocusableElements(shortcutHelpDialog);
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

function getFocusableElements(root) {
    return Array.from(root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((element) => element.offsetParent !== null);
}

function closeShortcutHelp() {
    if (!shortcutHelpDialog || shortcutHelpDialog.hidden) {
        return;
    }

    shortcutHelpDialog.hidden = true;
    if (shortcutHelpBackdrop) {
        shortcutHelpBackdrop.classList.remove('open');
    }
    if (shortcutHelpBtn) {
        shortcutHelpBtn.setAttribute('aria-expanded', 'false');
    }
    if (shortcutHelpPreviousFocus && typeof shortcutHelpPreviousFocus.focus === 'function') {
        shortcutHelpPreviousFocus.focus();
    }
    shortcutHelpPreviousFocus = null;
}

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
    if (tableEditorCanvas) {
        tableEditorCanvas.addEventListener('beforeinput', removeEmptyFooterPlaceholder);
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
    if (tableEditorPrevBtn) {
        tableEditorPrevBtn.addEventListener('click', () => renderTableEditor(tableEditorIndex - 1));
    }
    if (tableEditorNextBtn) {
        tableEditorNextBtn.addEventListener('click', () => renderTableEditor(tableEditorIndex + 1));
    }
    if (tableEditorRecleanBtn) {
        tableEditorRecleanBtn.addEventListener('click', recleanTableEditorTable);
    }
    if (tableEditorDeselectBtn) {
        tableEditorDeselectBtn.addEventListener('click', deselectTableEditorCells);
    }
    if (tableEditorHeaderBtn) {
        tableEditorHeaderBtn.addEventListener('click', toggleTableEditorHeaderRows);
    }
    if (tableEditorMergeRowBtn) {
        tableEditorMergeRowBtn.addEventListener('click', mergeTableEditorRows);
    }
    if (tableEditorMergeCellsBtn) {
        tableEditorMergeCellsBtn.addEventListener('click', mergeTableEditorSelectedCells);
    }
    if (tableEditorActiveBtn) {
        tableEditorActiveBtn.addEventListener('click', toggleTableEditorActiveRows);
    }
    if (tableEditorAddFooterBtn) {
        tableEditorAddFooterBtn.addEventListener('click', addEmptyTableEditorFooter);
    }
    if (tableEditorTfootBtn) {
        tableEditorTfootBtn.addEventListener('click', toggleTableEditorRowsInTfoot);
    }
    if (tableEditorIndentBtn) {
        tableEditorIndentBtn.addEventListener('click', () => changeTableEditorIndent(1));
    }
    if (tableEditorOutdentBtn) {
        tableEditorOutdentBtn.addEventListener('click', () => changeTableEditorIndent(-1));
    }
    if (tableEditorBoldBtn) {
        tableEditorBoldBtn.addEventListener('click', toggleTableEditorBold);
    }
    if (tableEditorLeftBtn) {
        tableEditorLeftBtn.addEventListener('click', () => alignTableEditorCells('left'));
    }
    if (tableEditorCenterBtn) {
        tableEditorCenterBtn.addEventListener('click', () => alignTableEditorCells('center'));
    }
    if (tableEditorRightBtn) {
        tableEditorRightBtn.addEventListener('click', () => alignTableEditorCells('right'));
    }
    if (tableEditorDeleteRowBtn) {
        tableEditorDeleteRowBtn.addEventListener('click', deleteTableEditorRows);
    }

    [tableEditorNumber, tableEditorCaption, tableEditorUnit].forEach((field) => {
        if (field) {
            field.addEventListener('input', updateTableEditorCaption);
        }
    });
}

function openTableEditor(index = 0, options = {}) {
    const items = getTableEditorItems();

    if (!tableEditorDialog || items.length === 0) {
        addProcessingLog('No tables available to edit.', 'warning');
        return;
    }

    tableEditorPreviewCleanup = options.previewCleanup !== false;
    tableEditorPreviousFocus = document.activeElement;
    tableEditorDialog.hidden = false;

    renderTableEditor(index);

    if (tableEditorCaption) {
        tableEditorCaption.focus();
    }
}

function closeTableEditor() {
    if (!tableEditorDialog || tableEditorDialog.hidden) {
        return;
    }

    tableEditorDialog.hidden = true;
    if (tableEditorCanvas) {
        tableEditorCanvas.innerHTML = '';
    }
    tableEditorPreviewCleanup = false;
    if (tableEditorPreviousFocus && typeof tableEditorPreviousFocus.focus === 'function') {
        tableEditorPreviousFocus.focus();
    }
    tableEditorPreviousFocus = null;
}

function removeEmptyFooterPlaceholder(event) {
    if (event.inputType !== 'insertText' || event.data === null) {
        return;
    }

    const paragraph = getEmptyFooterParagraphAtSelection();

    if (!paragraph) {
        return;
    }

    event.preventDefault();
    replaceEmptyFooterPlaceholder(paragraph, event.data);
}

function replaceEmptyFooterPlaceholderOnPaste(event) {
    const paragraph = getEmptyFooterParagraphAtSelection();

    if (!paragraph || !event.clipboardData) {
        return;
    }

    event.preventDefault();
    replaceEmptyFooterPlaceholder(paragraph, event.clipboardData.getData('text/plain'));
}

function getEmptyFooterParagraphAtSelection() {
    const selection = getEditorSelection(tableEditorCanvas);
    const paragraph = selection && selection.rangeCount > 0
        ? getClosestElement(selection.anchorNode, tableEditorCanvas, 'tfoot p')
        : null;

    return paragraph && paragraph.textContent === '\u00a0' ? paragraph : null;
}

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

function handleTableEditorDialogKeydown(event) {
    if (!tableEditorDialog || tableEditorDialog.hidden) {
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

function getTableEditorItems() {
    return Array.from(inputHTML.querySelectorAll('table')).map((table) => {
        return {
            table,
            container: table.closest('div.table-responsive') || table
        };
    });
}

function getLiveTableIndex(liveTable) {
    if (!liveEditor || !liveTable) {
        return 0;
    }

    return Math.max(0, Array.from(liveEditor.querySelectorAll('table')).indexOf(liveTable));
}

function handleLiveEditorTableHover(event) {
    if (liveEditorIsSelectingText || hasLiveEditorTextSelection()) {
        hideLiveTableEditPopover();
        return;
    }

    const table = getClosestElement(event.target, liveEditor, 'table');

    if (!table) {
        hideLiveTableEditPopover();
        return;
    }

    liveTableEditTarget = table;
    positionLiveTableEditPopover();
}

function hasLiveEditorTextSelection() {
    const selection = getEditorSelection(liveEditor);

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return false;
    }

    return liveEditor.contains(selection.anchorNode) || liveEditor.contains(selection.focusNode);
}

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
}

function hideLiveTableEditPopover() {
    liveTableEditTarget = null;

    if (!liveTableEditPopover) {
        return;
    }

    liveTableEditPopover.classList.remove('visible');
}

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

function renderTableEditor(index) {
    const items = getTableEditorItems();

    if (!tableEditorCanvas || items.length === 0) {
        return;
    }

    tableEditorIndex = Math.min(Math.max(index, 0), items.length - 1);
    const item = items[tableEditorIndex];
    const clone = item.container.cloneNode(true);

    clone.querySelectorAll('.selected').forEach((element) => element.classList.remove('selected'));
    tableEditorCanvas.innerHTML = '';
    tableEditorCanvas.appendChild(clone);

    if (tableEditorPreviewCleanup) {
        const table = getTableEditorTable();
        if (table) {
            cleanupTable(table, getTableEditorOptions());
        }
    }

    loadTableEditorCaptionFields();
    updateTableEditorStatus(items.length);
}

function updateTableEditorStatus(tableCount = getTableEditorItems().length) {
    if (tableEditorStatus) {
        tableEditorStatus.textContent = `Table ${tableEditorIndex + 1} of ${tableCount}. Use the Live view Edit table button or double-click a table to edit it here.`;
    }
    if (tableEditorPrevBtn) {
        tableEditorPrevBtn.disabled = tableEditorIndex <= 0;
    }
    if (tableEditorNextBtn) {
        tableEditorNextBtn.disabled = tableEditorIndex >= tableCount - 1;
    }
    if (tableEditorApplyNextBtn) {
        tableEditorApplyNextBtn.disabled = tableEditorIndex >= tableCount - 1;
        tableEditorApplyNextBtn.hidden = tableEditorIndex >= tableCount - 1;
    }
    renderTableEditorPagination(tableCount);
}

function renderTableEditorPagination(tableCount) {
    if (!tableEditorPages) {
        return;
    }

    tableEditorPages.innerHTML = '';

    for (let index = 0; index < tableCount; index++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'table-editor-page-btn';
        button.textContent = String(index + 1);
        button.setAttribute('aria-label', `Edit table ${index + 1}`);

        if (index === tableEditorIndex) {
            button.classList.add('active');
            button.setAttribute('aria-current', 'page');
        }

        button.addEventListener('click', () => {
            renderTableEditor(index);
        });

        tableEditorPages.appendChild(button);
    }
}

function getTableEditorTable() {
    return tableEditorCanvas ? tableEditorCanvas.querySelector('table') : null;
}

function getTableEditorContainer() {
    if (!tableEditorCanvas) {
        return null;
    }

    return tableEditorCanvas.querySelector('div.table-responsive') || getTableEditorTable();
}

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

function updateTableEditorCaption() {
    const table = getTableEditorTable();

    if (!table) {
        return;
    }

    const numberValue = tableEditorNumber ? tableEditorNumber.value.trim() : '';
    const titleValue = tableEditorCaption ? tableEditorCaption.value.trim() : '';
    const unitValue = tableEditorUnit ? tableEditorUnit.value.trim() : '';
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

function handleTableEditorCanvasClick(event) {
    const cell = event.target && event.target.closest ? event.target.closest('th, td') : null;

    if (!cell || !tableEditorCanvas.contains(cell)) {
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

function handleTableEditorCanvasMouseDown(event) {
    const cell = event.target && event.target.closest ? event.target.closest('th, td') : null;

    if (!cell || !tableEditorCanvas.contains(cell)) {
        return;
    }

    tableEditorDragStartCell = cell;
    tableEditorIsDragging = false;
}

function handleTableEditorCanvasMouseOver(event) {
    const cell = event.target && event.target.closest ? event.target.closest('th, td') : null;

    if (!cell || !tableEditorDragStartCell || !tableEditorCanvas.contains(cell)) {
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

function handleTableEditorDocumentMouseUp() {
    tableEditorDragStartCell = null;

    if (!tableEditorIsDragging) {
        return;
    }

    window.setTimeout(() => {
        tableEditorIsDragging = false;
        clearTableEditorTextSelectionForMultiCellSelection();
    }, 0);
}

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

function clearTableEditorTextSelectionForMultiCellSelection() {
    if (getTableEditorSelectedCells().length <= 1) {
        return;
    }

    const selection = window.getSelection ? window.getSelection() : null;

    if (selection && selection.rangeCount > 0) {
        selection.removeAllRanges();
    }
}

function getTableEditorCellPosition(cell) {
    return getTableEditorCellGrid().find((entry) => entry.cell === cell) || null;
}

function getTableEditorCellGrid() {
    const table = getTableEditorTable();
    const rows = table ? Array.from(table.querySelectorAll('tr')) : [];
    const grid = [];

    rows.forEach((row, rowIndex) => {
        Array.from(row.querySelectorAll('th, td')).forEach((cell, columnIndex) => {
            grid.push({
                cell,
                row: rowIndex,
                column: columnIndex
            });
        });
    });

    return grid;
}

function getTableEditorSelectedCells() {
    return tableEditorCanvas ? Array.from(tableEditorCanvas.querySelectorAll('th.selected, td.selected')) : [];
}

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

function getTableEditorOptions() {
    return {
        ...defaultTableCleanupOptions,
        financialTable: tableEditorFinancial ? tableEditorFinancial.checked : defaultTableCleanupOptions.financialTable,
        addScope: true,
        addTfoot: false,
        frenchNumbers: tableEditorFrench ? tableEditorFrench.checked : defaultTableCleanupOptions.frenchNumbers
    };
}

function recleanTableEditorTable() {
    const table = getTableEditorTable();

    if (!table) {
        return;
    }

    updateTableEditorCaption();
    cleanupTable(table, getTableEditorOptions());
    loadTableEditorCaptionFields();
    addProcessingLog('Re-cleaned table in editor.', 'info');
}

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

function toggleTableEditorActiveRows() {
    getTableEditorSelectedRows().forEach((row) => {
        if (row.closest('thead')) {
            return;
        }

        row.classList.toggle('active');
        const firstCell = row.querySelector('th, td');

        if (firstCell) {
            firstCell.setAttribute('scope', row.classList.contains('active') ? 'colgroup' : 'row');
        }
    });
}

function mergeTableEditorRows() {
    getTableEditorSelectedRows().forEach((row) => {
        Array.from(row.querySelectorAll('th, td')).forEach((cell) => cell.classList.add('selected'));
        mergeTableEditorCellsInRow(row);
    });
}

function mergeTableEditorSelectedCells() {
    getTableEditorSelectedRows().forEach(mergeTableEditorCellsInRow);
}

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

function addEmptyTableEditorFooter() {
    const table = getTableEditorTable();

    if (!table) {
        return;
    }

    const tfoot = ensureTableEditorTfoot(table);
    const footerRow = document.createElement('tr');
    const footerCell = document.createElement('td');
    const footerParagraph = document.createElement('p');

    footerRow.classList.add('small');
    footerCell.setAttribute('colspan', String(getTableEditorWidth(table)));
    footerParagraph.textContent = '\u00a0';
    footerCell.appendChild(footerParagraph);
    footerRow.appendChild(footerCell);
    tfoot.appendChild(footerRow);
}

function toggleTableEditorRowsInTfoot() {
    const table = getTableEditorTable();
    const selectedRows = getTableEditorSelectedRows();

    if (!table || selectedRows.length === 0) {
        return;
    }

    const tbody = table.querySelector('tbody') || table.appendChild(document.createElement('tbody'));
    const tfoot = ensureTableEditorTfoot(table);

    selectedRows.forEach((row) => {
        if (row.closest('tfoot')) {
            row.classList.remove('small');
            tbody.appendChild(row);
            return;
        }

        if (row.closest('thead')) {
            return;
        }

        row.classList.add('small');
        tfoot.appendChild(row);
    });

    refreshTableEditorFooterColspans(table);
}

function ensureTableEditorTfoot(table) {
    let tfoot = table.querySelector('tfoot');

    if (!tfoot) {
        tfoot = document.createElement('tfoot');
        table.appendChild(tfoot);
    }

    return tfoot;
}

function refreshTableEditorFooterColspans(table) {
    const width = getTableEditorWidth(table);

    table.querySelectorAll('tfoot tr').forEach((row) => {
        const cells = Array.from(row.querySelectorAll('th, td'));

        if (cells.length === 1) {
            cells[0].setAttribute('colspan', String(width));
        }
    });
}

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

function getTableEditorIndentWrapper(cell, levels) {
    return Array.from(cell.children).find((child) => {
        return levels.some((className) => child.classList.contains(className));
    }) || null;
}

function unwrapTableEditorIndentWrapper(wrapper) {
    const parent = wrapper.parentNode;

    while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
    }

    wrapper.remove();
}

function getTableEditorWidth(table) {
    return Array.from(table.querySelectorAll('tr')).reduce((width, row) => {
        const rowWidth = Array.from(row.querySelectorAll('th, td')).reduce((total, cell) => {
            return total + Number(cell.getAttribute('colspan') || 1);
        }, 0);

        return Math.max(width, rowWidth);
    }, 1);
}

function toggleTableEditorBold() {
    getTableEditorSelectedCells().forEach((cell) => {
        const strong = cell.children.length === 1 && cell.firstElementChild && cell.firstElementChild.tagName.toLowerCase() === 'strong'
            ? cell.firstElementChild
            : null;

        if (strong) {
            while (strong.firstChild) {
                cell.insertBefore(strong.firstChild, strong);
            }
            strong.remove();
            cell.classList.add('fnt-nrml');
            return;
        }

        const wrapper = document.createElement('strong');
        while (cell.firstChild) {
            wrapper.appendChild(cell.firstChild);
        }
        cell.appendChild(wrapper);
        cell.classList.remove('fnt-nrml');
    });
}

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

function deleteTableEditorRows() {
    getTableEditorSelectedRows().forEach((row) => row.remove());
}

function applyTableEditorScopes(table) {
    if (!table) {
        return;
    }

    table.querySelectorAll('thead tr').forEach((row) => {
        row.classList.add('bg-dark', 'text-white');
        row.classList.remove('active');

        Array.from(row.querySelectorAll('th, td')).forEach((cell) => {
            const headerCell = renameTag(cell, 'th');
            headerCell.setAttribute('scope', 'col');
        });
    });

    table.querySelectorAll('tbody tr').forEach((row) => {
        const firstCell = row.querySelector('th, td');

        if (!firstCell) {
            return;
        }

        const rowHeader = renameTag(firstCell, 'th');

        if (rowHeader.hasAttribute('colspan') || row.classList.contains('active')) {
            rowHeader.setAttribute('scope', 'colgroup');
            return;
        }

        if (rowHeader.hasAttribute('rowspan')) {
            rowHeader.setAttribute('scope', 'rowgroup');
            return;
        }

        rowHeader.setAttribute('scope', 'row');
    });
}

function applyTableEditorChanges(moveNext) {
    const items = getTableEditorItems();
    const item = items[tableEditorIndex];
    const editedContainer = getTableEditorContainer();

    if (!item || !editedContainer) {
        return;
    }

    updateTableEditorCaption();
    applyTableEditorScopes(getTableEditorTable());

    const cleanClone = editedContainer.cloneNode(true);
    cleanClone.querySelectorAll('.selected').forEach((element) => {
        element.classList.remove('selected');
        if (element.classList.length === 0) {
            element.removeAttribute('class');
        }
    });

    item.container.replaceWith(cleanClone);
    updateOutputText();
    addProcessingLog(`Applied edits to table ${tableEditorIndex + 1}.`, 'success');

    if (moveNext && tableEditorIndex < getTableEditorItems().length - 1) {
        renderTableEditor(tableEditorIndex + 1);
        return;
    }

    closeTableEditor();
}

function updateAddIDsSettingsState() {
    if (!addIDsSettingsBtn) {
        return;
    }

    const hasCustomSettings = Boolean(
        (onThisPageBox && onThisPageBox.checked) ||
        (headerDepth && headerDepth.value !== '2') ||
        (isToC && isToC.checked)
    );

    addIDsSettingsBtn.classList.toggle('modified', hasCustomSettings);
    addIDsSettingsBtn.setAttribute('aria-label', hasCustomSettings ? 'Add IDs options, modified' : 'Add IDs options');
}

/**
 * Converts the input text into HTML components for better JavaScript compatibility
 */
function convertUsingMammoth(file) {
    const loading = document.getElementById('loader');
    const mammothLibrary = getMammothLibrary();

    if (!mammothLibrary) {
        setFileUploadStatus('Mammoth is not loaded.');
        addProcessingLog('Mammoth is not loaded.', 'danger');
        return;
    }

    var reader = new FileReader();
    reader.onload = function () {
        var arrayBuffer = reader.result;
        clearOutputText();
        if (loading) { loading.classList.remove("hidden"); }
        detectDocxLanguageFromMetadata(arrayBuffer, file.name, mammothLibrary)
            .then(function(languageResult) {
                applyDetectedDocumentLanguage(languageResult);
                return mammothLibrary.convertToHtml({ arrayBuffer: arrayBuffer });
            })
            .then(function(result) {
                var html = result.value;
                var messages = result.messages;
                handleConvertedHTML(html);
                if (messages && messages.length > 0) {
                    addProcessingLog(`Mammoth returned ${messages.length} message(s). Check console for details.`, 'warning');
                    console.warn(messages);
                }
            })
            .catch(function (error) {
                console.error("Mammoth conversion error:", error);
                addProcessingLog('Mammoth conversion error. Check console for details.', 'danger');
            });
    };
    reader.onerror = function (err) {
        console.error("File reading failed:", err);
        addProcessingLog('File reading failed. Check console for details.', 'danger');
    };
    reader.readAsArrayBuffer(file);
}

function detectDocxLanguageFromMetadata(arrayBuffer, fileName, mammothLibrary) {
    if (!/\.docx$/i.test(fileName) || !mammothLibrary || typeof mammothLibrary._openZip !== 'function') {
        return Promise.resolve(null);
    }

    return mammothLibrary._openZip({ arrayBuffer: arrayBuffer })
        .then(function(docxFile) {
            const languageFiles = [
                'word/document.xml',
                'word/styles.xml',
                'word/settings.xml'
            ];

            return Promise.all(languageFiles.map(function(path) {
                if (!docxFile.exists(path)) {
                    return '';
                }

                return docxFile.read(path, 'utf-8');
            }));
        })
        .then(function(xmlParts) {
            return getLanguageResultFromDocxXml({
                documentXml: xmlParts[0],
                stylesXml: xmlParts[1],
                settingsXml: xmlParts[2]
            });
        })
        .catch(function(error) {
            console.warn('Could not read DOCX language metadata:', error);
            addProcessingLog('Could not read DOCX language metadata.', 'warning');
            return null;
        });
}

function getLanguageResultFromDocxXml(xmlParts) {
    const documentCounts = getLanguageCountsFromXml(xmlParts.documentXml || '');
    const defaultLanguage = getDefaultDocxLanguage(xmlParts.stylesXml || '') ||
        getDefaultDocxLanguage(xmlParts.settingsXml || '');
    const explicitLanguage = getExplicitDocumentLanguage(documentCounts, defaultLanguage);
    const language = explicitLanguage || defaultLanguage;

    if (!language) {
        return null;
    }

    return {
        language,
        counts: documentCounts,
        defaultLanguage,
        explicitLanguage
    };
}

function getExplicitDocumentLanguage(languageText, defaultLanguage) {
    const total = languageText.en + languageText.fr;

    if (total === 0) {
        return null;
    }

    const language = languageText.fr > languageText.en ? 'fr' : 'en';
    const winningCount = languageText[language];
    const winningShare = winningCount / total;

    if (!defaultLanguage) {
        return total >= 200 && winningShare >= 0.75 ? language : null;
    }

    if (language === defaultLanguage) {
        return language;
    }

    return winningCount >= 200 && winningShare >= 0.75 ? language : null;
}

function getDefaultDocxLanguage(xml) {
    const docDefaultsMatch = xml.match(/<w:docDefaults\b[\s\S]*?<\/w:docDefaults>/i);
    const docDefaults = docDefaultsMatch ? docDefaultsMatch[0] : '';
    const defaultLanguage = getFirstPrimaryLanguageFromXml(docDefaults);

    if (defaultLanguage) {
        return defaultLanguage;
    }

    const themeLanguageMatch = xml.match(/<w:themeFontLang\b[^>]*>/i);
    if (themeLanguageMatch) {
        return getSupportedLanguageCode(getXmlAttribute(themeLanguageMatch[0], 'w:val'));
    }

    return null;
}

function getFirstPrimaryLanguageFromXml(xml) {
    const languageTagPattern = /<w:lang\b[^>]*>/gi;
    let tagMatch;

    while ((tagMatch = languageTagPattern.exec(xml)) !== null) {
        const language = getSupportedLanguageCode(getXmlAttribute(tagMatch[0], 'w:val'));
        if (language) {
            return language;
        }
    }

    return null;
}

function getLanguageCountsFromXml(xml) {
    const counts = {
        en: 0,
        fr: 0
    };

    const documentXml = stripNonBodyLanguageXml(xml);
    const paragraphPattern = /<w:p\b[\s\S]*?<\/w:p>/gi;
    let paragraphMatch;

    while ((paragraphMatch = paragraphPattern.exec(documentXml)) !== null) {
        const paragraphXml = paragraphMatch[0];
        const paragraphProperties = getFirstXmlBlock(paragraphXml, 'w:pPr');
        const paragraphLanguage = getFirstPrimaryLanguageFromXml(paragraphProperties);
        const runPattern = /<w:r\b[\s\S]*?<\/w:r>/gi;
        let runMatch;

        while ((runMatch = runPattern.exec(paragraphXml)) !== null) {
            const runXml = runMatch[0];
            const runProperties = getFirstXmlBlock(runXml, 'w:rPr');
            const runLanguage = getFirstPrimaryLanguageFromXml(runProperties) || paragraphLanguage;

            if (!runLanguage) {
                continue;
            }

            counts[runLanguage] += getWordTextLength(runXml);
        }
    }

    return counts;
}

function stripNonBodyLanguageXml(xml) {
    return xml
        .replace(/<w:drawing\b[\s\S]*?<\/w:drawing>/gi, '')
        .replace(/<w:pict\b[\s\S]*?<\/w:pict>/gi, '')
        .replace(/<mc:AlternateContent\b[\s\S]*?<\/mc:AlternateContent>/gi, '')
        .replace(/<w:object\b[\s\S]*?<\/w:object>/gi, '');
}

function getFirstXmlBlock(xml, tagName) {
    const pattern = new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'i');
    const match = xml.match(pattern);
    return match ? match[0] : '';
}

function getWordTextLength(xml) {
    let textLength = 0;
    const textPattern = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
    let textMatch;

    while ((textMatch = textPattern.exec(xml)) !== null) {
        textLength += decodeXmlText(textMatch[1]).trim().length;
    }

    return textLength;
}

function decodeXmlText(text) {
    const parser = document.createElement('textarea');
    parser.innerHTML = text;
    return parser.value;
}

function getXmlAttribute(tag, attributeName) {
    const pattern = new RegExp(`\\s${attributeName}="([^"]+)"`, 'i');
    const match = tag.match(pattern);
    return match ? match[1] : '';
}

function getSupportedLanguageCode(languageCode) {
    const normalizedLanguageCode = (languageCode || '').toLowerCase();

    if (normalizedLanguageCode === 'en' || normalizedLanguageCode.startsWith('en-')) {
        return 'en';
    }

    if (normalizedLanguageCode === 'fr' || normalizedLanguageCode.startsWith('fr-')) {
        return 'fr';
    }

    return null;
}

function applyDetectedDocumentLanguage(languageResult) {
    if (!languageResult) {
        addProcessingLog('No English or French DOCX language metadata found.', 'info');
        return;
    }

    const changed = setCommandLanguage(languageResult.language);
    const languageName = languageResult.language === 'en' ? 'English' : 'French';
    const defaultSummary = languageResult.defaultLanguage ? `default ${languageResult.defaultLanguage.toUpperCase()}, ` : '';
    const summary = `${defaultSummary}explicit text EN ${languageResult.counts.en}, FR ${languageResult.counts.fr}`;
    addProcessingLog(`DOCX language metadata indicates ${languageName} (${summary}).${changed ? ' Updated command language.' : ''}`, 'info');
}

/**
 * Perform after the document has been converted to HTML
 * @param {String} html HTML represented as a String
 */
function handleConvertedHTML(html) {
    const loading = document.getElementById('loader');
    inputHTML.innerHTML = html;

    const imgCount = cleanImgSources();
    const bookmarkCount = removeBookmarkTags();
    const hrefCount = cleanBookmarkHrefs();
    normalizeSmartQuotes();

    const conversionTime = getEndTime();
    if (loading) { loading.classList.add("hidden"); }

    setFileUploadStatus(`Converted successfully.`);
    updateOutputText();
    Utils.scrollSmoothTo(outputSection);

    addProcessingLog(`Converted document in ${conversionTime} seconds.`, 'success');
    addProcessingLog(`Initial cleanup: cleared ${imgCount} image src value(s), removed ${bookmarkCount} Word bookmark anchor(s), cleaned ${hrefCount} Word bookmark href(s).`, 'info');
}

/* Commands */

/**
 * Runs the same default cleanup that happens immediately after Mammoth conversion.
 * This is useful after pasting HTML manually, editing the code, or re-running cleanup after import.
 */
function standardCleanupCommand() {
    const debug = document.getElementById('debug');

    console.log('Standard cleanup');

    try {
        syncActiveEditorToInputHTML();

        if (!hasInput()) {
            throw new Error('Input is empty');
        }

        const imgCount = cleanImgSources();
        const bookmarkCount = removeBookmarkTags();
        const hrefCount = cleanBookmarkHrefs();
        normalizeSmartQuotes();

        updateOutputText();
        setDebugMessage(debug, 'Standard cleanup successful', false);
        addProcessingLog(`Standard cleanup successful: cleared ${imgCount} image src value(s), removed ${bookmarkCount} Word bookmark anchor(s), cleaned ${hrefCount} Word bookmark href(s), and normalized smart quotes.`, 'success');
    } catch (e) {
        setDebugMessage(debug, 'Error for Standard cleanup. Input is empty or invalid.', true);
        addProcessingLog('Error for Standard cleanup. Input is empty or invalid.', 'danger');
        console.error(e);
    }
}

/**
 * Generate generic unique IDs for headings, tables, and figures
 */
function addIDsCommand() {
    const debug = document.getElementById('debug');
    modifiedComponents = [];
    headingIDCount = 0;
    tableIDCount = 0;
    figureIDCount = 0;
    try {
        syncActiveEditorToInputHTML();
        modifyHeadings(inputHTML, headingIDCount, modifiedComponents);
        modifyTables(inputHTML, tableIDCount, modifiedComponents);
        modifyFigures(inputHTML, figureIDCount, modifiedComponents);
        if (onThisPageBox.checked) {
            createOnThisPage(inputHTML, isEngLang);
        }

        updateOutputText();
        setDebugMessage(debug, 'Add IDs successful', false);
        addProcessingLog(`Add IDs successful${onThisPageBox.checked ? ' with On this page generated' : ''}.`, 'success');

    } catch (e) {
        setDebugMessage(debug, 'Error for Add IDs. Check console for details', true);
        addProcessingLog('Error for Add IDs. Check console for details.', 'danger');
        console.error(e);
    }
}

/**
 * Generate WET Style footnotes from inputted HTML code
 */
function generateFootnotesCommand() {
    const debug = document.getElementById('debug');
    try {
        syncActiveEditorToInputHTML();
        createBodyFtnTags(inputHTML, langStrings);
        replaceFootnoteSection(inputHTML, langStrings, isEngLang);
        
        updateOutputText();
        setDebugMessage(debug, 'Generate Footnotes successful', false);
        addProcessingLog('Generate Footnotes successful.', 'success');
    } catch (e) {
        setDebugMessage(debug, 'Error for Generate Footnotes. Check console for details', true);
        addProcessingLog('Error for Generate Footnotes. Check console for details.', 'danger');
        console.error(e);
    }
}

/**
 * Validate HTML by adding &nbsp; for specified text
 */
function validateNbspCommand() {
    const debug = document.getElementById('debug');
    try {
        syncActiveEditorToInputHTML();
        setInputHTMLForNbsp(inputHTML);
        inputHTML.innerHTML = fixAllIssues(!isEngLang);
        
        updateOutputText();
        setDebugMessage(debug, 'Validate &nbsp; successful', false);
        addProcessingLog('Validate &nbsp; successful.', 'success');
    } catch (e) {
        setDebugMessage(debug, 'Error for Validate &nbsp;. Check console for details', true);
        addProcessingLog('Error for Validate &nbsp;. Check console for details.', 'danger');
        console.error(e);
    }
}

function tableCleanupCommand() {
    const debug = document.getElementById('debug');
    try {
        syncActiveEditorToInputHTML();
        if (!hasInput()) {
            throw new Error('Input is empty');
        }

        const tableCount = inputHTML.querySelectorAll('table').length;

        if (tableCount === 0) {
            setDebugMessage(debug, 'No tables found', false);
            addProcessingLog('No tables found for Table Cleanup.', 'warning');
            return;
        }

        setDebugMessage(debug, 'Table cleanup opened', false);
        addProcessingLog(`Table cleanup opened. Previewing ${tableCount} table(s); changes apply only after pressing Apply.`, 'info');
        openTableEditor(0);
    } catch (e) {
        setDebugMessage(debug, 'Error for Table Cleanup. Input is empty or invalid.', true);
        addProcessingLog('Error for Table Cleanup. Input is empty or invalid.', 'danger');
        console.error(e);
    }
}

/**
 * Splits the HTML into smaller snippets split by H1s. For each snippet, a button will be created.
 */
function splitByH1Command() {
    const debug = document.getElementById('debug');
    document.getElementById('splits').innerHTML = "";
    try {
        syncActiveEditorToInputHTML();
        const splits = document.getElementById('splits');

        splits.innerHTML = "";
        var sections = splitH1s(inputHTML);
        outputText.value = "";
        for (var s of sections) {
            createOnThisPage(s, isEngLang);
            createSplitButton(s);
            outputText.value += Utils.formattedHTML(s);
        }
        updateCodeHighlight();
        updateInputHTML();
        setDebugMessage(debug, 'Create H1 splits successful', false);
        addProcessingLog(`Create H1 splits successful. Created ${sections.length} section(s).`, 'success');
    } catch (e) {
        setDebugMessage(debug, 'Error for Create H1 splits. Check console for details', true);
        addProcessingLog('Error for Create H1 splits. Check console for details.', 'danger');
        console.error(e);
    }
}

function qaHelperCount() {
    const debug = document.getElementById('debug');
    try {
        syncActiveEditorToInputHTML();
        countTags(inputHTML);
        refreshReviewPanel();
        addProcessingLog('QA Helper count completed.', 'success');
    } catch (e) {
        setDebugMessage(debug, 'Error for QA Helper Count. Check console for details', true);
        addProcessingLog('Error for QA Helper Count. Check console for details.', 'danger');
        console.error(e);
    }
}

/**
 * Removes all src values from img tags
 */
function cleanImgSources() {
    const imgs = inputHTML.querySelectorAll('img');
    for (var img of imgs) {
        img.src = "";
    }
    return imgs.length;
}

/**
 * Removes all a tags that contain IDs starting with "_"
 */
function removeBookmarkTags() {
    const as = inputHTML.querySelectorAll('a[id^="_"]');
    const count = as.length;
    for (var a of as) {
        Utils.stripTag(a);
    }
    return count;
}

/**
 * Empties hrefs of a tags that start with "#_Toc"
 */
function cleanBookmarkHrefs() {
    const as = inputHTML.querySelectorAll('a[href^="#_Toc"]');
    for (var a of as) {
        a.href = "";
    }
    return as.length;
}

/**
 * Normalize smart quotes (“” and ‘’) to regular quotes (" and ')
 */
function normalizeSmartQuotes() {
    inputHTML.innerHTML = inputHTML.innerHTML
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");
}

/**
 * Capture the current time into a global variable
 */
function getStartTime() {
    startTime = performance.now();
}

/**
 * Get the end time and return the difference from the start time
 * @returns The difference between start and end time in seconds to 4 decimal places
 */
function getEndTime() {
    endTime = performance.now();
    var timeDiff = endTime - startTime;
    timeDiff /= 1000.0;
    return timeDiff.toFixed(4);
}

/**
 * Displays inputHTML into output HTML textbox
 */
function updateOutputText() {
    if (!inputHTML.classList.contains("content-area")) {
        inputHTML.classList.add("content-area");
    }
    updateCodeView();
    updateLiveView();
    refreshReviewPanel();
}

/**
 * Copy output text to inputHTML
 */
function updateInputHTML() {
    syncEditorToInputHTML();
    updateOutputText();
}

function syncActiveEditorToInputHTML() {
    if (activeEditorView === 'live') {
        syncLiveToInputHTML();
        return;
    }

    syncEditorToInputHTML();
}

function getHTMLForCopy() {
    if (activeEditorView === 'live') {
        syncLiveToInputHTML();
        updateCodeView();
    } else {
        syncEditorToInputHTML();
    }

    return outputText.value;
}

function syncEditorToInputHTML() {
    Array.from(inputHTML.attributes).forEach(attribute => inputHTML.removeAttribute(attribute.name));
    inputHTML.innerHTML = outputText.value;
    adoptSingleOuterDiv();
    inputHTML.querySelectorAll('.content-area').forEach(element => {
        element.classList.remove('content-area');
        if (element.classList.length === 0) {
            element.removeAttribute('class');
        }
    });
    inputHTML.classList.add("content-area");
}

/**
 * Treat a sole top-level div in the code editor as the document root instead of
 * nesting it inside the internal root div. This preserves its attributes and
 * lets the content-area class be restored directly on that element.
 */
function adoptSingleOuterDiv() {
    const outerDiv = inputHTML.children.length === 1 &&
        inputHTML.firstElementChild.tagName === 'DIV' &&
        Array.from(inputHTML.childNodes).every(node =>
            node === inputHTML.firstElementChild ||
            (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '')
        )
        ? inputHTML.firstElementChild
        : null;

    if (!outerDiv) {
        return;
    }

    const attributes = Array.from(outerDiv.attributes, attribute => [attribute.name, attribute.value]);
    inputHTML.replaceChildren(...outerDiv.childNodes);
    Array.from(inputHTML.attributes).forEach(attribute => inputHTML.removeAttribute(attribute.name));
    attributes.forEach(([name, value]) => inputHTML.setAttribute(name, value));
}

function syncLiveToInputHTML() {
    if (!liveEditor) {
        return;
    }

    const clone = liveEditor.cloneNode(true);
    replaceElementTag(clone, 'b', 'strong');
    replaceElementTag(clone, 'i', 'em');
    removeEmptyStyleAttributes(clone);
    inputHTML.innerHTML = clone.innerHTML;
    inputHTML.classList.add("content-area");
}

function updateCodeView() {
    if (!outputText) {
        return;
    }

    if (!inputHTML.classList.contains("content-area")) {
        inputHTML.classList.add("content-area");
    }

    outputText.value = hasInput() ? Utils.formattedHTML(inputHTML) : '';
    updateElementSyncLineMap();
    updateCodeHighlight();
}

function updateLiveView() {
    if (!liveEditor) {
        return;
    }

    const clone = inputHTML.cloneNode(true);
    clone.querySelectorAll('script, style, link').forEach(element => element.remove());
    liveEditor.innerHTML = hasInput() ? clone.innerHTML : '';
}

function scrollCodeToLiveElement(target) {
    if (!liveEditor || !outputText || !target || !liveEditor.contains(target)) {
        return;
    }

    const liveElement = getLiveSyncElement(target);
    if (!liveElement) {
        return;
    }

    const path = getElementPath(liveElement, liveEditor);
    if (!path) {
        return;
    }

    syncLiveToInputHTML();
    updateCodeView();

    const codeEntry = getCodeEntryForPath(path);
    if (!codeEntry) {
        return;
    }

    scrollCodeToIndex(codeEntry.startIndex);
}

function getLiveSyncElement(target) {
    const element = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
    if (!element || element === liveEditor) {
        return null;
    }

    return element;
}

function scrollLiveToCodeClick(event) {
    if (!liveEditor || !outputText || elementSyncLineMap.length === 0) {
        return;
    }

    const match = getSyncEntryForCodeIndex(outputText.selectionStart || 0);
    if (!match) {
        return;
    }

    const liveElement = getElementByPath(liveEditor, match.path);
    if (!liveElement) {
        return;
    }

    scrollLiveElementIntoView(liveElement);
}

function getCodeEntryForLiveElement(liveElement) {
    const path = getElementPath(liveElement, liveEditor);
    if (!path) {
        return null;
    }

    return getCodeEntryForPath(path);
}

function getCodeEntryForPath(path) {
    const pathKey = path.join('.');
    return elementSyncLineMap.find((entry) => entry.pathKey === pathKey) || null;
}

function scrollEditorsToElementPath(path) {
    if (!path || !Array.isArray(path)) {
        return;
    }

    const liveElement = liveEditor ? getElementByPath(liveEditor, path) : null;
    if (liveElement) {
        scrollLiveElementIntoView(liveElement);
    }

    if (outputText) {
        if (elementSyncLineMap.length === 0) {
            updateElementSyncLineMap();
        }

        const codeEntry = getCodeEntryForPath(path);
        if (codeEntry) {
            scrollCodeToIndex(codeEntry.startIndex);
        }
    }
}

function getSyncEntryForCodeIndex(codeIndex) {
    const containingEntries = elementSyncLineMap
        .filter((entry) => entry.startIndex <= codeIndex && codeIndex <= entry.endIndex)
        .sort((first, second) => {
            if (second.path.length !== first.path.length) {
                return second.path.length - first.path.length;
            }

            return (first.endIndex - first.startIndex) - (second.endIndex - second.startIndex);
        });

    if (containingEntries.length > 0) {
        return containingEntries[0];
    }

    let previous = null;
    for (const entry of elementSyncLineMap) {
        if (entry.startIndex > codeIndex) {
            break;
        }
        previous = entry;
    }

    return previous || elementSyncLineMap[0] || null;
}

function updateElementSyncLineMap() {
    elementSyncLineMap = [];
    if (!outputText || !outputText.value.trim()) {
        return;
    }

    elementSyncLineMap = buildElementSourceMap(outputText.value);
}

function buildElementSourceMap(html) {
    const entries = [];
    const stack = [];
    const documentFrame = {
        path: null,
        childCount: 0,
        entry: null
    };
    const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

    stack.push(documentFrame);

    let index = 0;
    while (index < html.length) {
        const tagStart = html.indexOf('<', index);
        if (tagStart === -1) {
            break;
        }

        if (html.startsWith('<!--', tagStart)) {
            const commentEnd = html.indexOf('-->', tagStart + 4);
            index = commentEnd === -1 ? html.length : commentEnd + 3;
            continue;
        }

        const tagEnd = getTagEndIndex(html, tagStart);
        if (tagEnd === -1) {
            break;
        }

        const tagSource = html.slice(tagStart, tagEnd + 1);
        const tagMatch = tagSource.match(/^<\s*(\/?)\s*([A-Za-z][\w:-]*)/);
        if (!tagMatch) {
            index = tagEnd + 1;
            continue;
        }

        const isClosingTag = tagMatch[1] === '/';
        const tagName = tagMatch[2].toLowerCase();

        if (isClosingTag) {
            closeSourceMapEntry(stack, tagName, tagEnd + 1);
            index = tagEnd + 1;
            continue;
        }

        const parentFrame = stack[stack.length - 1] || documentFrame;
        const childIndex = parentFrame.childCount;
        parentFrame.childCount += 1;
        const path = parentFrame.path === null ? [] : parentFrame.path.concat(childIndex);
        const isRootWrapper = path.length === 0;
        const isSelfClosing = /\/\s*>$/.test(tagSource) || voidTags.has(tagName);
        const entry = isRootWrapper ? null : {
            tagName,
            path,
            pathKey: path.join('.'),
            startIndex: tagStart,
            openEndIndex: tagEnd + 1,
            endIndex: tagEnd + 1
        };

        if (entry) {
            entries.push(entry);
        }

        if (!isSelfClosing) {
            stack.push({
                tagName,
                path,
                childCount: 0,
                entry
            });
        } else if (entry) {
            entry.endIndex = tagEnd + 1;
        }

        index = tagEnd + 1;
    }

    return entries;
}

function closeSourceMapEntry(stack, tagName, endIndex) {
    for (let index = stack.length - 1; index > 0; index -= 1) {
        const frame = stack[index];
        stack.pop();
        if (frame.entry) {
            frame.entry.endIndex = endIndex;
        }
        if (frame.tagName === tagName) {
            return;
        }
    }
}

function getTagEndIndex(html, tagStart) {
    let quote = null;

    for (let index = tagStart + 1; index < html.length; index += 1) {
        const char = html[index];
        if (quote) {
            if (char === quote) {
                quote = null;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }

        if (char === '>') {
            return index;
        }
    }

    return -1;
}

function getElementPath(element, root) {
    if (!element || !root || element === root || !root.contains(element)) {
        return null;
    }

    const path = [];
    let current = element;

    while (current && current !== root) {
        const parent = current.parentElement;
        if (!parent) {
            return null;
        }

        path.unshift(Array.from(parent.children).indexOf(current));
        current = parent;
    }

    return path;
}

function getElementByPath(root, path) {
    return path.reduce((current, index) => {
        if (!current || !current.children || !current.children[index]) {
            return null;
        }

        return current.children[index];
    }, root);
}

function scrollCodeToIndex(codeIndex) {
    outputText.scrollTop = getCodeScrollTopForIndex(codeIndex);
    syncCodeHighlightScroll();
}

function getCodeScrollTopForIndex(codeIndex) {
    const style = window.getComputedStyle(outputText);
    const mirror = document.createElement('div');
    const marker = document.createElement('span');
    const mirroredProperties = [
        'boxSizing',
        'fontFamily',
        'fontSize',
        'fontStyle',
        'fontWeight',
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

    mirroredProperties.forEach((property) => {
        mirror.style[property] = style[property];
    });
    mirror.style.overflowWrap = style.overflowWrap;
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.left = '-9999px';
    mirror.style.top = '0';
    mirror.style.width = `${outputText.clientWidth}px`;
    mirror.style.minHeight = '0';
    mirror.style.height = 'auto';
    mirror.style.overflow = 'hidden';

    marker.textContent = '\u200b';
    marker.style.display = 'inline-block';

    mirror.appendChild(document.createTextNode(outputText.value.slice(0, codeIndex)));
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const targetTop = Math.max(0, marker.offsetTop - (outputText.clientHeight * 0.28));
    mirror.remove();

    return targetTop;
}

function scrollLiveElementIntoView(element) {
    const editorRect = liveEditor.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetTop = Math.max(0, liveEditor.scrollTop + (elementRect.top - editorRect.top) - (liveEditor.clientHeight * 0.16));

    liveEditor.scrollTop = targetTop;
}

function updateCodeHighlight() {
    if (!codeHighlight || !outputText) {
        return;
    }

    const code = codeHighlight.querySelector('code') || codeHighlight;
    code.innerHTML = highlightHTML(outputText.value);
    syncCodeHighlightScroll();
}

function syncCodeHighlightScroll() {
    if (!codeHighlight || !outputText) {
        return;
    }

    codeHighlight.scrollTop = outputText.scrollTop;
    codeHighlight.scrollLeft = outputText.scrollLeft;
}

function highlightHTML(html) {
    const escaped = escapeHTML(html);

    return escaped.replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?&gt;)/g, (match, comment, bracket, tagName, attributes, closeBracket) => {
        if (comment) {
            return `<span class="syntax-comment">${comment}</span>`;
        }

        const highlightedAttributes = attributes.replace(/([^\s=\/&]+)(=)(&quot;.*?&quot;|&#039;.*?&#039;|[^\s&]+)?/g, (attributeMatch, name, equals, value = '') => {
            return `<span class="syntax-attr">${name}</span>${equals}<span class="syntax-value">${value}</span>`;
        });

        return `<span class="syntax-bracket">${bracket}</span><span class="syntax-name">${tagName}</span><span class="syntax-tag">${highlightedAttributes}${closeBracket}</span>`;
    });
}

/**
 * Clear output HTML textbox
 */
function clearOutputText() {
    outputText.value = " ";
    updateCodeHighlight();
    if (liveEditor) {
        liveEditor.innerHTML = "";
    }
    refreshReviewPanel();
}

function getMammothLibrary() {
    if (window.mammoth && typeof window.mammoth.convertToHtml === 'function') {
        return window.mammoth;
    }

    if (typeof mammoth !== 'undefined' && mammoth && typeof mammoth.convertToHtml === 'function') {
        return mammoth;
    }

    return null;
}

function setFileUploadStatus() {}

/**
 * Phase 1 review panel helpers
 */
function refreshReviewPanel() {
    updateDocumentHealth();
    updateHeadingOutline();
    updateIssues();
    updateHtmlPreview();
}

function updateDocumentHealth() {
    if (!documentHealth || !healthScore) {
        return;
    }

    const stats = getDocumentStats();
    if (!hasInput()) {
        healthScore.className = 'label label-default';
        healthScore.textContent = 'Not checked';
        documentHealth.innerHTML = '<p class="text-muted">Document report will appear here after conversion or editing.</p>';
        return;
    }

    const issueTotal = stats.emptyLinks + stats.missingHeadingIds + stats.missingTableIds + stats.missingFigureIds + stats.headingSkips;
    let statusText = 'Looks clean';
    let statusClass = 'label-success';
    if (issueTotal === 0) {
        statusText = 'Looks clean';
        statusClass = 'label-success';
    } else if (issueTotal <= 3) {
        statusText = 'Review suggested';
        statusClass = 'label-warning';
    } else {
        statusText = 'Needs review';
        statusClass = 'label-danger';
    }

    healthScore.className = `label ${statusClass}`;
    healthScore.textContent = statusText;

    documentHealth.innerHTML = `
        <div class="report-summary">
            <span class="label ${statusClass}">${statusText}</span>
            <span class="text-muted">${issueTotal} review item${issueTotal === 1 ? '' : 's'}</span>
        </div>
        <dl class="report-stats">
            <div><dt>Headings</dt><dd>${stats.headings}</dd></div>
            <div><dt>Tables</dt><dd>${stats.tables}</dd></div>
            <div><dt>Figures</dt><dd>${stats.figures}</dd></div>
            <div><dt>Images</dt><dd>${stats.images}</dd></div>
            <div><dt>Links</dt><dd>${stats.links}</dd></div>
            <div><dt>Footnotes</dt><dd>${stats.footnoteRefs}</dd></div>
        </dl>`;
}

function updateHeadingOutline() {
    if (!documentOutline) {
        return;
    }

    const headings = Array.from(inputHTML.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    if (headings.length === 0) {
        documentOutline.innerHTML = '<div class="report-block"><strong>Outline</strong><p class="text-muted">No headings found yet.</p></div>';
        return;
    }

    const outline = document.createElement('ol');
    outline.className = 'report-outline';

    headings.forEach((heading) => {
        const level = Number(heading.tagName.substring(1));
        const path = getElementPath(heading, inputHTML);
        const item = document.createElement('li');
        const button = document.createElement('button');
        const label = document.createElement('span');

        item.style.marginLeft = `${Math.max(0, level - 1) * 12}px`;
        button.type = 'button';
        button.className = 'report-outline-button';
        button.innerHTML = `<span class="label label-default">${heading.tagName.toLowerCase()}</span>`;
        label.textContent = heading.textContent.trim() || '(empty heading)';
        button.append(' ', label);
        button.addEventListener('click', () => {
            scrollEditorsToElementPath(path);
        });

        item.appendChild(button);
        outline.appendChild(item);
    });

    documentOutline.innerHTML = '';
    const heading = document.createElement('strong');
    heading.textContent = 'Outline';
    heading.className = 'report-heading';
    documentOutline.appendChild(heading);
    documentOutline.appendChild(outline);
}

function updateIssues() {
    if (!documentIssues) {
        return;
    }

    const stats = getDocumentStats();
    const issues = [];

    if (!hasInput()) {
        documentIssues.innerHTML = '<p class="text-muted">Items to review will appear here.</p>';
        return;
    }

    if (stats.emptyLinks > 0) {
        issues.push(`${stats.emptyLinks} empty or missing link href value(s).`);
    }
    if (stats.missingHeadingIds > 0) {
        issues.push(`${stats.missingHeadingIds} heading(s) missing an ID.`);
    }
    if (stats.missingTableIds > 0) {
        issues.push(`${stats.missingTableIds} table(s) missing an ID.`);
    }
    if (stats.missingFigureIds > 0) {
        issues.push(`${stats.missingFigureIds} figure(s) missing an ID.`);
    }
    if (stats.headingSkips > 0) {
        issues.push(`${stats.headingSkips} possible heading level skip(s).`);
    }
    if (stats.imagesMissingAlt > 0) {
        issues.push(`${stats.imagesMissingAlt} image(s) with missing alt attribute. Empty alt may be valid for decorative images.`);
    }

    if (issues.length === 0) {
        documentIssues.innerHTML = '<p class="text-success">No obvious structural issues found.</p>';
        return;
    }

    documentIssues.innerHTML = `<ul>${issues.map(issue => `<li>${escapeHTML(issue)}</li>`).join('')}</ul>`;
}

function updateHtmlPreview() {
    if (!htmlPreview) {
        return;
    }

    if (!hasInput()) {
        htmlPreview.innerHTML = '<p class="text-muted">A lightweight rendered preview will appear here.</p>';
        return;
    }

    const clone = inputHTML.cloneNode(true);
    clone.querySelectorAll('script, style, link').forEach(element => element.remove());
    htmlPreview.innerHTML = clone.innerHTML;
}

function getDocumentStats() {
    const headings = Array.from(inputHTML.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const tables = Array.from(inputHTML.querySelectorAll('table'));
    const figures = Array.from(inputHTML.querySelectorAll('figure'));
    const images = Array.from(inputHTML.querySelectorAll('img'));
    const links = Array.from(inputHTML.querySelectorAll('a'));

    return {
        headings: headings.length,
        tables: tables.length,
        figures: figures.length,
        images: images.length,
        links: links.length,
        footnoteRefs: inputHTML.querySelectorAll('sup a, a[href^="#fn"], a[href^="#ftn"]').length,
        emptyLinks: links.filter(link => !link.getAttribute('href') || link.getAttribute('href').trim() === '').length,
        missingHeadingIds: headings.filter(heading => !heading.id).length,
        missingTableIds: tables.filter(table => !table.id).length,
        missingFigureIds: figures.filter(figure => !figure.id).length,
        imagesMissingAlt: images.filter(img => !img.hasAttribute('alt')).length,
        headingSkips: getHeadingSkipCount(headings)
    };
}

function getHeadingSkipCount(headings) {
    let skips = 0;
    let previousLevel = null;

    headings.forEach((heading) => {
        const currentLevel = Number(heading.tagName.substring(1));
        if (previousLevel !== null && currentLevel > previousLevel + 1) {
            skips += 1;
        }
        previousLevel = currentLevel;
    });

    return skips;
}

function hasInput() {
    return inputHTML.textContent.trim() !== '' || inputHTML.children.length > 0;
}

function setDebugMessage() {}

function isActivityPanelOpen() {
    return Boolean(processingLogPanel && processingLogPanel.classList.contains('open'));
}

function setActivityPanelOpen(isOpen) {
    if (!processingLogPanel) {
        return;
    }

    processingLogPanel.classList.toggle('open', isOpen);
    processingLogPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    if (activityToggleBtn) {
        activityToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
}

function addProcessingLog(message, type = 'info') {
    if (!processingLog) {
        return;
    }

    if (logCount === 0) {
        processingLog.innerHTML = '';
    }

    logCount += 1;

    const item = document.createElement('li');
    const labelClass = type === 'success' ? 'label-success' : type === 'warning' ? 'label-warning' : type === 'danger' ? 'label-danger' : 'label-info';
    const labelText = type === 'success' ? 'Done' : type === 'warning' ? 'Warning' : type === 'danger' ? 'Error' : 'Info';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    item.className = 'mrgn-bttm-sm';
    item.innerHTML = `<span class="label ${labelClass}">${labelText}</span> <span class="text-muted">${time}</span> ${escapeHTML(message)}`;
    processingLog.insertBefore(item, processingLog.firstChild);

    if (!isActivityPanelOpen()) {
        showActivityToast(message, type, labelText);
    }
}

function showActivityToast(message, type, labelText) {
    if (!toastRegion) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.innerHTML = `<strong>${escapeHTML(labelText)}</strong><span>${escapeHTML(message)}</span>`;
    toastRegion.prepend(toast);

    while (toastRegion.children.length > 3) {
        toastRegion.lastElementChild.remove();
    }

    setTimeout(() => {
        toast.remove();
    }, 4200);
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Whenever window scrolls, check if Go to Top button should appear
 */
window.onscroll = () => {
    Utils.showGoToTopButton();
};
