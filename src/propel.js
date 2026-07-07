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
import { saveHTMLToSession } from './commands/send-to-table-cleanup.js';
import { collapseAll, setCodeTheme, countTags, qaHelperTagsDefault, setUpPresetBtns } from './commands/qa-helper.js';

import { engStrings, frStrings } from './strings.js';
import * as Utils from './util.js';

/* HTML Elements */
const file = document.getElementById('file');
const outputSection = document.getElementById('outputSection');
const outputText = document.getElementById('outputText');
const copyArea = document.getElementById('copyArea');
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

// Phase 1 redesign elements. These are optional so the same JS can still run on the old layout.
const processingLog = document.getElementById('processingLog');
const processingLogPanel = document.getElementById('processingLogPanel');
const activityToggleBtn = document.getElementById('activityToggleBtn');
const activityCloseBtn = document.getElementById('activityCloseBtn');
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
const liveEditor = document.getElementById('liveEditor');
const editorDropZone = document.getElementById('editorDropZone');
const editorPanel = document.querySelector('.editor-panel');
const paneSplitter = document.getElementById('paneSplitter');
const codeEditor = document.getElementById('codeEditor');
const codeHighlight = document.getElementById('codeHighlight');
const editorViewButtons = document.querySelectorAll('[data-editor-view]');
const wysiwygButtons = document.querySelectorAll('[data-edit-command]');

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

// Footnote generator
var showFullPreview = false;
var isEngLang = true;
var langStrings = engStrings;

/* Main */
createListeners();
createModernDashboardListeners();

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

/* Functions */


/**
 * Optional listeners for the modern dashboard layout.
 * These are intentionally separate from the core conversion logic.
 */
function createModernDashboardListeners() {
    reviewTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-review-tab');
            document.querySelectorAll('.review-tab').forEach((item) => item.classList.remove('active'));
            document.querySelectorAll('.review-pane').forEach((pane) => pane.classList.remove('active'));
            tab.classList.add('active');
            const pane = document.getElementById(targetId);
            if (pane) {
                pane.classList.add('active');
            }
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

    if (liveEditor) {
        liveEditor.addEventListener('focus', () => {
            activeEditorView = 'live';
            rememberLiveSelection();
        });

        liveEditor.addEventListener('mouseup', rememberLiveSelection);
        liveEditor.addEventListener('keyup', rememberLiveSelection);

        liveEditor.addEventListener('input', () => {
            syncLiveToInputHTML();
            updateCodeView();
            refreshReviewPanel();
            rememberLiveSelection();
        });

        liveEditor.addEventListener('click', (event) => {
            scrollCodeToLiveElement(event.target);
        });

        liveEditor.addEventListener('blur', () => {
            syncLiveToInputHTML();
            updateCodeView();
        });
    }

    document.addEventListener('selectionchange', rememberLiveSelection);

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
        paneSplitter.addEventListener('pointerdown', startPaneResize);
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

function startPaneResize(event) {
    event.preventDefault();
    paneSplitter.setPointerCapture(event.pointerId);
    paneSplitter.classList.add('drag-active');

    const handleMove = (moveEvent) => {
        const rect = editorDropZone.getBoundingClientRect();
        const minPaneWidth = 260;
        const splitterWidth = paneSplitter.offsetWidth || 8;
        const availableWidth = rect.width - splitterWidth;
        const rawWidth = moveEvent.clientX - rect.left;
        const nextWidth = Math.min(Math.max(rawWidth, minPaneWidth), availableWidth - minPaneWidth);
        editorDropZone.style.setProperty('--live-pane-width', `${nextWidth}px`);
    };

    const stopResize = () => {
        paneSplitter.classList.remove('drag-active');
        paneSplitter.removeEventListener('pointermove', handleMove);
        paneSplitter.removeEventListener('pointerup', stopResize);
        paneSplitter.removeEventListener('pointercancel', stopResize);
    };

    paneSplitter.addEventListener('pointermove', handleMove);
    paneSplitter.addEventListener('pointerup', stopResize);
    paneSplitter.addEventListener('pointercancel', stopResize);
}

/**
 * Attaches click listeners to page's buttons
 */
function createListeners() {
    if (file) {
        file.addEventListener('change', handleFileInputChange);
    }
    updateFileDropZoneState(false);

    copyBtn.addEventListener('click', () => {
        syncActiveEditorToInputHTML();
        updateCodeView();
        Utils.copyToClipboard(outputText);
        addProcessingLog('Copied HTML to clipboard.', 'success');
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
    isEngLang = !isEngLang;
    langStrings = isEngLang ? engStrings : frStrings;
    langBtn.textContent = langStrings['LANG_BTN'];
    addProcessingLog(`Language changed to ${langBtn.textContent}.`, 'info');
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
        if (liveEditor) {
            liveEditor.classList.remove('active');
        }
        outputText.focus();
        addProcessingLog('Switched to Code view.', 'info');
        return;
    }

    updateLiveView();
    if (liveEditor) {
        liveEditor.classList.add('active');
        liveEditor.focus();
    }
    if (codeEditor) {
        codeEditor.classList.remove('active');
    }
    addProcessingLog('Switched to Live view.', 'info');
}

function runWysiwygCommand(button) {
    if (!liveEditor) {
        return;
    }

    if (activeEditorView !== 'live') {
        switchEditorView('live');
    }

    const command = button.getAttribute('data-edit-command');
    let value = button.getAttribute('data-edit-value') || null;

    if (command === 'createLink') {
        value = prompt('Link URL');
        if (!value) {
            return;
        }
    }

    const selectionRange = getTextSelectionRange(liveEditor) || lastLiveSelectionRange;
    restoreTextSelectionRange(liveEditor, selectionRange);
    document.execCommand(command, false, value);
    restoreTextSelectionRange(liveEditor, selectionRange);
    syncLiveToInputHTML();
    updateCodeView();
    refreshReviewPanel();
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
    if (command !== 'bold') {
        addProcessingLog(`Applied Live view edit: ${getWysiwygButtonLabel(button)}.`, 'info');
    }
}

function getWysiwygButtonLabel(button) {
    return button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent.trim();
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
    const selection = window.getSelection();
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

    const selection = window.getSelection();
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

    const isOpen = otpSettings.classList.toggle('open');
    setAddIDsPopoverExpanded(isOpen);
    if (addIDsSettingsBackdrop) {
        addIDsSettingsBackdrop.classList.toggle('open', isOpen);
    }
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
}

function setAddIDsPopoverExpanded(isOpen) {
    [addIDsBtn, addIDsSettingsBtn].forEach((trigger) => {
        if (trigger) {
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    });
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
        mammothLibrary.convertToHtml({ arrayBuffer: arrayBuffer })
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
        updateCodeView();
        if (outputText.value.trim() === "") {
            throw new Error('Input is empty');
        }
        var token = saveHTMLToSession(inputHTML.outerHTML);
        window.open(`../table-cleanup/?s=${token}`, '_blank');
        setDebugMessage(debug, 'Redirecting to Table Cleanup', false);
        addProcessingLog('Redirecting to Table Cleanup.', 'info');
    } catch (e) {
        setDebugMessage(debug, 'Error for Table Cleanup. Input is empty', true);
        addProcessingLog('Error for Table Cleanup. Input is empty.', 'danger');
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

function syncEditorToInputHTML() {
    inputHTML.innerHTML = outputText.value;
    const contentArea = inputHTML.querySelector("div.content-area");
    if (contentArea) {
        Utils.stripTag(contentArea);
    }
    inputHTML.classList.add("content-area");
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
        const item = document.createElement('li');
        item.style.marginLeft = `${Math.max(0, level - 1) * 12}px`;
        item.innerHTML = `<span class="label label-default">${heading.tagName.toLowerCase()}</span> ${escapeHTML(heading.textContent.trim() || '(empty heading)')}`;
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
