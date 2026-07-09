/**
 * Generate generic unique IDs for headings, tables, and figures
 * Version modified for Propel.
 * 
 * Author: Jordan Chou
 */

// HTML Elements
const preview =             document.getElementById('preview');
// const fullPrevBtn =         document.getElementById('fullPrevBtn');
const fullPrev =            document.getElementById('fullPrev');
const headerDepthInput =    document.getElementById('headerDepth');


// global vars
var showFullPreview = false;
var inputHTML;


// Main
// inputText.value = testHTML;
// createListeners();


/* Functions */

/**
 * Add unique generic ID to heading
 * @param {HTMLElement} inputHTML input HTML
 */
export function modifyHeadings(inputHTML, headingIDCount, modifiedComponents) {
    const headings = inputHTML.querySelectorAll('h1, h2, h3, h4, h5, h6');
    var counter = {num: headingIDCount}; // create object to pass by reference

    for (var heading of headings) {
        addIDToComponent(inputHTML, heading, counter, "a");
        modifiedComponents.push(heading.cloneNode(true));
    }

    console.log("Added IDs to headings");
}

/**
 * Add unique generic ID to table
 * @param {HTMLElement} inputHTML input HTML
 */
export function modifyTables(inputHTML, tableIDCount, modifiedComponents) {
    const tables = inputHTML.querySelectorAll('table');
    var counter = {num: tableIDCount}; // create object to pass by reference

    for (var table of tables) {
        
        // // START TAX EXPENDITURES EXPERIMENT
        // const caption = table.querySelector('caption');
        // if (caption) {
        //     addIDToComponent(caption, counter, "c");
        //     modifiedComponents.push(caption.cloneNode(true));
        //     console.log("Added IDs to table captions");
        //     return;
        // }
        // // END   TAX EXPENDITURES EXPERIMENT

        addIDToComponent(inputHTML, table, counter, "t");
        modifiedComponents.push(table.cloneNode(true));
    }

    console.log("Added IDs to tables");
}

/**
 * Add unique generic ID to figure
 *  @param {HTMLElement} inputHTML input HTML
 */
export function modifyFigures(inputHTML, figureIDCount, modifiedComponents) {
    const figures = inputHTML.querySelectorAll('figure');
    var counter = {num: figureIDCount}; // create object to pass by reference

    for (var figure of figures) {
        addIDToComponent(inputHTML, figure, counter, "f");
        modifiedComponents.push(figure.cloneNode(true));
    }

    console.log("Added IDs to figures");
}

/**
 * Creates On This Page component
 *  @param {HTMLElement} input input HTML
 */
export function createOnThisPage(input, isEngLang) {
    if (input.querySelector("div.onThisPage")) return; // do not run if on this page div exists
    const isToCChecked = document.getElementById('isToC').checked;
    
    const MIN_HEADING_LEVEL = headerDepthInput.value;
    var headingTags = "";

    // get all headings in this html up to set heading level
    for (var i = 1; i <= MIN_HEADING_LEVEL; i++) {
        headingTags += 'h' + i;
        if (i < MIN_HEADING_LEVEL) {
            headingTags += ', ';
        }
    }

    const headings = input.querySelectorAll(headingTags);

    const div = document.createElement('div');
    div.classList.add('onThisPage');


    div.innerHTML += `
    <h2 id=${!isEngLang ? "sur-cette-page" : "on-this-page"}>${isToCChecked ? !isEngLang ? "Table des matières" : "Table of contents": !isEngLang ? "Sur cette page :" : "On this page:"}</h2>
    `;

    const ul = document.createElement('ul');
    ul.classList.add('lst-spcd');
    var ulHTML = "";

    ul.innerHTML = generateHeadingsList(ulHTML, headings, !isEngLang);
    div.appendChild(ul);

    // Insert after H1, otherwise, put at top
    const h1 = input.querySelector('h1');
    if (h1) {
        h1.insertAdjacentElement('afterend', div);
    } else {
        input.insertBefore(div, input.firstChild);
    }
}

/**
 * Toggles the full preview of the output HTML
 */
function toggleFullPrev() {
    showFullPreview = !showFullPreview;
    fullPrev.innerHTML = showFullPreview ? outputText.innerText : "";
}

/**
 * Converts the input text into HTML components (for better JavaScript compatibility)
 */
 function convertInputToHTML() {
    inputHTML.innerHTML = inputText.value.trim();
}



/**
 * Changes text content into a URL-compatible slug format.
 * Removes stop words, converts accented characters, limits word count.
 * @param {string} str Heading text
 * @returns {string} URL-compatible slug
 */
function slugify(str) {
    // List of stop words in English and French
    const stopWords = [
        "a", "an", "and", "the", "of", "to", "in", "on", "for", "with", "by", "from", "about", "at", "as", "is",
        "aux", "à", "de", "le", "la", "les", "un", "une", "par", "des", "du", "dans", "sur", "avec", "en", "ou", "et"
    ];

    // Normalize text (remove accents and special characters)
    const normalized = str
        .toLowerCase()
        .normalize("NFD")
        // .replace(/[.]/g, ""); 
        .replace(/\-/g, " ") // Replace dashes and dots with space
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9\s]/g, ""); // Removes everything except letters, numbers, and spaces
        // .replace(/['"‘’“”«».:]/g, "");
         // Remove quotation marks

    // Split words, remove stop words, and limit to 3-5 meaningful words
    const slugWords = normalized
        .split(/\s+/) // Split by whitespace
        .filter(word => word && !stopWords.includes(word)) // Remove stop words
        .slice(0, 4); // Limit to max 3 words

    // Join words with dashes, remove trailing dashes
    return slugWords.join("-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Add ID to component if one does not exist
 * @param {HTMLElement} component Heading element
 * @param {Object} counter Temp object holding component's ID count in counter.num
 * @param {String} prefix Prefix to go at the beginning of the ID
 */
function addIDToComponent(inputHTML, component, counter, prefix) {
    // const slugChecked = document.getElementById('slugifiedID').checked;
    var slugChecked = null;
    // const isFrench = document.getElementById('isFrench').checked;

    if (!component.id) {
        if (slugChecked && prefix == "a") {
            let newID = slugify(component.textContent);
            let dupIDCount = 0;

            //unique ID
            while (inputHTML.querySelector(`*[id="${newID}${dupIDCount ? '-' + dupIDCount : ''}"]`)) {
                dupIDCount++;
            }

            component.id = `${newID}${dupIDCount > 0 ? '-' + dupIDCount : ''}`;
            return;
        }

        // generic ID
        let checkForID;
        do {
            checkForID = inputHTML.querySelector(`#${prefix}${++counter.num}`);
        } while (checkForID);

        component.id = `${prefix}${counter.num}`;
    }
}

/**
 * Generates list of heading and performs nesting if necessary
 * @param {string} ulHTML HTML string
 * @param {NodeListOf<HTMLHeadingElement>} headings NodeList of headings
 * @param {boolean} isFrenchChecked flag if French
 * @returns HTML string of converted list
 */
function generateHeadingsList(ulHTML, headings, isFrenchChecked) {
    var prevLevel = 2;

    for (var heading of headings) {
        // Skip Footnotes heading
        if (heading.textContent.trim().toLowerCase() == (isFrenchChecked ? "note de pas de page" : "footnotes")) {
            continue;
        }

        var headingHTML = heading.innerHTML.replace("\n", "");
        var headingLevel = heading.tagName.substring(1,heading.tagName.length);

        var tabChars = '';
        for (var j = 0; j < headingLevel; j++) {
            tabChars += '\t';
        }

        // case 1: current > prev: create sub-list
        if (headingLevel > prevLevel) {
            console.log('headingLevel > prevLevel')
            while (headingLevel - prevLevel >= 2) {
                ulHTML += tabChars + '<ul class="lst-spcd">\n';
                ulHTML += tabChars + '<li>';
                prevLevel++;
            }
            ulHTML += tabChars + '<ul class="lst-spcd">\n';
        } 
        // case 2: current == prev: close list item
        else if (headingLevel == prevLevel && headingLevel > 1) {
            console.log('headingLevel == prevLevel')
            ulHTML += tabChars + '</li>\n';
        } 
        // case 3: current < prev: close sub-list
        else if (headingLevel < prevLevel) {
            console.log('headingLevel < prevLevel')
            while (prevLevel - headingLevel >= 2) {
                ulHTML += tabChars + '</li>';
                ulHTML += tabChars + '</ul>\n';
                prevLevel--;
            }
            ulHTML += tabChars + '\t</li>';
            ulHTML += tabChars + '\t</ul>\n';
            ulHTML += tabChars + '</li>';
        }
        ulHTML += tabChars + "<li><a href='#" + heading.id + "'>" + headingHTML + "</a></li>";
        // ulHTML += tabChars + '<li>';
        // ulHTML += '<a ' + ' href="' + heading.id + '">' + headingHTML + '</a>';
        // ulHTML += '\n';

        prevLevel = headingLevel;
    }

    return ulHTML;
}

/**
 * Converts all h2 into li for On this page
 * @param {NodeList} h2s Node list of all H2s
 * @param {Boolean} isFrenchChecked Checkbox option if the page is in French
 * @returns HTML string of all <li> for On this page
 */
// function h2ListItem(h2s, isFrenchChecked) {
//     var h2List = "";
//     for (var h2 of h2s) {
//         // exclude footnotes heading
//         if (h2.textContent.trim().toLowerCase() == (isFrenchChecked ? "note de pas de page" : "footnotes")) continue;

//         h2List += `\t    <li><a href="#${h2.id}">${h2.innerHTML}</a></li>\n`;
//     }
//     return h2List;
// }

/**
 * Display all components that were modified with attached ID.
 */
function displayModifiedComponents() {
    preview.innerHTML = "";
    
    // display On this page
    const otpChecked = document.getElementById('onThisPage').checked;
    if (otpChecked) {
        const otp = inputHTML.querySelector('.onThisPage');
        preview.appendChild(otp);
    }

    const headings = inputHTML.querySelectorAll('h2, h3, h4, h5, h6');
    for (var component of headings) {
        if (component.tagName == 'CAPTION') {
            var newComp = document.createElement('h3');
            newComp.id = component.id;
            newComp.innerHTML = component.innerHTML;
            component = newComp;
        }
        const clone = component.cloneNode(true);
        clone.innerHTML += ` <small>#${clone.id}</small>`;
        preview.appendChild(clone);
    }
}
