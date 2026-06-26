/**
 * Command to split a document by their H1 components.
 * 
 * Author: Jordan Chou
 */

/**
 * Splits the HTML by H1s into buttons with H1 Text
 * @param {HTMLElement} inputHTML HTML
 * @returns null if invalid target
 */
export function splitH1s(inputHTML) {
    const content = inputHTML.cloneNode(true);
    const children = Array.from(content.children);
    const sections = [];
    let currentSection = null;

    children.forEach(child => {
        if (child.tagName === 'H1') {
            // Start a new section
            if (currentSection) {
                sections.push(currentSection);
            }
            currentSection = document.createElement('div');
            currentSection.appendChild(child.cloneNode(true));
        } else if (currentSection) {
            currentSection.appendChild(child.cloneNode(true));
        }
    });

    if (currentSection) {
        sections.push(currentSection);
    }

    return sections;
}

/**
 * Create a button for the splits that contain the HTML for a section
 * @param {HTMLDivElement} section a section of HTML starting with H1 element
 */
export function createSplitButton(section) {
    const splitHTML = document.getElementById('splitHTML');
    const splitCopiedLabel = document.getElementById('splitCopiedLabel');

    const button = document.createElement('button');
    button.classList.add("btn", "btn-default", "mrgn-rght-sm", "mrgn-bttm-sm");
    const h1 = section.querySelector('h1');
    
    var h1Title = h1.textContent;
    h1Title = h1Title.replace(/(\d)/, "$1 "); // insert space after chap num

    button.textContent = h1 ? h1Title : "No H1";

    button.addEventListener("click", () => {
        splitHTML.innerText = formattedHTML(section);
        copyToClipboard(splitHTML, splitCopiedLabel);
    });
    splits.appendChild(button);
}