/**
 * Convert a Word document into HTML code using the Mammoth library.
 * https://github.com/mwilliamson/mammoth.js/
 * 
 * Author: Jordan Chou
 */

/* Import JS */
import { modifyHeadings, modifyFigures, modifyTables, createOnThisPage } from './commands/anchors-aweigh.js';
import { createBodyFtnTags, replaceFootnoteSection } from './commands/footnote-generator.js';
import { fixNbspHTML } from './commands/nbsp.js';
import { cleanupTable, defaultTableCleanupOptions, renameTag } from './commands/table-cleanup.js';
import { collapseAll, setCodeTheme, countTags, qaHelperTagsDefault, setUpPresetBtns } from './commands/qa-helper.js';

import { engStrings, frStrings } from './strings.js';
import * as Utils from './util.js';
import { DocumentStore } from './document/document-store.js';
import { runStandardCleanup } from './document/cleanup.js';
import { analyzeDocument, isCleanedTable } from './review/analyzer.js';
import { createDeferredWork } from './app/deferred-work.js';
import { CommandRegistry } from './commands/command-registry.js';
import {
    applySmartComponent,
    convertSelectionToComponent,
    defaultComponentLibrary,
    parseComponentLibrary,
    serializeComponentLibrary
} from './commands/component-library.js';
import { createTableEditorController } from './table-editor/controller.js';
import { readFileAsArrayBuffer, getMammothLibrary, convertWithMammoth } from './conversion/mammoth-adapter.js';
import { getLanguageResultFromDocxXml } from './conversion/docx-language.js';
import { createJSONStorage } from './ui/storage.js';
import { createOnboardingController } from './ui/onboarding.js';
import {
    createWetLiveEditor,
    focusWetLiveEditorFromHost,
    isWetLiveEditorOverlayTarget
} from './ui/wet-live-editor.js';
import { createDrawerControllers } from './ui/drawers.js';
import { buildElementSourceMap, getElementPath, getElementByPath } from './app/editor-source-map.js';

/* HTML Elements */
const file = document.getElementById('file');
const outputSection = document.getElementById('outputSection');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
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
const componentLibraryBtn = document.getElementById('componentLibraryBtn');
const componentLibraryModal = document.getElementById('componentLibraryModal');
const componentLibraryDialog = document.getElementById('componentLibraryDialog');
const componentLibraryCloseBtn = document.getElementById('componentLibraryCloseBtn');
const componentLibraryOptionsBtn = document.getElementById('componentLibraryOptionsBtn');
const componentLibraryOptionsMenu = document.getElementById('componentLibraryOptionsMenu');
const componentLibraryList = document.getElementById('componentLibraryList');
const componentLibraryName = document.getElementById('componentLibraryName');
const componentPreviewPanel = document.getElementById('componentPreviewPanel');
const componentPreviewTitle = document.getElementById('componentPreviewTitle');
const componentPreviewFrame = document.getElementById('componentPreviewFrame');
const componentImportBtn = document.getElementById('componentImportBtn');
const componentExportBtn = document.getElementById('componentExportBtn');
const componentImportFile = document.getElementById('componentImportFile');
const componentCreatorToggleBtn = document.getElementById('componentCreatorToggleBtn');
const componentCreatorForm = document.getElementById('componentCreatorForm');
const componentCreatorName = document.getElementById('componentCreatorName');
const componentCreatorDescription = document.getElementById('componentCreatorDescription');
const componentCreatorTemplate = document.getElementById('componentCreatorTemplate');
const componentCreatorError = document.getElementById('componentCreatorError');
const componentCreatorCancelBtn = document.getElementById('componentCreatorCancelBtn');
const componentCreatorSaveBtn = document.getElementById('componentCreatorSaveBtn');
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
const reviewFlagsToggle = document.getElementById('reviewFlagsToggle');
const htmlPreview = document.getElementById('htmlPreview');
const healthScore = document.getElementById('healthScore');
let selectedOutlineType = 'headings';
const outlineTypes = {
    headings: { label: 'Headings', selector: 'h1, h2, h3, h4, h5, h6', empty: 'No headings found yet.' },
    tables: { label: 'Tables', selector: 'table', empty: 'No tables found yet.' },
    figures: { label: 'Figures', selector: 'figure', empty: 'No figures found yet.' },
    images: { label: 'Images', selector: 'img', empty: 'No images found yet.' },
    links: { label: 'Links', selector: 'a', empty: 'No links found yet.' },
    footnotes: { label: 'Footnotes', selector: 'sup a, a[href^="#fn"], a[href^="#ftn"]', empty: 'No footnotes found yet.' }
};
const reviewTabs = document.querySelectorAll('[data-review-tab]');
const workflowTabs = document.querySelectorAll('[data-workflow-tab]');
const standardCleanupBtn = document.getElementById('standardCleanupBtn');
const fileDropZone = document.getElementById('fileDropZone');
const railUploadBtn = document.getElementById('railUploadBtn');
const onboardingUploadBtn = document.getElementById('onboardingUploadBtn');
const onboardingInstructionsBtn = document.getElementById('onboardingInstructionsBtn');
const onboardingBlankBtn = document.getElementById('onboardingBlankBtn');
const editorOnboarding = document.getElementById('editorOnboarding');
const documentLoader = document.getElementById('loader');
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
const documentUndoBtn = document.getElementById('documentUndoBtn');
const documentRedoBtn = document.getElementById('documentRedoBtn');
const tableEditorElements = {
    liveTableEditPopover: liveEditor ? liveEditor.getRootNode().getElementById('tableEditPopover') : null,
    liveTableComponentPopover: liveEditor ? liveEditor.getRootNode().getElementById('tableComponentPopover') : null,
    tableEditorSnapGuides: document.querySelectorAll('.table-editor-snap-guide'),
    optionHelpButtons: document.querySelectorAll('.option-help[data-tooltip]'),
    toastRegion,
    ...Object.fromEntries([
        'tableEditorDialog', 'tableEditorResizeHandle', 'tableEditorFullscreenBtn',
        'tableEditorCloseBtn', 'tableEditorCancelBtn', 'tableEditorApplyBtn',
        'tableEditorComponentBtn',
        'tableEditorApplyNextBtn', 'tableEditorFirstBtn', 'tableEditorPrevBtn',
        'tableEditorNextBtn', 'tableEditorLastBtn', 'tableEditorPages',
        'tableEditorUndoBtn', 'tableEditorRedoBtn',
        'tableEditorDeselectBtn', 'tableEditorScopingModeBtn', 'tableEditorHeaderBtn', 'tableEditorMergeRowBtn',
        'tableEditorMergeCellsBtn', 'tableEditorActiveBtn', 'tableEditorAddFooterBtn',
        'tableEditorTfootBtn', 'tableEditorIndentBtn', 'tableEditorOutdentBtn',
        'tableEditorBoldBtn', 'tableEditorLeftBtn', 'tableEditorCenterBtn',
        'tableEditorRightBtn', 'tableEditorDeleteRowBtn', 'tableEditorStatus',
        'tableEditorCanvas', 'tableEditorNumber', 'tableEditorCaption',
        'tableEditorUnit', 'tableEditorNumberSuggestion', 'tableEditorCaptionSuggestion',
        'tableEditorUnitSuggestion', 'tableEditorComplexScoping', 'tableEditorFinancial', 'tableEditorFrench',
        'optionTooltip'
    ].map((id) => [id, document.getElementById(id)]))
};

// Local HTML for input
const inputHTML = document.createElement('div');
const documentStore = new DocumentStore(inputHTML);
let pendingTypingView = null;
const deferredTypingRefresh = createDeferredWork(() => {
    const sourceView = pendingTypingView;
    pendingTypingView = null;
    if (sourceView === 'live') {
        syncLiveToInputHTML();
        scheduleDocumentHistoryCommit('typing');
        updateCodeView();
    } else if (sourceView === 'code') {
        syncEditorToInputHTML();
        scheduleDocumentHistoryCommit('typing');
        updateLiveView();
        updateCodeHighlight();
    }
    refreshReviewPanel();
}, 500);

function scheduleTypingRefresh(sourceView) {
    pendingTypingView = sourceView;
    deferredTypingRefresh.schedule();
}

function cancelPendingTypingRefresh() {
    if (pendingTypingView === null) return;
    pendingTypingView = null;
    deferredTypingRefresh.cancel();
}
const commandRegistry = new CommandRegistry()
    .register('document.standardCleanup', { label: 'Standard cleanup', execute: standardCleanupCommand })
    .register('document.addIds', { label: 'Add IDs', execute: addIDsCommand })
    .register('document.generateFootnotes', { label: 'Generate footnotes', execute: generateFootnotesCommand })
    .register('document.fixSpacing', { label: 'Validate non-breaking spaces', execute: validateNbspCommand })
    .register('document.convertSelectionToComponent', { label: 'Convert to component', execute: convertToComponentCommand })
    .register('table.openCleanup', { label: 'Table cleanup', execute: tableCleanupCommand });

/* Global Variables */
// Elapsed time
var startTime, endTime;
var modifiedComponents = [];
var headingIDCount, tableIDCount, figureIDCount = 0;
var logCount = 0;
var activeEditorView = 'live';
var elementSyncLineMap = [];
var lastLiveSelectionRange = null;
var lastCodeComponentChildPath = null;
var lastLiveComponentChild = null;
var livePaneWidthRatio = null;
var liveEditorIsSelectingText = false;
const documentHistory = [''];
const documentHistoryActions = ['Initial state'];
let documentHistoryIndex = 0;
let documentHistoryTimer = null;
let documentHistoryRestoring = false;
let documentHistoryLastSource = null;
let documentHistoryLastTime = 0;
let activeDocumentCommandLabel = null;
const uiPreferences = createJSONStorage(window.localStorage, 'propel');
const sessionPreferences = createJSONStorage(window.sessionStorage, 'propel');
const onboarding = createOnboardingController({
    card: editorOnboarding,
    blankButton: onboardingBlankBtn,
    preferences: sessionPreferences
});
const componentLibraryStorageKey = 'componentLibrary';
let activeComponentLibrary = loadComponentLibrary();
let activeComponentId = activeComponentLibrary.components[0]?.id || null;
let pendingComponentSelection = null;
const paneSplitterStorageKey = 'livePaneWidthRatio';
const paneSplitterSnapRatios = [1 / 2, 2 / 3];
const paneSplitterSnapZone = 24;

// Footnote generator
var isEngLang = true;
var langStrings = engStrings;

const tableEditor = createTableEditorController({
    elements: tableEditorElements,
    inputHTML,
    liveEditor,
    liveEditorHost,
    uiPreferences,
    cleanupTable,
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
    commitTableChanges: () => {
        activeDocumentCommandLabel = 'Apply table edits';
        updateOutputText();
    },
    openComponentLibraryForTable,
    isLiveEditorSelectingText: () => liveEditorIsSelectingText,
    isEnglish: () => isEngLang
});

const drawers = createDrawerControllers({
    activity: {
        panel: processingLogPanel,
        toggleButton: activityToggleBtn,
        closeButton: activityCloseBtn
    },
    shortcuts: {
        dialog: shortcutHelpDialog,
        toggleButton: shortcutHelpBtn,
        instructionsButton: onboardingInstructionsBtn,
        closeButton: shortcutHelpCloseBtn,
        backdrop: shortcutHelpBackdrop
    },
    onActivityChange: () => {
        updateLiveReviewFlagVisibility();
        tableEditor.updateToastPosition();
    }
});

/* Main */
createListeners();
createModernDashboardListeners();
drawers.bind();
onboarding.bind();

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
renderComponentLibrary();
updateLanguageSwitch();

/* Functions */

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

    if (reviewFlagsToggle) {
        reviewFlagsToggle.addEventListener('change', updateLiveReviewFlagVisibility);
    }

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
        standardCleanupBtn.addEventListener('click', () => commandRegistry.execute('document.standardCleanup'));
    }

    tableEditor.createListeners();

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
            liveEditorHost.addEventListener('focus', (event) => {
                focusWetLiveEditorFromHost(event, liveEditorHost, liveEditor);
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
            scheduleTypingRefresh('live');
            rememberLiveSelection();
            updateBlockFormatSelect();
        });

        liveEditor.addEventListener('click', (event) => {
            scrollCodeToLiveElement(event.target);
        });

        liveEditor.addEventListener('mousedown', () => {
            liveEditorIsSelectingText = true;
            tableEditor.hideLiveTablePopover();
        });
        liveEditor.addEventListener('mouseup', () => {
            window.setTimeout(() => {
                liveEditorIsSelectingText = false;
            }, 0);
        });
        liveEditor.addEventListener('mousemove', tableEditor.handleLiveTableHover);
        liveEditor.addEventListener('scroll', tableEditor.positionLiveTablePopover);
        liveEditor.addEventListener('mouseleave', (event) => {
            const overlays = [tableEditorElements.liveTableEditPopover, tableEditorElements.liveTableComponentPopover];
            if (isWetLiveEditorOverlayTarget(event.relatedTarget, overlays)) {
                return;
            }
            tableEditor.hideLiveTablePopover();
        });

        if (tableEditorElements.liveTableEditPopover) {
            tableEditorElements.liveTableEditPopover.addEventListener('click', tableEditor.openHoveredLiveTable);
            tableEditorElements.liveTableEditPopover.addEventListener('mouseleave', (event) => {
                if (liveEditor.contains(event.relatedTarget)) {
                    return;
                }
                tableEditor.hideLiveTablePopover();
            });
        }
        if (tableEditorElements.liveTableComponentPopover) {
            tableEditorElements.liveTableComponentPopover.addEventListener('mouseleave', (event) => {
                if (liveEditor.contains(event.relatedTarget)) return;
                tableEditor.hideLiveTablePopover();
            });
        }

        liveEditor.addEventListener('dblclick', (event) => {
            if (tableEditor.isOpen()) {
                return;
            }

            const table = getClosestElement(event.target, liveEditor, 'table');
            if (!table) {
                return;
            }

            const tableIndex = tableEditor.getLiveTableIndex(table);
            if (tableIndex < 0) {
                return;
            }

            event.preventDefault();
            syncLiveToInputHTML();
            tableEditor.open(tableIndex);
        });

        liveEditor.addEventListener('blur', () => {
            deferredTypingRefresh.flush();
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

/** Activates the requested review tab and its associated pane. */
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
    updateLiveReviewFlagVisibility();
}

/** Opens activity review tab. */
function openActivityReviewTab() {
    drawers.activity.setOpen(true);
    switchReviewTab('issuesPane');
}

/** Returns pane resize metrics. */
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

/** Reports whether pane splitter stacked. */
function isPaneSplitterStacked() {
    return window.matchMedia('(orientation: portrait) and (min-width: 768px)').matches;
}

/** Refreshes pane splitter orientation. */
function updatePaneSplitterOrientation() {
    paneSplitter.setAttribute('aria-orientation', isPaneSplitterStacked() ? 'horizontal' : 'vertical');
    updatePaneSnapGuides();
}

/** Refreshes pane snap guides. */
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

/** Shows active pane snap. */
function showActivePaneSnap(ratio) {
    paneSnapGuides.forEach((guide) => {
        const guideRatio = Number(guide.dataset.snapRatio);
        guide.classList.toggle('active', paneSplitterSnapRatios.includes(ratio) && Math.abs(guideRatio - ratio) < 0.0001);
    });
}

/** Constrains pane width ratio. */
function clampPaneWidthRatio(ratio) {
    const metrics = getPaneResizeMetrics();

    if (!Number.isFinite(ratio) || metrics.availableSize <= 0 || metrics.availableSize <= metrics.minPaneSize * 2) {
        return null;
    }

    return Math.min(Math.max(ratio, metrics.minRatio), metrics.maxRatio);
}

/** Snaps pane width ratio. */
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

/** Sets the Live pane size from a constrained split ratio. */
function setLivePaneWidthFromRatio(ratio) {
    const nextRatio = clampPaneWidthRatio(ratio);

    if (nextRatio === null) {
        return;
    }

    livePaneWidthRatio = nextRatio;
    const size = getPaneResizeMetrics().availableSize * nextRatio;
    editorDropZone.style.setProperty('--live-pane-width', `${size}px`);
}

/** Applies saved pane splitter location. */
function applySavedPaneSplitterLocation() {
    try {
        const savedRatio = uiPreferences.get(paneSplitterStorageKey);

        if (savedRatio !== null) {
            setLivePaneWidthFromRatio(Number(savedRatio));
        }
    } catch (error) {
        console.warn('Could not restore pane splitter location.', error);
    }
}

/** Applies current pane splitter location. */
function applyCurrentPaneSplitterLocation() {
    if (livePaneWidthRatio !== null) {
        setLivePaneWidthFromRatio(livePaneWidthRatio);
    }
}

/** Saves pane splitter location. */
function savePaneSplitterLocation() {
    if (livePaneWidthRatio === null) {
        return;
    }

    try {
        uiPreferences.set(paneSplitterStorageKey, livePaneWidthRatio);
    } catch (error) {
        console.warn('Could not save pane splitter location.', error);
    }
}

/** Starts pane resize. */
function startPaneResize(event) {
    event.preventDefault();
    paneSplitter.setPointerCapture(event.pointerId);
    paneSplitter.classList.add('drag-active');
    editorDropZone.classList.add('pane-resizing');
    codeEditor?.classList.add('is-resizing');
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
        codeEditor?.classList.remove('is-resizing');
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

    [railUploadBtn, onboardingUploadBtn].forEach((button) => {
        if (button && file) {
            button.addEventListener('click', () => file.click());
        }
    });

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
                commandRegistry.execute('document.addIds');
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

    if (componentLibraryBtn && componentLibraryDialog) {
        componentLibraryBtn.addEventListener('pointerdown', captureComponentSelection);
        componentLibraryBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            openComponentLibrary();
        });
        componentLibraryDialog.addEventListener('click', event => event.stopPropagation());
        componentPreviewPanel?.addEventListener('click', event => event.stopPropagation());
        componentLibraryModal?.addEventListener('click', closeComponentLibrary);
        componentLibraryCloseBtn?.addEventListener('click', closeComponentLibrary);
        componentLibraryOptionsBtn?.addEventListener('click', toggleComponentLibraryOptions);
        componentImportBtn?.addEventListener('click', () => componentImportFile?.click());
        componentImportFile?.addEventListener('change', importComponentLibrary);
        componentExportBtn?.addEventListener('click', exportComponentLibrary);
        componentCreatorToggleBtn?.addEventListener('click', toggleComponentCreator);
        componentCreatorCancelBtn?.addEventListener('click', closeComponentCreator);
        componentCreatorSaveBtn?.addEventListener('click', saveNewComponent);
        document.querySelectorAll('[data-component-snippet]').forEach(button => {
            button.addEventListener('click', () => insertComponentSnippet(button.getAttribute('data-component-snippet') || ''));
        });
    }

    outputText.addEventListener('input', () => {
        activeEditorView = 'code';
        codeEditor?.classList.add('is-typing');
        scheduleTypingRefresh('code');
    });
    outputText.addEventListener('focus', () => {
        activeEditorView = 'code';
    });
    outputText.addEventListener('blur', () => deferredTypingRefresh.flush());
    outputText.addEventListener('keydown', handleCodeEditorKeydown);
    outputText.addEventListener('scroll', () => {
        syncCodeHighlightScroll();
    });
    outputText.addEventListener('click', (event) => {
        scrollLiveToCodeClick(event);
    });

    // Input box. Use change instead of input so the formatter does not fight the user while typing.
    outputText.addEventListener('change', updateInputHTML);

    [
        [standardCleanupBtn, 'Standard cleanup'],
        [addIDsApplyBtn, 'Add IDs'],
        [footnotesBtn, 'Generate footnotes'],
        [nbspBtn, 'Validate non-breaking spaces']
    ].forEach(([button, commandLabel]) => {
        if (!button) {
            return;
        }

        button.addEventListener('click', () => {
            commitDocumentHistory('typing');
            activeDocumentCommandLabel = commandLabel;
            window.setTimeout(() => {
                if (activeDocumentCommandLabel === commandLabel) {
                    activeDocumentCommandLabel = null;
                }
            }, 0);
        }, { capture: true });
    });

    if (documentUndoBtn) {
        documentUndoBtn.addEventListener('click', undoDocumentChange);
    }
    if (documentRedoBtn) {
        documentRedoBtn.addEventListener('click', redoDocumentChange);
    }

    // Command buttons
    footnotesBtn.addEventListener('click', () => commandRegistry.execute('document.generateFootnotes'));
    nbspBtn.addEventListener('click', () => commandRegistry.execute('document.fixSpacing'));
    tableCleanupBtn.addEventListener('click', () => commandRegistry.execute('table.openCleanup'));

    // QA Helper buttons
    countBtn.addEventListener('click', qaHelperCount);
    collapseBtn.addEventListener('click', collapseAll);
    lightTheme.addEventListener('click', setCodeTheme);
    darkTheme.addEventListener('click', setCodeTheme);
}

/** Loads the last imported component library, falling back to the starter library. */
function loadComponentLibrary() {
    const stored = uiPreferences.get(componentLibraryStorageKey);
    if (!stored) return defaultComponentLibrary;
    try {
        return parseComponentLibrary(JSON.stringify(stored));
    } catch {
        return defaultComponentLibrary;
    }
}

/** Renders every component as an immediately visible action card. */
function renderComponentLibrary() {
    if (!componentLibraryList) return;
    componentLibraryName.textContent = activeComponentLibrary.name;
    if (!activeComponentLibrary.components.some(component => component.id === activeComponentId)) {
        activeComponentId = activeComponentLibrary.components[0]?.id || null;
    }
    componentLibraryList.replaceChildren(...activeComponentLibrary.components.map(component => {
        const card = document.createElement('section');
        card.className = 'component-library-card';
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'component-library-delete-btn';
        deleteButton.title = `Delete ${component.name}`;
        deleteButton.setAttribute('aria-label', `Delete ${component.name}`);
        deleteButton.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="assets/fontawesome/solid.svg#trash-can"></use></svg>';
        deleteButton.addEventListener('click', () => deleteComponent(component));
        const label = document.createElement('strong');
        label.textContent = component.name;
        const description = document.createElement('p');
        description.textContent = component.description || '';
        const actions = document.createElement('div');
        actions.className = 'component-library-card-actions';
        const previewButton = document.createElement('button');
        previewButton.type = 'button';
        previewButton.className = 'btn btn-default btn-sm component-preview-button';
        previewButton.title = `Preview ${component.name}`;
        previewButton.setAttribute('aria-label', `Preview ${component.name}`);
        previewButton.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M1.5 9s2.7-4.5 7.5-4.5S16.5 9 16.5 9 13.8 13.5 9 13.5 1.5 9 1.5 9Z"></path><circle cx="9" cy="9" r="2.25"></circle></svg>';
        previewButton.addEventListener('click', () => previewComponent(component));
        const convertButton = document.createElement('button');
        convertButton.type = 'button';
        convertButton.className = 'btn btn-primary btn-sm';
        convertButton.textContent = 'Convert';
        convertButton.addEventListener('click', () => {
            activeComponentId = component.id;
            commandRegistry.execute('document.convertSelectionToComponent');
        });
        actions.append(previewButton, convertButton);
        card.append(deleteButton, label, description, actions);
        return card;
    }));
}

function getSelectedComponent() {
    return activeComponentLibrary.components.find(component => component.id === activeComponentId) || null;
}

function deleteComponent(component) {
    if (activeComponentLibrary.components.length <= 1) {
        showActivityToast('A component library must contain at least one component.', 'warning');
        return;
    }
    if (!window.confirm(`Delete “${component.name}” from this component library?`)) return;
    const remainingComponents = activeComponentLibrary.components.filter(item => item.id !== component.id);
    const nextLibrary = {
        format: activeComponentLibrary.format,
        version: activeComponentLibrary.version,
        name: activeComponentLibrary === defaultComponentLibrary ? 'My component library' : activeComponentLibrary.name,
        components: remainingComponents
    };
    activeComponentLibrary = parseComponentLibrary(JSON.stringify(nextLibrary));
    activeComponentId = remainingComponents[0]?.id || null;
    uiPreferences.set(componentLibraryStorageKey, activeComponentLibrary);
    renderComponentLibrary();
    showHighlightedContentPreview();
    addProcessingLog(`Deleted component “${component.name}”.`, 'success');
}

/** Captures a selection before focus moves into the component menu. */
function captureComponentSelection() {
    if (activeEditorView === 'code') {
        pendingComponentSelection = {
            view: 'code',
            start: outputText.selectionStart,
            end: outputText.selectionEnd,
            html: outputText.value.slice(outputText.selectionStart, outputText.selectionEnd)
        };
        return;
    }
    const selection = getEditorSelection(liveEditor);
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    pendingComponentSelection = range && !range.collapsed && liveEditor.contains(range.commonAncestorContainer)
        ? { view: 'live', range: range.cloneRange(), html: getRangeHTML(range) }
        : null;
}

function getRangeHTML(range) {
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container.innerHTML;
}

function openComponentLibrary() {
    if (!pendingComponentSelection?.html) {
        addProcessingLog('Select text or HTML before opening the component library.', 'warning');
        showActivityToast('Select content to convert first.', 'warning');
        return;
    }
    componentLibraryModal.classList.add('open');
    componentLibraryBtn.setAttribute('aria-expanded', 'true');
    showHighlightedContentPreview();
    componentLibraryList.querySelector('button')?.focus();
}

/** Opens the shared chooser with a whole table as its conversion context. */
function openComponentLibraryForTable({ html, apply }) {
    pendingComponentSelection = { view: 'table', html, apply };
    openComponentLibrary();
}

function closeComponentLibrary() {
    if (!componentLibraryModal?.classList.contains('open')) return;
    componentLibraryModal.classList.remove('open');
    componentLibraryBtn?.setAttribute('aria-expanded', 'false');
    closeComponentLibraryOptions();
    closeComponentCreator();
    hideComponentPreview();
}

function toggleComponentCreator() {
    if (!componentCreatorForm || !componentCreatorToggleBtn) return;
    const willOpen = componentCreatorForm.hidden;
    componentCreatorForm.hidden = !willOpen;
    componentCreatorToggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) componentCreatorName?.focus();
}

function closeComponentCreator() {
    if (componentCreatorForm) componentCreatorForm.hidden = true;
    componentCreatorToggleBtn?.setAttribute('aria-expanded', 'false');
    if (componentCreatorError) {
        componentCreatorError.hidden = true;
        componentCreatorError.textContent = '';
    }
}

function insertComponentSnippet(snippet) {
    if (!componentCreatorTemplate) return;
    const start = componentCreatorTemplate.selectionStart;
    const end = componentCreatorTemplate.selectionEnd;
    componentCreatorTemplate.setRangeText(snippet, start, end, 'end');
    componentCreatorTemplate.focus();
}

function getUniqueComponentId(name) {
    const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'component';
    const ids = new Set(activeComponentLibrary.components.map(component => component.id));
    let id = base;
    let suffix = 2;
    while (ids.has(id)) id = `${base}-${suffix++}`;
    return id;
}

function saveNewComponent() {
    const name = componentCreatorName?.value.trim() || '';
    const template = componentCreatorTemplate?.value.trim() || '';
    const component = {
        id: getUniqueComponentId(name),
        name,
        description: componentCreatorDescription?.value.trim() || '',
        template
    };
    const nextLibrary = {
        format: activeComponentLibrary.format,
        version: activeComponentLibrary.version,
        name: activeComponentLibrary === defaultComponentLibrary ? 'My component library' : activeComponentLibrary.name,
        components: [...activeComponentLibrary.components, component]
    };
    try {
        activeComponentLibrary = parseComponentLibrary(JSON.stringify(nextLibrary));
        activeComponentId = component.id;
        uiPreferences.set(componentLibraryStorageKey, activeComponentLibrary);
        renderComponentLibrary();
        componentCreatorName.value = '';
        componentCreatorDescription.value = '';
        componentCreatorTemplate.value = '';
        closeComponentCreator();
        addProcessingLog(`Created component “${component.name}”.`, 'success');
    } catch (error) {
        componentCreatorError.textContent = error.message;
        componentCreatorError.hidden = false;
    }
}

function toggleComponentLibraryOptions() {
    if (!componentLibraryOptionsMenu || !componentLibraryOptionsBtn) return;
    const willOpen = componentLibraryOptionsMenu.hidden;
    componentLibraryOptionsMenu.hidden = !willOpen;
    componentLibraryOptionsBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) componentLibraryOptionsMenu.querySelector('button')?.focus();
}

function closeComponentLibraryOptions() {
    if (componentLibraryOptionsMenu) componentLibraryOptionsMenu.hidden = true;
    componentLibraryOptionsBtn?.setAttribute('aria-expanded', 'false');
}

function previewComponent(component) {
    activeComponentId = component.id;
    if (!component || !pendingComponentSelection?.html || !componentPreviewFrame) return;
    const converted = applySmartComponent(component, pendingComponentSelection.html, { language: isEngLang ? 'en' : 'fr' });
    renderComponentPreview(converted, component.name);
}

function showHighlightedContentPreview() {
    if (!pendingComponentSelection?.html) return;
    renderComponentPreview(pendingComponentSelection.html, '');
}

function renderComponentPreview(html, title) {
    if (componentPreviewTitle) componentPreviewTitle.textContent = title;
    componentPreviewFrame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="css/wet-boew.min.css"><link rel="stylesheet" href="css/theme.min.css"><style>body{margin:0;padding:12px;background:#fff;zoom:.70}.component-preview-root{max-width:100%}.component-preview-root img{max-width:100%;height:auto}</style></head><body><main class="component-preview-root">${html}</main></body></html>`;
}

function hideComponentPreview() {
    if (componentPreviewTitle) componentPreviewTitle.textContent = '';
    if (componentPreviewFrame) componentPreviewFrame.removeAttribute('srcdoc');
}

async function importComponentLibrary() {
    const selectedFile = componentImportFile?.files?.[0];
    if (!selectedFile) return;
    try {
        activeComponentLibrary = parseComponentLibrary(await selectedFile.text());
        uiPreferences.set(componentLibraryStorageKey, activeComponentLibrary);
        renderComponentLibrary();
        showHighlightedContentPreview();
        addProcessingLog(`Imported component library “${activeComponentLibrary.name}” with ${activeComponentLibrary.components.length} component(s).`, 'success');
        closeComponentLibraryOptions();
    } catch (error) {
        addProcessingLog(`Could not import component library: ${error.message}`, 'danger');
    } finally {
        componentImportFile.value = '';
    }
}

function exportComponentLibrary() {
    const blob = new Blob([serializeComponentLibrary(activeComponentLibrary)], { type: 'application/json' });
    const link = document.createElement('a');
    const filename = activeComponentLibrary.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'component-library';
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    addProcessingLog(`Exported component library “${activeComponentLibrary.name}”.`, 'success');
    closeComponentLibraryOptions();
}

/**
 * Toggles the switch and language
 */
function toggleLanguage() {
    setCommandLanguage(isEngLang ? 'fr' : 'en');
    addProcessingLog(`Language changed to ${langStrings['LANG_BTN']}.`, 'info');
}

/** Changes command language and reports whether the value changed. */
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

/** Refreshes language switch. */
function updateLanguageSwitch() {
    tableEditor.syncLanguage();

    if (!langBtn) {
        return;
    }

    langBtn.setAttribute('aria-checked', isEngLang ? 'true' : 'false');
    langBtn.setAttribute('aria-label', isEngLang ? 'Command language: English' : 'Command language: French');
    langBtn.querySelectorAll('[data-language-option]').forEach((option) => {
        option.classList.toggle('active', option.getAttribute('data-language-option') === (isEngLang ? 'en' : 'fr'));
    });
}

/** Activates Live or Code view and synchronizes content before focus moves. */
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

/** Runs WYSIWYG command. */
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

/** Runs a browser editing command as one synchronized document change. */
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

/** Runs block format command. */
function runBlockFormatCommand(value) {
    if (!liveEditor || !value) {
        return;
    }

    if (activeEditorView !== 'live') {
        switchEditorView('live');
    }

    runLiveEditCommand('formatBlock', value, getBlockFormatLabel(value));
}

/** Refreshes block format select. */
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

/** Returns current block format. */
function getCurrentBlockFormat(node) {
    const block = getClosestElement(node, liveEditor, 'h1, h2, h3, h4, h5, h6, p');
    return block ? block.tagName.toLowerCase() : 'p';
}

/** Returns block format label. */
function getBlockFormatLabel(value) {
    if (value === 'p') {
        return 'Paragraph';
    }

    return `Heading ${value.substring(1)}`;
}

/** Returns WYSIWYG button label. */
function getWysiwygButtonLabel(button) {
    return button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent.trim();
}

/** Handles live editor keydown. */
function handleLiveEditorKeydown(event) {
    if (handleDocumentHistoryShortcut(event)) {
        return;
    }

    const selectionDirection = getComponentSelectionDirection(event);
    if (selectionDirection) {
        event.preventDefault();
        event.stopPropagation();
        selectLiveEditorComponent(selectionDirection);
        return;
    }

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

    runLiveEditCommand(shortcut.command, shortcut.value ?? null, shortcut.label);
}

/** Combines adjacent Live editor components at a boundary while preserving the caret. */
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

/** Returns live editor component. */
function getLiveEditorComponent(node) {
    let component = node && node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (component && component.parentElement !== liveEditor) {
        component = component.parentElement;
    }
    return component && component.parentElement === liveEditor ? component : null;
}

/** Reports whether caret at component edge. */
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

/** Ensures Enter creates paragraph blocks instead of browser-specific div wrappers. */
function preserveParagraphsOnEnter(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    document.execCommand('formatBlock', false, 'p');
    document.execCommand('insertParagraph', false, null);
}

/** Returns live editor shortcut. */
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

    if (primaryKey && !event.altKey && event.shiftKey && (key === ' ' || event.code === 'Space')) {
        return { command: 'insertHTML', value: '&nbsp;', label: 'Non-breaking space' };
    }

    if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) {
        return {
            command: event.shiftKey ? 'outdent' : 'indent',
            label: event.shiftKey ? 'Decrease list indent' : 'Increase list indent'
        };
    }

    return null;
}

/** Handles code editor keydown. */
function handleCodeEditorKeydown(event) {
    if (handleDocumentHistoryShortcut(event)) {
        return;
    }

    const key = (event.key || '').toLowerCase();

    const selectionDirection = getComponentSelectionDirection(event);
    if (selectionDirection) {
        event.preventDefault();
        event.stopPropagation();
        activeEditorView = 'code';
        selectCodeEditorComponent(selectionDirection);
        return;
    }

    if (event.altKey && !event.ctrlKey && !event.metaKey && (key === 'w' || event.code === 'KeyW')) {
        event.preventDefault();
        activeEditorView = 'code';
        wrapCodeEditorSelectionWithTag();
        return;
    }

    if (event.ctrlKey !== event.metaKey && !event.altKey && event.shiftKey && (key === ' ' || event.code === 'Space')) {
        event.preventDefault();
        event.stopPropagation();
        activeEditorView = 'code';
        outputText.setRangeText('&nbsp;', outputText.selectionStart, outputText.selectionEnd, 'end');
        syncCodeEditorAfterProgrammaticEdit();
        scheduleDocumentHistoryCommit('typing');
        addProcessingLog('Inserted non-breaking space in Code view.', 'info');
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

/** Returns component selection direction. */
function getComponentSelectionDirection(event) {
    const hasPrimaryModifier = event.ctrlKey !== event.metaKey;
    if (!hasPrimaryModifier || event.altKey || event.shiftKey) {
        return null;
    }

    if (event.key === '[' || event.code === 'BracketLeft') {
        return 'parent';
    }
    if (event.key === ']' || event.code === 'BracketRight') {
        return 'child';
    }
    return null;
}

/** Selects code editor component. */
function selectCodeEditorComponent(direction) {
    if (!outputText) {
        return;
    }
    if (elementSyncLineMap.length === 0) {
        updateElementSyncLineMap();
    }

    const start = outputText.selectionStart || 0;
    const end = outputText.selectionEnd || start;
    const selectedEntry = elementSyncLineMap.find(entry =>
        entry.startIndex === start && entry.endIndex === end
    );
    const currentEntry = selectedEntry || getSyncEntryForCodeIndex(start);
    if (!currentEntry) {
        return;
    }

    let targetEntry = null;
    if (direction === 'parent' && currentEntry.path.length > 1) {
        lastCodeComponentChildPath = currentEntry.path.slice();
        targetEntry = getCodeEntryForPath(currentEntry.path.slice(0, -1));
    } else if (direction === 'child') {
        const rememberedChild = lastCodeComponentChildPath &&
            lastCodeComponentChildPath.length === currentEntry.path.length + 1 &&
            currentEntry.path.every((part, index) => part === lastCodeComponentChildPath[index])
            ? getCodeEntryForPath(lastCodeComponentChildPath)
            : null;
        targetEntry = rememberedChild || elementSyncLineMap.find(entry =>
            entry.path.length === currentEntry.path.length + 1 &&
            currentEntry.path.every((part, index) => part === entry.path[index])
        );
    }

    if (!targetEntry) {
        return;
    }
    outputText.setSelectionRange(targetEntry.startIndex, targetEntry.endIndex);
    scrollCodeToIndex(targetEntry.startIndex);
}

/** Selects live editor component. */
function selectLiveEditorComponent(direction) {
    const selection = getEditorSelection(liveEditor);
    if (!selection || selection.rangeCount === 0) {
        return;
    }

    const range = selection.getRangeAt(0);
    let current = getExactlySelectedElement(range) ||
        (range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement);
    if (!current || current === liveEditor || !liveEditor.contains(current)) {
        return;
    }

    let target = null;
    if (direction === 'parent') {
        target = current.parentElement === liveEditor ? null : current.parentElement;
        if (target) {
            lastLiveComponentChild = current;
        }
    } else {
        const rememberedChild = lastLiveComponentChild &&
            lastLiveComponentChild.parentElement === current &&
            liveEditor.contains(lastLiveComponentChild)
            ? lastLiveComponentChild
            : null;
        target = rememberedChild || current.firstElementChild;
    }
    if (!target) {
        return;
    }

    const targetRange = document.createRange();
    targetRange.selectNode(target);
    selection.removeAllRanges();
    selection.addRange(targetRange);
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    rememberLiveSelection();
}

/** Returns exactly selected element. */
function getExactlySelectedElement(range) {
    if (!range || range.collapsed || range.startContainer !== range.endContainer ||
        range.startContainer.nodeType !== Node.ELEMENT_NODE ||
        range.endOffset !== range.startOffset + 1) {
        return null;
    }
    const selectedNode = range.startContainer.childNodes[range.startOffset];
    return selectedNode && selectedNode.nodeType === Node.ELEMENT_NODE ? selectedNode : null;
}

/** Handles document history shortcut. */
function handleDocumentHistoryShortcut(event) {
    const key = (event.key || '').toLowerCase();
    const isUndo = key === 'z' && !event.shiftKey;
    const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey);
    if (!(event.ctrlKey || event.metaKey) || event.altKey || (!isUndo && !isRedo)) {
        return false;
    }

    event.preventDefault();
    event.stopPropagation();
    if (isRedo) {
        redoDocumentChange();
    } else {
        undoDocumentChange();
    }
    return true;
}

/** Schedules document history commit. */
function scheduleDocumentHistoryCommit(source = 'typing') {
    window.clearTimeout(documentHistoryTimer);
    documentHistoryTimer = window.setTimeout(() => commitDocumentHistory(source), 400);
}

/** Adds the current canonical HTML to document history when it differs from the active entry. */
function commitDocumentHistory(source = 'command', actionLabel = null) {
    if (documentHistoryRestoring) {
        return;
    }

    window.clearTimeout(documentHistoryTimer);
    const html = inputHTML.innerHTML;
    const now = Date.now();
    if (html === documentHistory[documentHistoryIndex]) {
        return;
    }

    const coalesceTyping = source === 'typing' && documentHistoryLastSource === 'typing' && now - documentHistoryLastTime < 1200;
    const historyAction = actionLabel || (source === 'typing' ? 'Edit document' : 'Change document');
    if (coalesceTyping) {
        documentHistory[documentHistoryIndex] = html;
        documentHistoryActions[documentHistoryIndex] = historyAction;
    } else {
        documentHistory.splice(documentHistoryIndex + 1);
        documentHistoryActions.splice(documentHistoryIndex + 1);
        documentHistory.push(html);
        documentHistoryActions.push(historyAction);
        if (documentHistory.length > 100) {
            documentHistory.shift();
            documentHistoryActions.shift();
        }
        documentHistoryIndex = documentHistory.length - 1;
    }

    documentHistoryLastSource = source;
    documentHistoryLastTime = now;
    documentStore.touch(historyAction, { source });
    updateDocumentHistoryButtons();
}

/** Undoes document change. */
function undoDocumentChange() {
    commitDocumentHistory('typing');
    if (documentHistoryIndex <= 0) {
        return;
    }
    const undoneAction = documentHistoryActions[documentHistoryIndex] || 'Change document';
    restoreDocumentHistory(documentHistoryIndex - 1);
    showActivityToast(`Undid ${undoneAction}.`, 'success', 'Undo');
}

/** Redoes document change. */
function redoDocumentChange() {
    if (documentHistoryIndex >= documentHistory.length - 1) {
        return;
    }
    const nextIndex = documentHistoryIndex + 1;
    const redoneAction = documentHistoryActions[nextIndex] || 'Change document';
    restoreDocumentHistory(nextIndex);
    showActivityToast(`Redid ${redoneAction}.`, 'success', 'Redo');
}

/** Restores a document-history entry across the canonical store and both editor views. */
function restoreDocumentHistory(index) {
    documentHistoryRestoring = true;
    documentHistoryIndex = index;
    documentStore.replaceHTML(documentHistory[index], { source: 'history', historyIndex: index });
    inputHTML.classList.add('content-area');
    updateCodeView();
    updateLiveView();
    refreshReviewPanel();
    documentHistoryRestoring = false;
    documentHistoryLastSource = 'history';
    updateDocumentHistoryButtons();
}

/** Refreshes document history buttons. */
function updateDocumentHistoryButtons() {
    if (documentUndoBtn) {
        documentUndoBtn.disabled = documentHistoryIndex <= 0;
    }
    if (documentRedoBtn) {
        documentRedoBtn.disabled = documentHistoryIndex >= documentHistory.length - 1;
    }
}

/** Wraps code editor selection with tag. */
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

/** Parses code editor wrap tag. */
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

/** Indents code editor selection. */
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

/** Synchronizes code editor after programmatic edit. */
function syncCodeEditorAfterProgrammaticEdit() {
    syncEditorToInputHTML();
    updateLiveView();
    refreshReviewPanel();
    updateCodeHighlight();
}

/** Returns shortcut digit. */
function getShortcutDigit(event) {
    if (/^[0-6]$/.test(event.key)) {
        return event.key;
    }

    const match = /^Digit([0-6])$/.exec(event.code || '');
    return match ? match[1] : null;
}

/** Reports whether shortcut digit. */
function isShortcutDigit(event, digit) {
    return event.key === digit || event.code === `Digit${digit}`;
}

/** Returns selected list item. */
function getSelectedListItem(root, selection = getEditorSelection(root)) {
    if (!root || !selection || selection.rangeCount === 0) {
        return null;
    }

    return getClosestElement(selection.anchorNode, root, 'li');
}

/** Returns editor selection. */
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

/** Returns closest element. */
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

/** Replaces element tag. */
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

/** Removes empty style attributes. */
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

/** Returns text selection range. */
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

/** Remembers live selection. */
function rememberLiveSelection() {
    const selectionRange = getTextSelectionRange(liveEditor);
    if (selectionRange) {
        lastLiveSelectionRange = selectionRange;
    }
}

/** Restores text selection range. */
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
        addProcessingLog('No file selected.', 'warning');
        return;
    }

    processSelectedFile(file.files[0]);
}

/** Handles file drop. */
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

/** Validates a selected Word file before starting conversion. */
function processSelectedFile(selectedFile) {
    if (!selectedFile) {
        updateFileDropZoneState(false);
        addProcessingLog('No file selected.', 'warning');
        return;
    }

    closeOpenUIForFileUpload();

    const validExtension = /\.docx?$/i.test(selectedFile.name);
    if (!validExtension) {
        updateFileDropZoneState(false);
        addProcessingLog('Unsupported file type. Please use a .docx file.', 'danger');
        return;
    }

    if (!getMammothLibrary()) {
        addProcessingLog('Mammoth is not loaded. Check that src/mammoth.browser.js is loading before propel.js.', 'danger');
        return;
    }

    getStartTime();
    updateFileDropZoneState(true);
    addProcessingLog(`Started conversion: ${selectedFile.name}`, 'info');
    convertUsingMammoth(selectedFile);
}

/** Dismisses UI tied to the previous document before a new upload begins. */
function closeOpenUIForFileUpload() {
    drawers.activity.setOpen(false);
    drawers.shortcuts.close();
    closeAddIDsSettings();
    closeComponentLibrary();
    tableEditor.close();
    tableEditor.hideLiveTablePopover();
}

/** Refreshes file drop zone state. */
function updateFileDropZoneState(hasFile) {
    if (fileDropZone) {
        fileDropZone.classList.toggle('has-file', hasFile);
    }

    onboarding.update(hasFile);
}

/**
 * Perform actions whenever On this page checkbox is pressed
 */
function handleToggleOnThisPageBox() {
    addProcessingLog(`${onThisPageBox.checked ? 'Enabled' : 'Disabled'} On this page generation.`, 'info');
    updateAddIDsSettingsState();
}

/** Toggles add IDs settings. */
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

/** Positions the Add IDs dialog relative to its trigger. */
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

/** Closes add IDs settings. */
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

/** Synchronizes Add IDs trigger expansion state for accessibility. */
function setAddIDsPopoverExpanded(isOpen) {
    [addIDsBtn, addIDsSettingsBtn].forEach((trigger) => {
        if (trigger) {
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    });
}

/** Handles global keydown. */
function handleGlobalKeydown(event) {
    if (tableEditor.isOpen() && isDocumentHistoryShortcut(event)) {
        tableEditor.handleHistoryShortcut(event);
        return;
    }

    if (isDocumentHistoryShortcut(event) && !isNativeHistoryField(event.target)) {
        handleDocumentHistoryShortcut(event);
        return;
    }

    if (event.key === 'Escape') {
        if (componentLibraryModal?.classList.contains('open')) {
            closeComponentLibrary();
            return;
        }
        drawers.shortcuts.close();
        tableEditor.handleEscape();
    }
}

/** Reports whether document history shortcut. */
function isDocumentHistoryShortcut(event) {
    const key = (event.key || '').toLowerCase();
    return Boolean(
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        (
            key === 'z' ||
            (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey)
        )
    );
}

/** Reports whether native history field. */
function isNativeHistoryField(target) {
    if (!target || !target.closest) {
        return false;
    }

    return Boolean(target.closest('input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, [contenteditable="true"]'));
}

/** Returns focusable elements. */
function getFocusableElements(root) {
    return Array.from(root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((element) => element.offsetParent !== null);
}

/** Refreshes add IDs settings state. */
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
async function convertUsingMammoth(file) {
    const mammothLibrary = getMammothLibrary();

    if (!mammothLibrary) {
        addProcessingLog('Mammoth is not loaded.', 'danger');
        return;
    }

    setDocumentLoading(true);

    try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        clearOutputText();
        applyDetectedDocumentLanguage(await detectDocxLanguageFromMetadata(arrayBuffer, file.name, mammothLibrary));
        const { html, messages } = await convertWithMammoth(mammothLibrary, arrayBuffer);
        handleConvertedHTML(html);
        if (messages.length > 0) {
            addProcessingLog(`Mammoth returned ${messages.length} message(s). Check console for details.`, 'warning');
            console.warn(messages);
        }
    } catch (error) {
        console.error('Mammoth conversion error:', error);
        addProcessingLog('Mammoth conversion error. Check console for details.', 'danger');
    } finally {
        setDocumentLoading(false);
    }
}

/** Shows document conversion progress and exposes the busy state to assistive technology. */
function setDocumentLoading(isLoading) {
    if (documentLoader) {
        documentLoader.classList.toggle('hidden', !isLoading);
        documentLoader.setAttribute('aria-hidden', String(!isLoading));
    }

    if (editorDropZone) {
        editorDropZone.setAttribute('aria-busy', String(isLoading));
    }
}

/** Reads DOCX language metadata without affecting conversion when metadata is unavailable. */
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

/** Applies detected document language. */
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
    documentStore.replaceHTML(html, { source: 'conversion' });

    const { imageSources: imgCount, bookmarks: bookmarkCount, bookmarkLinks: hrefCount } = runStandardCleanup(inputHTML);

    const conversionTime = getEndTime();
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

    try {
        syncActiveEditorToInputHTML();

        if (!hasInput()) {
            throw new Error('Input is empty');
        }

        const { imageSources: imgCount, bookmarks: bookmarkCount, bookmarkLinks: hrefCount } = runStandardCleanup(inputHTML);

        updateOutputText();
        addProcessingLog(`Standard cleanup successful: cleared ${imgCount} image src value(s), removed ${bookmarkCount} Word bookmark anchor(s), cleaned ${hrefCount} Word bookmark href(s), and normalized smart quotes.`, 'success');
    } catch (e) {
        addProcessingLog('Error for Standard cleanup. Input is empty or invalid.', 'danger');
        console.error(e);
    }
}

/**
 * Generate generic unique IDs for headings, tables, and figures
 */
function addIDsCommand() {
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
        addProcessingLog(`Add IDs successful${onThisPageBox.checked ? ' with On this page generated' : ''}.`, 'success');

    } catch (e) {
        addProcessingLog('Error for Add IDs. Check console for details.', 'danger');
        console.error(e);
    }
}

/**
 * Generate WET Style footnotes from inputted HTML code
 */
function generateFootnotesCommand() {
    try {
        syncActiveEditorToInputHTML();
        createBodyFtnTags(inputHTML, langStrings);
        replaceFootnoteSection(inputHTML, langStrings, isEngLang);
        
        updateOutputText();
        addProcessingLog('Generate Footnotes successful.', 'success');
    } catch (e) {
        addProcessingLog('Error for Generate Footnotes. Check console for details.', 'danger');
        console.error(e);
    }
}

/**
 * Validate HTML by adding &nbsp; for specified text
 */
function validateNbspCommand() {
    try {
        syncActiveEditorToInputHTML();
        documentStore.replaceHTML(fixNbspHTML(inputHTML.innerHTML, !isEngLang), { source: 'document.fixSpacing' });
        
        updateOutputText();
        addProcessingLog('Validate &nbsp; successful.', 'success');
    } catch (e) {
        addProcessingLog('Error for Validate &nbsp;. Check console for details.', 'danger');
        console.error(e);
    }
}

/** Converts the captured Live or Code selection with the chosen component template. */
function convertToComponentCommand() {
    const component = getSelectedComponent();
    try {
        if (!component || !pendingComponentSelection?.html) {
            throw new Error('Select text or HTML before converting it to a component.');
        }
        commitDocumentHistory('typing');
        activeDocumentCommandLabel = `Convert to ${component.name}`;

        if (pendingComponentSelection.view === 'table') {
            pendingComponentSelection.apply(applySmartComponent(component, pendingComponentSelection.html, { language: isEngLang ? 'en' : 'fr' }));
        } else if (pendingComponentSelection.view === 'code') {
            const result = convertSelectionToComponent({
                html: outputText.value,
                selectionStart: pendingComponentSelection.start,
                selectionEnd: pendingComponentSelection.end,
                component,
                language: isEngLang ? 'en' : 'fr'
            });
            outputText.value = result.html;
            syncEditorToInputHTML();
        } else {
            const range = pendingComponentSelection.range;
            if (!range || range.collapsed || !liveEditor.contains(range.commonAncestorContainer)) {
                throw new Error('The Live view selection is no longer available. Select it again.');
            }
            const converted = applySmartComponent(component, pendingComponentSelection.html, { language: isEngLang ? 'en' : 'fr' });
            const fragment = range.createContextualFragment(converted);
            range.deleteContents();
            range.insertNode(fragment);
            syncLiveToInputHTML();
        }

        updateOutputText();
        addProcessingLog(`Converted selection to ${component.name}.`, 'success');
        closeComponentLibrary();
        pendingComponentSelection = null;
    } catch (error) {
        activeDocumentCommandLabel = null;
        addProcessingLog(`Could not convert selection: ${error.message}`, 'danger');
        console.error(error);
    }
}

/** Opens table cleanup when canonical document state contains tables. */
function tableCleanupCommand() {
    try {
        syncActiveEditorToInputHTML();
        if (!hasInput()) {
            throw new Error('Input is empty');
        }

        const tableCount = inputHTML.querySelectorAll('table').length;

        if (tableCount === 0) {
            addProcessingLog('No tables found for Table Cleanup.', 'warning');
            return;
        }

        addProcessingLog(`Table cleanup opened. Previewing ${tableCount} table(s); changes apply only after pressing Apply.`, 'info');
        tableEditor.open(0);
    } catch (e) {
        addProcessingLog('Error for Table Cleanup. Input is empty or invalid.', 'danger');
        console.error(e);
    }
}

/** Counts the configured selectors in canonical document state. */
function qaHelperCount() {
    try {
        syncActiveEditorToInputHTML();
        countTags(inputHTML);
        refreshReviewPanel();
        addProcessingLog('QA Helper count completed.', 'success');
    } catch (e) {
        addProcessingLog('Error for QA Helper Count. Check console for details.', 'danger');
        console.error(e);
    }
}

/**
 * Removes all src values from img tags
 */
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
    const commandLabel = activeDocumentCommandLabel;
    commitDocumentHistory('command', commandLabel);
    activeDocumentCommandLabel = null;
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

/** Synchronizes active editor to input HTML. */
function syncActiveEditorToInputHTML() {
    if (activeEditorView === 'live') {
        syncLiveToInputHTML();
        return;
    }

    syncEditorToInputHTML();
}

/** Returns htmlfor copy. */
function getHTMLForCopy() {
    if (activeEditorView === 'live') {
        syncLiveToInputHTML();
        updateCodeView();
    } else {
        syncEditorToInputHTML();
    }

    return outputText.value;
}

/** Commits Code view content to the canonical document and refreshes dependent views. */
function syncEditorToInputHTML() {
    cancelPendingTypingRefresh();
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

/** Commits Live view content to the canonical document and refreshes dependent views. */
function syncLiveToInputHTML() {
    if (!liveEditor) {
        return;
    }

    cancelPendingTypingRefresh();
    const clone = liveEditor.cloneNode(true);
    clone.querySelectorAll('.review-flag-button').forEach(element => element.remove());
    clone.querySelectorAll('.review-flagged-component, .review-flag-target').forEach((element) => {
        element.classList.remove('review-flagged-component', 'review-flag-error', 'review-flag-target');
        element.removeAttribute('data-review-issues');
        if (!element.className) element.removeAttribute('class');
    });
    replaceElementTag(clone, 'b', 'strong');
    replaceElementTag(clone, 'i', 'em');
    removeEmptyStyleAttributes(clone);
    inputHTML.innerHTML = clone.innerHTML;
    inputHTML.classList.add("content-area");
}

/** Refreshes code view. */
function updateCodeView() {
    if (!outputText) {
        return;
    }

    if (!inputHTML.classList.contains("content-area")) {
        inputHTML.classList.add("content-area");
    }

    outputText.value = hasInput() ? Utils.formattedHTML(inputHTML) : '';
    updateFileDropZoneState(hasInput());
    updateElementSyncLineMap();
    updateCodeHighlight();
}

/** Refreshes live view. */
function updateLiveView() {
    if (!liveEditor) {
        return;
    }

    const clone = inputHTML.cloneNode(true);
    clone.querySelectorAll('script, style, link').forEach(element => element.remove());
    liveEditor.innerHTML = hasInput() ? clone.innerHTML : '';
    updateFileDropZoneState(hasInput());
}

/** Scrolls code to live element. */
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

/** Returns live sync element. */
function getLiveSyncElement(target) {
    const element = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
    if (!element || element === liveEditor) {
        return null;
    }

    return element;
}

/** Scrolls live to code click. */
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

/** Returns code entry for path. */
function getCodeEntryForPath(path) {
    const pathKey = path.join('.');
    return elementSyncLineMap.find((entry) => entry.pathKey === pathKey) || null;
}

/** Scrolls editors to element path. */
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

/** Returns sync entry for code index. */
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

/** Refreshes element sync line map. */
function updateElementSyncLineMap() {
    elementSyncLineMap = [];
    if (!outputText || !outputText.value.trim()) {
        return;
    }

    elementSyncLineMap = buildElementSourceMap(outputText.value);
}

/** Scrolls code to index. */
function scrollCodeToIndex(codeIndex) {
    outputText.scrollTop = getCodeScrollTopForIndex(codeIndex);
    syncCodeHighlightScroll();
}

/** Returns code scroll top for index. */
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

/** Scrolls live element into view. */
function scrollLiveElementIntoView(element) {
    const editorRect = liveEditor.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetTop = Math.max(0, liveEditor.scrollTop + (elementRect.top - editorRect.top) - (liveEditor.clientHeight * 0.16));

    liveEditor.scrollTop = targetTop;
}

/** Refreshes code highlight. */
function updateCodeHighlight() {
    if (!codeHighlight || !outputText) {
        return;
    }

    const code = codeHighlight.querySelector('code') || codeHighlight;
    code.innerHTML = highlightHTML(outputText.value);
    codeEditor?.classList.remove('is-typing');
    syncCodeHighlightScroll();
}

/** Synchronizes code highlight scroll. */
function syncCodeHighlightScroll() {
    if (!codeHighlight || !outputText) {
        return;
    }

    codeHighlight.scrollTop = outputText.scrollTop;
    codeHighlight.scrollLeft = outputText.scrollLeft;
}

/** Escapes HTML source and applies syntax-highlighting spans. */
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


/**
 * Phase 1 review panel helpers
 */
function refreshReviewPanel() {
    updateDocumentHealth();
    updateHeadingOutline();
    updateIssues();
    updateHtmlPreview();
    updateLiveReviewFlags();
}

/** Refreshes document health. */
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

    const issueGroups = getDocumentIssueGroups();
    const issueTotal = issueGroups.reduce((total, group) => total + group.targets.length, 0);
    const errorTotal = issueGroups
        .filter(group => group.severity === 'error')
        .reduce((total, group) => total + group.targets.length, 0);
    let statusText = 'Looks clean';
    let statusClass = 'label-success';
    if (issueTotal === 0) {
        statusText = 'Looks clean';
        statusClass = 'label-success';
    } else if (errorTotal === 0) {
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
            <button type="button" class="label ${statusClass} report-review-score" aria-controls="issuesPane">${statusText}</button>
            <span class="text-muted">${issueTotal} review item${issueTotal === 1 ? '' : 's'}</span>
        </div>
        <div class="report-stats" role="group" aria-label="Choose outline contents">
            ${Object.entries(outlineTypes).map(([type, config]) => `
                <button type="button" class="report-stat${selectedOutlineType === type ? ' is-selected' : ''}"
                    data-outline-type="${type}" aria-pressed="${selectedOutlineType === type}">
                    <span class="report-stat-label">${config.label}</span>
                    <span class="report-stat-count">${type === 'footnotes' ? stats.footnoteRefs : stats[type]}</span>
                </button>`).join('')}
        </div>`;

    documentHealth.querySelector('.report-review-score')?.addEventListener('click', openActivityReviewTab);
    documentHealth.querySelectorAll('[data-outline-type]').forEach(button => {
        button.addEventListener('click', () => {
            selectedOutlineType = button.dataset.outlineType;
            updateDocumentHealth();
            updateHeadingOutline();
        });
    });
}

/** Refreshes heading outline. */
function updateHeadingOutline() {
    if (!documentOutline) {
        return;
    }

    const outlineType = outlineTypes[selectedOutlineType] || outlineTypes.headings;
    const elements = Array.from(inputHTML.querySelectorAll(outlineType.selector));
    const outlineHeading = `<strong class="report-heading">${outlineType.label}</strong>`;
    if (elements.length === 0) {
        documentOutline.innerHTML = `${outlineHeading}<p class="text-muted">${outlineType.empty}</p>`;
        return;
    }

    const outline = document.createElement('ol');
    outline.className = 'report-outline';

    elements.forEach((element) => {
        const isHeading = /^H[1-6]$/.test(element.tagName);
        const level = isHeading ? Number(element.tagName.substring(1)) : 1;
        const path = getElementPath(element, inputHTML);
        const item = document.createElement('li');
        const button = document.createElement('button');
        const label = document.createElement('span');

        item.style.marginLeft = `${Math.max(0, level - 1) * 12}px`;
        button.type = 'button';
        button.className = 'report-outline-button';
        button.innerHTML = `<span class="label label-default">${element.tagName.toLowerCase()}</span>`;
        label.textContent = getOutlineElementLabel(element, selectedOutlineType);
        button.append(' ', label);
        button.addEventListener('click', () => {
            scrollEditorsToElementPath(path);
        });

        item.appendChild(button);
        outline.appendChild(item);
    });

    documentOutline.innerHTML = '';
    const heading = document.createElement('strong');
    heading.textContent = outlineType.label;
    heading.className = 'report-heading';
    documentOutline.appendChild(heading);
    documentOutline.appendChild(outline);
}

/** Returns outline element label. */
function getOutlineElementLabel(element, type) {
    if (type === 'images') {
        return element.getAttribute('alt') || element.getAttribute('src') || '(unlabelled image)';
    }
    if (type === 'links' || type === 'footnotes') {
        return element.textContent.trim() || element.getAttribute('href') || '(empty link)';
    }

    const text = element.textContent.replace(/\s+/g, ' ').trim();
    return text || `(empty ${type.slice(0, -1)})`;
}

/** Refreshes issues. */
function updateIssues() {
    if (!documentIssues) {
        return;
    }

    const issueGroups = getDocumentIssueGroups();

    if (!hasInput()) {
        documentIssues.innerHTML = '<p class="text-muted">Items to review will appear here.</p>';
        return;
    }

    if (issueGroups.length === 0) {
        documentIssues.innerHTML = '<p class="text-success">No obvious structural issues found.</p>';
        return;
    }

    const warningCount = issueGroups
        .filter(group => group.severity === 'warning')
        .reduce((total, group) => total + group.targets.length, 0);
    const errorCount = issueGroups
        .filter(group => group.severity === 'error')
        .reduce((total, group) => total + group.targets.length, 0);
    const summary = document.createElement('dl');
    summary.className = 'review-issue-summary';
    [
        ['Warnings', warningCount, 'warning'],
        ['Errors', errorCount, 'error'],
        ['Total', warningCount + errorCount, 'total']
    ].forEach(([label, count, type]) => {
        const stat = document.createElement('div');
        const term = document.createElement('dt');
        const value = document.createElement('dd');
        stat.className = `review-issue-summary-${type}`;
        term.textContent = label;
        value.textContent = String(count);
        stat.append(term, value);
        summary.appendChild(stat);
    });
    const groupsContainer = document.createDocumentFragment();
    issueGroups.forEach((group) => {
        const section = document.createElement('section');
        const header = document.createElement('div');
        const heading = document.createElement('h4');
        const count = document.createElement('span');
        const list = document.createElement('ul');
        const paths = group.targets.map(target => getElementPath(target, inputHTML));
        section.className = 'review-issue-group';
        header.className = 'review-issue-group-header';
        heading.textContent = group.label;
        count.className = 'review-issue-group-count';
        count.textContent = String(group.targets.length);
        header.append(heading, count);
        if (group.action && group.actionLabel) {
            const action = document.createElement('button');
            action.type = 'button';
            action.className = 'btn btn-xs review-issue-action';
            action.textContent = group.actionLabel;
            action.addEventListener('click', () => runReviewIssueAction(group.action, paths));
            header.appendChild(action);
        }
        section.append(header, list);
        group.targets.forEach((target, index) => {
            const item = document.createElement('li');
            const row = document.createElement('button');
            const pill = document.createElement('span');
            const text = document.createElement('span');
            const path = getElementPath(target, inputHTML);
            const issueKey = getReviewIssueKey(group.label, path);
            row.type = 'button';
            row.className = 'report-issue-row';
            row.dataset.reviewIssue = issueKey;
            row.addEventListener('click', () => goToReviewError(path));
            pill.className = `report-issue-pill report-issue-pill-${group.severity}`;
            pill.textContent = group.severity === 'warning' ? 'Warning' : 'Error';
            text.textContent = group.getMessage(target, index);
            row.append(pill, text);
            item.appendChild(row);
            list.appendChild(item);
        });
        groupsContainer.appendChild(section);
    });
    documentIssues.replaceChildren(summary, groupsContainer);
}

/** Returns document issue groups. */
function getDocumentIssueGroups() {
    return analyzeDocument(inputHTML).issueGroups;
}

/** Runs review issue action. */
function runReviewIssueAction(action, paths) {
    const firstPath = paths.find(path => Array.isArray(path));
    if (action === 'addIds') {
        commandRegistry.execute('document.addIds');
        return;
    }
    if (action === 'tableCleanup' && firstPath) {
        syncActiveEditorToInputHTML();
        const table = getElementByPath(inputHTML, firstPath);
        const tableIndex = Array.from(inputHTML.querySelectorAll('table')).indexOf(table);
        if (tableIndex >= 0) {
            drawers.activity.setOpen(false);
            tableEditor.open(tableIndex);
            addProcessingLog(`Table cleanup opened from Review for table ${tableIndex + 1}.`, 'info');
        }
        return;
    }
}

/** Renders review markers beside flagged components in the Live editor. */
function updateLiveReviewFlags() {
    if (!liveEditor) return;

    liveEditor.querySelectorAll('.review-flag-button').forEach(element => element.remove());
    liveEditor.querySelectorAll('.review-flagged-component').forEach((element) => {
        element.classList.remove('review-flagged-component', 'review-flag-error');
        element.removeAttribute('data-review-issues');
    });

    const flaggedComponents = new Map();
    getDocumentIssueGroups().forEach((group) => {
        group.targets.forEach((target) => {
            const path = getElementPath(target, inputHTML);
            let liveTarget = path ? getElementByPath(liveEditor, path) : null;
            if (!liveTarget) return;
            if (liveTarget.matches('table') && liveTarget.parentElement?.matches('.table-responsive')) {
                liveTarget = liveTarget.parentElement;
            } else if (liveTarget.matches('img')) {
                liveTarget = liveTarget.closest('figure') || liveTarget.parentElement;
            }
            if (!liveTarget || liveTarget === liveEditor) return;
            const labels = (liveTarget.dataset.reviewIssues || '').split('|').filter(Boolean);
            if (!labels.includes(group.label)) labels.push(group.label);
            liveTarget.dataset.reviewIssues = labels.join('|');
            liveTarget.classList.add('review-flagged-component');
            if (group.severity === 'error') liveTarget.classList.add('review-flag-error');
            const issueKey = getReviewIssueKey(group.label, path);
            if (!flaggedComponents.has(liveTarget)) flaggedComponents.set(liveTarget, []);
            flaggedComponents.get(liveTarget).push({ issueKey, label: group.label, severity: group.severity });
        });
    });

    flaggedComponents.forEach((issues, liveTarget) => {
        const flag = document.createElement('span');
        const severity = issues.some(issue => issue.severity === 'error') ? 'error' : 'warning';
        const summary = issues.map(issue => `${issue.severity === 'error' ? 'Error' : 'Warning'} — ${issue.label}`).join('; ');
        flag.className = `review-flag-button review-flag-button-${severity}`;
        flag.setAttribute('role', 'button');
        flag.setAttribute('tabindex', '0');
        flag.setAttribute('contenteditable', 'false');
        flag.setAttribute('aria-label', `Open review: ${summary}`);
        flag.setAttribute('title', summary);
        flag.textContent = '⚑';
        if (issues.length > 1) {
            const count = document.createElement('span');
            count.className = 'review-flag-count';
            count.textContent = String(issues.length);
            flag.appendChild(count);
        }
        flag.addEventListener('mousedown', event => event.preventDefault());
        flag.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            openReviewIssue(issues[0].issueKey);
        });
        flag.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            openReviewIssue(issues[0].issueKey);
        });
        liveTarget.appendChild(flag);
    });
    updateLiveReviewFlagVisibility();
}

/** Refreshes live review flag visibility. */
function updateLiveReviewFlagVisibility() {
    if (!liveEditor) return;
    const reviewIsActive = Boolean(document.getElementById('issuesPane')?.classList.contains('active'));
    const shouldShow = drawers.activity.isOpen() && reviewIsActive && (!reviewFlagsToggle || reviewFlagsToggle.checked);
    liveEditor.classList.toggle('review-flags-visible', shouldShow);
}

/** Returns review issue key. */
function getReviewIssueKey(label, path) {
    return `${label}:${Array.isArray(path) ? path.join('.') : ''}`;
}

/** Opens review issue. */
function openReviewIssue(issueKey) {
    drawers.activity.setOpen(true);
    switchReviewTab('issuesPane');
    const row = Array.from(documentIssues?.querySelectorAll('[data-review-issue]') || [])
        .find(item => item.dataset.reviewIssue === issueKey);
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.remove('report-issue-row-target');
    void row.offsetWidth;
    row.classList.add('report-issue-row-target');
    row.focus({ preventScroll: true });
    window.setTimeout(() => row.classList.remove('report-issue-row-target'), 1800);
}

/** Performs the go to review error operation. */
function goToReviewError(path) {
    if (!path || !Array.isArray(path)) return;
    scrollEditorsToElementPath(path);
    let liveTarget = getElementByPath(liveEditor, path);
    if (liveTarget?.matches('table') && liveTarget.parentElement?.matches('.table-responsive')) liveTarget = liveTarget.parentElement;
    if (liveTarget?.matches('img')) liveTarget = liveTarget.closest('figure') || liveTarget.parentElement;
    if (liveTarget) {
        liveTarget.classList.remove('review-flag-target');
        void liveTarget.offsetWidth;
        liveTarget.classList.add('review-flag-target');
        window.setTimeout(() => liveTarget.classList.remove('review-flag-target'), 1800);
    }
}

/** Refreshes HTML preview. */
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

/** Returns document stats. */
function getDocumentStats() {
    return analyzeDocument(inputHTML).stats;
}

/** Reports whether input. */
function hasInput() {
    return inputHTML.textContent.trim() !== '' || inputHTML.children.length > 0;
}


/** Adds processing log. */
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

    if (!drawers.activity.isOpen()) {
        showActivityToast(message, type, labelText);
    }
}

/** Shows activity toast. */
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

/** Escapes HTML. */
function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
