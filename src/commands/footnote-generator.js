/**
 * Generate WET Style footnotes from inputted HTML code 
 * that was produced from a Word document to Dreamweaver.
 * Version modified for Propel.
 * 
 * Author: Jordan Chou
 */




/* Functions */
/**
 * Gets all paragraph anchors where 'name' starts with 'footnote-ref-' and converts it to WET Style
 * Note: uses each footnote's numerical value
 * @param {HTMLElement} inputHTML input HTML
 * @param {String[]} langStrings Strings in EN or FR
 * @returns {Map<string, string>} Source note IDs mapped to displayed body numbers
 */
// <sup><a href="#footnote-2" id="footnote-ref-2">[1]</a></sup>
// <sup id="fn1-rf"><a class="fn-lnk" href="#fn1"><span class="wb-inv">Footnote </span>1</a></sup>

export function createBodyFtnTags(inputHTML, langStrings) {
    const superscripts = inputHTML.querySelectorAll('sup>a[id^="footnote-ref-"]');

    const footnoteNumbers = new Map();
    
    for (var s of superscripts) {
        const sup = document.createElement('sup');

        // get footnote number from <div id="ftn###">
        let matches = s.textContent.match(/(\d+)/);
        const fnNum = matches[0];
        footnoteNumbers.set(s.getAttribute('href').slice(1), fnNum);
        // const fnNum = fnCount++; // This assumes that references and footnotes are matched 1-to-1 sequentially

        
        // set up sup html
        sup.id = `fn${fnNum}-rf`;
        sup.innerHTML = `<a class="fn-lnk" href="#fn${fnNum}"><span class="wb-inv">${langStrings['FN_DT']} </span>${fnNum}</a>`;

        s.parentNode.parentNode.replaceChild(sup, s.parentNode);
    }
    return footnoteNumbers;
}

/**
 * Replaces input footnotes section with WET Style footnotes section
 * @param {HTMLElement} inputHTML input HTML
 * @param {String[]} langStrings Strings in EN or FR
 * @param {Boolean} isEngLang Is in lang EN
 * @param {Map<string, string>} footnoteNumbers Numbering returned by createBodyFtnTags
 */
export function replaceFootnoteSection(inputHTML, langStrings, isEngLang, footnoteNumbers = new Map()) {
    const firstFootnote = inputHTML.querySelector('li[id^="footnote-"]');
    firstFootnote.parentNode.parentNode.replaceChild(createFootnotes(inputHTML, langStrings, isEngLang, footnoteNumbers), firstFootnote.parentNode);
}

/**
 * Creates an HTML Text Node component from input text
 * @param {*} text string
 * @returns HTML text node component
 */
function createTextNode(text) {
    return document.createTextNode(text);
}

/**
 * Converts all li with 'id' starting with 'footnote-' into a WET Style 'aside' component 
 * @param {HTMLElement} inputHTML input HTML
 * @param {String[]} langStrings Strings in EN or FR
 * @param {Boolean} isEngLang Is in lang EN
 * @param {Map<string, string>} footnoteNumbers Source note IDs mapped to body numbers
 * @returns aside component
 */
function createFootnotes(inputHTML, langStrings, isEngLang, footnoteNumbers) {
    const footnotes = inputHTML.querySelectorAll('li[id^="footnote-"]');

    // set up 'aside' element
    const aside = document.createElement('aside');
    aside.classList.add('wb-fnote');
    aside.setAttribute('role', 'note');
    aside.innerHTML = `<h2 id="fn">${langStrings['FN_H2']}</h2>`;

    // set up 'dl' element
    const dl = document.createElement('dl');

    for (var f of footnotes) {
        // Mammoth's source IDs are internal Word IDs, not displayed note numbers.
        const fnNum = footnoteNumbers.get(f.id) ?? f.id.match(/(\d+)/)[0];

        // remove old link to footnote ref
        const a = f.querySelector('a[href^="#footnote-ref-"]');
        a.parentNode.removeChild(a);
        
        dl.innerHTML += `
            <dt>${langStrings['FN_DT']} ${fnNum}</dt>
            <dd id="fn${fnNum}">
                ${f.innerHTML}
                <p class="fn-rtn"><a href="#fn${fnNum}-rf"><span class="wb-inv">${langStrings['FN_SP1']} </span>${fnNum}${isEngLang ? `<span class="wb-inv"> ${langStrings['FN_SP2']}</span>` : ""}</a></p>
            </dd>`;
    }

    aside.appendChild(dl);
    return aside;
}

/**
 * Removes all &nbsp; from the start of the string
 * 
 * @param {string} s input string
 * @returns string with all &nbsp; removed from the start
 */
function trimNBSP(s) {
    s = s.trim();
    while (s.startsWith('&nbsp;')) s = s.replace('&nbsp;', '');

    return s;
}

/**
 * Displays input HTML into output HTML textbox
 */
function displayOutputText() {
    // TODO: output text needs to display parsed input
    outputText.innerText = inputHTML.innerHTML.trim();
}

/**
 * Display Preview of input HTML
 * @param {*} showAll boolean to show full input HTML or only aside component
 */
function displayPreview(showAll) {
    while (preview.firstChild) preview.removeChild(preview.firstChild); // clear

    if (showAll) {
        preview.appendChild(inputHTML.cloneNode(true));
    } else {
        preview.appendChild(inputHTML.querySelector('aside[role="note"]').cloneNode(true)); 
    }
}
