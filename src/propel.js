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
const copiedLabel = document.getElementById('copiedLabel');
const copyArea = document.getElementById('copyArea');
const copyBtn = document.getElementById('copyBtn');
const topBtn = document.getElementById('topBtn');
const langBtn = document.getElementById('langBtn');

// Anchors Aweigh elements
const onThisPageBox = document.getElementById('onThisPageOption');
const otpSettings = document.getElementById('otpSettings');

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

// Phase 1 redesign elements. These are optional so the same JS can still run on the old layout.
const processingLog = document.getElementById('processingLog');
const documentHealth = document.getElementById('documentHealth');
const documentOutline = document.getElementById('documentOutline');
const documentIssues = document.getElementById('documentIssues');
const htmlPreview = document.getElementById('htmlPreview');
const healthScore = document.getElementById('healthScore');
const reviewTabs = document.querySelectorAll('[data-review-tab]');
const workflowTabs = document.querySelectorAll('[data-workflow-tab]');
const standardCleanupBtn = document.getElementById('standardCleanupBtn');
const fileDropZone = document.getElementById('fileDropZone');
const fileUploadStatus = document.getElementById('fileUploadStatus');

// Local HTML for input
const inputHTML = document.createElement('div');

/* Global Variables */
// Elapsed time
var startTime, endTime;
var modifiedComponents = [];
var headingIDCount, tableIDCount, figureIDCount = 0;
var logCount = 0;

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

/**
 * Attaches click listeners to page's buttons
 */
function createListeners() {
    if (file) {
        file.addEventListener('change', handleFileInputChange);
    }

    copyBtn.addEventListener('click', () => {
        Utils.copyToClipboard(outputText, copiedLabel);
        addProcessingLog('Copied HTML to clipboard.', 'success');
    });

    topBtn.addEventListener('click', Utils.goToTop);

    langBtn.addEventListener('click', toggleLanguage);

    onThisPageBox.addEventListener('click', handleToggleOnThisPageBox);

    // Input box. Use change instead of input so the formatter does not fight the user while typing.
    outputText.addEventListener('change', updateInputHTML);

    // Command buttons
    addIDsBtn.addEventListener('click', addIDsCommand);
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
        addProcessingLog('No file selected.', 'warning');
        return;
    }

    const validExtension = /\.docx?$/i.test(selectedFile.name);
    if (!validExtension) {
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
    setFileUploadStatus(`Selected: ${selectedFile.name}`);
    addProcessingLog(`Started conversion: ${selectedFile.name}`, 'info');
    convertUsingMammoth(selectedFile);
}

/**
 * Perform actions whenever On this page checkbox is pressed
 */
function handleToggleOnThisPageBox() {
    otpSettings.classList.toggle('fadeIn', onThisPageBox.checked);
    addIDsBtn.innerText = `Add IDs${onThisPageBox.checked ? " and On this page" : ""}`;
    addProcessingLog(`${onThisPageBox.checked ? 'Enabled' : 'Disabled'} On this page generation.`, 'info');
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
    const elapsedTime = document.getElementById('elapsedTime');

    inputHTML.innerHTML = html;

    const imgCount = cleanImgSources();
    const bookmarkCount = removeBookmarkTags();
    const hrefCount = cleanBookmarkHrefs();
    normalizeSmartQuotes();

    elapsedTime.textContent = `Converted document in ${getEndTime()} seconds`;
    if (loading) { loading.classList.add("hidden"); }

    setFileUploadStatus(`Converted successfully.`);
    updateOutputText();
    Utils.scrollSmoothTo(outputSection);

    addProcessingLog(`Converted document in ${getEndTime()} seconds.`, 'success');
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
        syncEditorToInputHTML();

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
        const splits = document.getElementById('splits');

        splits.innerHTML = "";
        var sections = splitH1s(inputHTML);
        outputText.value = "";
        for (var s of sections) {
            createOnThisPage(s, isEngLang);
            createSplitButton(s);
            outputText.value += Utils.formattedHTML(s);
        }
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
    outputText.value = Utils.formattedHTML(inputHTML);
    refreshReviewPanel();
}

/**
 * Copy output text to inputHTML
 */
function updateInputHTML() {
    syncEditorToInputHTML();
    updateOutputText();
}

function syncEditorToInputHTML() {
    inputHTML.innerHTML = outputText.value;
    const contentArea = inputHTML.querySelector("div.content-area");
    if (contentArea) {
        Utils.stripTag(contentArea);
    }
}

/**
 * Clear output HTML textbox
 */
function clearOutputText() {
    outputText.value = " ";
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

function setFileUploadStatus(message) {
    if (fileUploadStatus) {
        fileUploadStatus.textContent = message;
    }
}

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
        documentHealth.innerHTML = '<p class="text-muted">Document counts will appear here after conversion or editing.</p>';
        return;
    }

    const issueTotal = stats.emptyLinks + stats.missingHeadingIds + stats.missingTableIds + stats.missingFigureIds + stats.headingSkips;
    if (issueTotal === 0) {
        healthScore.className = 'label label-success';
        healthScore.textContent = 'Looks clean';
    } else if (issueTotal <= 3) {
        healthScore.className = 'label label-warning';
        healthScore.textContent = 'Review suggested';
    } else {
        healthScore.className = 'label label-danger';
        healthScore.textContent = 'Needs review';
    }

    documentHealth.innerHTML = `
        <dl class="dl-horizontal small mrgn-bttm-0">
            <dt>Headings</dt><dd>${stats.headings}</dd>
            <dt>Tables</dt><dd>${stats.tables}</dd>
            <dt>Figures</dt><dd>${stats.figures}</dd>
            <dt>Images</dt><dd>${stats.images}</dd>
            <dt>Links</dt><dd>${stats.links}</dd>
            <dt>Footnote refs</dt><dd>${stats.footnoteRefs}</dd>
            <dt>Potential issues</dt><dd>${issueTotal}</dd>
        </dl>`;
}

function updateHeadingOutline() {
    if (!documentOutline) {
        return;
    }

    const headings = Array.from(inputHTML.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    if (headings.length === 0) {
        documentOutline.innerHTML = '<p class="text-muted">No headings found yet.</p>';
        return;
    }

    const outline = document.createElement('ol');
    outline.className = 'list-unstyled mrgn-bttm-0';

    headings.forEach((heading) => {
        const level = Number(heading.tagName.substring(1));
        const item = document.createElement('li');
        item.style.marginLeft = `${Math.max(0, level - 1) * 12}px`;
        item.innerHTML = `<span class="label label-default">${heading.tagName.toLowerCase()}</span> ${escapeHTML(heading.textContent.trim() || '(empty heading)')}`;
        outline.appendChild(item);
    });

    documentOutline.innerHTML = '';
    documentOutline.appendChild(outline);
}

function updateIssues() {
    if (!documentIssues) {
        return;
    }

    const stats = getDocumentStats();
    const issues = [];

    if (!hasInput()) {
        documentIssues.innerHTML = '<p class="text-muted">Potential issues will appear here.</p>';
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

function setDebugMessage(debug, message, isError) {
    debug.style.color = isError ? 'red' : '';
    debug.innerText = message;
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
