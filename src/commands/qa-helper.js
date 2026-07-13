/**
 * Tool to help count tags/components in the HTML
 * Modified for Propel
 * 
 * Author: Jordan Chou
 */

import * as Utils from "../util.js";

export const qaHelperTagsDefault =
`
h2
h3
h4
h5
h6
table > caption
table > tfoot
figure
`

const lightCSS = 'css/prettify.css';
const darkCSS = 'css/desert.css';

/**
 * Begin process of counting tags in the HTML code
 */
export function countTags(input) {
    const results = document.getElementById('qaHelperResults');
    const compare = document.getElementById('qaHelperCompare');
    const output = document.getElementById('qaHelperOutput');
    // Reset results
    compare.innerHTML = output.innerHTML = '';

    results.classList.remove('wb-inv');

    if (!input.innerHTML) return;

    const div = document.createElement('div');
    div.appendChild(input.cloneNode(true));

    let html = div.querySelector('div.content-area');
    
    let tags = getTagList();
    for (var i = 0; i < tags.length; i++) {
        createOutputElement(tags[i], html);
    }

    Utils.scrollSmoothTo(output);
    // Finished processing page
    PR.prettyPrint();
}

/**
 * Create HTML elements for buttons
 * @param {*} buttons JSON object of buttons
 */
export function setUpPresetBtns(buttons) {
    // buttons = presets;
    const buttonBar = document.getElementById('presetButtonBar');

    for (var button of buttons) {
        buttonBar.appendChild(createPresetButton(button));
        buttonBar.appendChild(document.createTextNode('\n')); // creates margins between buttons
    }
}

/**
 * Collapses all details in the output list
 */
export function collapseAll() {
    const output = document.getElementById('qaHelperOutput');
    let details = output.querySelectorAll('details');
    
    for (var d of details) {
        d.open = false;
    }
}

/**
 * Sets the theme to the checked radio using the CSS stylesheets at the top
 */
export function setCodeTheme() {
    const lightTheme = document.getElementById('lightTheme');
    const darkTheme = document.getElementById('darkTheme');
    const theme = document.getElementById('theme');

    if (lightTheme.checked) {
        theme.href = lightCSS.trim();
    } else if (darkTheme.checked) {
        theme.href = darkCSS.trim();
    }
}

/**
 * Creates a single button element from JSON object
 * @param {*} button single JSON button object
 * @returns HTML button element
 */
function createPresetButton(button) {
    const preset = document.createElement('button');
    let name = document.createTextNode(button.name);

    // set up button classes
    preset.classList.add('btn', 'btn-primary', 'btn-sm');

    // add event listener
    preset.addEventListener('click', () => {
        const countBtn = document.getElementById('qaHelperCountBtn');
        const tagText = document.getElementById('tagList');

        // Set "Count Tags" textarea to tags from JSON object
        tagText.value = '';
        for (var tag of button.tags) {
            tagText.value += `${tag}\n`;
        }

        tagText.value = tagText.value.trim();

        // Run counting script
        countBtn.click();
    });

    preset.appendChild(name);

    return preset;
}

/**
 * Gets an array of tags from 'HTML Tags' list, space-separated
 * @returns Array of tag strings
 */
function getTagList() {
    const tagText = document.getElementById('tagList');
    const tags = tagText.value.trim().split('\n');

    return tags;
}

/**
 * Create output elements to display the count of the tag
 * @param {*} tag tag used as label in output
 * @param {*} html pass html to count inside
 */
function createOutputElement(tag, html) {
    const output = document.getElementById('qaHelperOutput');

    let tags = getTags(tag, html);

    // create DOM elements for output
    let details = document.createElement('details');
    let summary = document.createElement('summary');
    let label = document.createElement('strong');
    let labelText = document.createTextNode(`${tag}: `);
    
    let numElements = countElements(tags);
    let count = document.createTextNode(numElements);

    // disable expand if count is 0
    if (numElements <= 0) {
        details.setAttribute('onclick', 'return false');
        details.style.pointerEvents = 'none';
    }

    // append child nodes
    label.appendChild(labelText);
    summary.appendChild(label);
    summary.appendChild(count);
    details.appendChild(summary);
    // details.appendChild(createMoveToCompareButton(details));
    const elementList = createElementList(tags);
    if (elementList) {
        details.appendChild(elementList);
    }
    output.appendChild(details);
}

/**
 * Returns the number of tags in the html
 * @param {*} tag tag to query
 * @param {*} html html that will be queried
 * @returns Number of elements of tag in the html, other error msg
 */
function countElements(tags) {
    if (tags) {
        return tags.length;
    } else {
        return 'not a valid selector';
    }
}

/**
 * Create a Compare button that moves the details element to the comparison section
 * @param {*} details details DOM element
 * @returns the button that is created
 */
function createMoveToCompareButton(details) {
    let button = document.createElement('button');
    let buttonText = document.createTextNode('Move to Compare');
    button.classList.add('btn', 'btn-default', 'btn-sm', 'mrgn-lft-lg', 'mrgn-tp-sm', 'mrgn-bttm-md');

    button.appendChild(buttonText);

    button.addEventListener('click', () => {
        moveToCompareSection(details);
        details.open = false;
    });

    return button;
}

/**
 * Moves the element to the Comparison section
 * @param {*} element element being copied to compare
 */
function moveToCompareSection(element) {
    const compare = document.getElementById('compare');

    let clone = element.cloneNode(true);
    clone.querySelector('button').remove();
    compare.innerHTML = '';
    compare.appendChild(clone);
}

/**
 * Creates the output list of tags
 * @param {*} tags tags to be displayed as a list
 * @returns list of tags
 */
function createElementList(tags) {
    let list = document.createElement('ol');
    list.classList.add('lst-spcd', 'mrgn-tp-lg');
    if (!tags) return;
    for (var tag of tags) {
        let li = document.createElement('li');
        let pre = document.createElement('pre');
        let text = document.createTextNode(tag.outerHTML);

        pre.classList.add('prettyprint');
        pre.style.fontSize = 'small';

        pre.appendChild(text);
        li.appendChild(pre);
        list.appendChild(li);
    }
    return list;
}

/**
 * Gets all tags inside of the html
 * @param {*} tag tag value
 * @param {*} html html to search tags
 * @returns NodeList of tags in html
 */
function getTags(tag, html) {
    try {
        return html.querySelectorAll(tag);
    }
    catch (err) {
        return null;
    }
}
