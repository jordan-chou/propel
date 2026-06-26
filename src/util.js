/**
 * General utility functions to use in web publishing tools.
 * 
 * Author: Jordan Chou
 */

/**
 * Clicking on the input element will copy its contents, present a message
 * and highlight the element.
 * 
 * Ensure that you have the following HTML elements:
 *  - <textarea class='wb-inv' id='copyArea'></textarea>
 *  - <span id="copiedLabel" class='wb-inv label label-success'>Copied</span>
 * 
 * @param {HTMLElement} outputText DOM element containing the innerText to copy
 */
export function copyToClipboard(outputText, copiedLabel) {
    const copyArea = document.getElementById('copyArea');

    outputText.style.boxShadow = "0px 0px 5px green";

    copyArea.value = outputText.value;

    copyArea.select();
    document.execCommand('copy');

    if (copiedLabel) {
        copiedLabel.classList.remove('wb-inv');
    }

    // return to default label after 2000ms
    setTimeout(() => {
        outputText.style.boxShadow = null;
        if (copiedLabel) {
            copiedLabel.classList.add('wb-inv');
        }
    }, 2000);
}

/**
 * Scrolls window to DOM element
 * @param {HTMLElement} element DOM element to put into view
 */
export function scrollSmoothTo(element) {
    if (element) {
        element.scrollIntoView({
            block: 'start',
            behavior: 'smooth'
        });
    }
}

/**
 * Creates an HTML Text Node component from input text
 * @param {string} text string
 * @returns HTML text node component
 */
export function createTextNode(text) {
    return document.createTextNode(text);
}

/**
 * Removes element from DOM node tree
 * @param {HTMLElement} element element to be removed
 */
export function removeElement(element) {
    element.parentNode.removeChild(element);
}

/**
 * 
 * @param {HTMLElement} element 
 */
export function stripTag(element) {
    const parent = element.parentNode;
    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
}

/**
 * Removes extra and multiple spaces
 * @param {string} string string to be cleaned
 */
export function textCleanup(string) {
    string = string.trim();
    while (string.startsWith('&nbsp;')) {
        string = string.replace('&nbsp;', '');
    }
    return string.trim().replace(/\s{2,}/g, ' ')
}

/**
 * Shows and hides "Go to top" button
 */
export function showGoToTopButton() {
    const topBtn = document.getElementById('topBtn');
    const topDest = document.getElementById('outputSection');

    var rect = topDest.getBoundingClientRect();
    if (document.body.scrollTop > rect.top + window.scrollY + 20 || document.documentElement.scrollTop > rect.top + window.scrollY + 20) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
}

/**
 * Moves viewport to Output section
 */
export function goToTop() {
    const output = document.getElementById('outputSection');
    scrollSmoothTo(output);
}

/**
 * Replaces a node with a new node of a different tag
 * https://stackoverflow.com/a/15086834
 * @param {*} oldTag tag that will be replaced
 * @param {*} newTag name of new tag that will be created
 */
export function renameTag(oldTag, newTag) {
    let newNode = document.createElement(newTag);

    // Copy the children
    while (oldTag.firstChild) {
        newNode.appendChild(oldTag.firstChild); // *Moves* the child
    }

    // Copy the attributes
    if (oldTag.attributes) {
        for (index = oldTag.attributes.length - 1; index >= 0; --index) {
            newNode.attributes.setNamedItem(oldTag.attributes[index].cloneNode());
        }
    }

    // Replace it
    if (oldTag.parentNode) {
        oldTag.parentNode.replaceChild(newNode, oldTag);
    }

    return newNode;
}

/**
 * Formats HTML code
 * @param {HTMLElement} html 
 * @returns formatted HTML
 */
export function formattedHTML(html) {
    const unformatted = html.outerHTML.trim();
    const formatted = html_beautify(unformatted, {
        indent_size: 4,
        preserve_newlines: true
    });

    return formatted;
}