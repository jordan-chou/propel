const ESCAPED_ENTITY_PATTERN = /&amp;(?:#(?:[xX][\dA-Fa-f]+|\d+)|[A-Za-z][A-Za-z\d]+);/g;

/** Escapes HTML source so it can be safely rendered in the highlighting layer. */
function escapeSourceHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Adds syntax markup to escaped HTML character references. */
function highlightEntities(escaped) {
    return escaped.replace(ESCAPED_ENTITY_PATTERN, entity =>
        `<span class="syntax-entity">${entity}</span>`
    );
}

/** Escapes HTML source and applies syntax-highlighting spans. */
export function highlightHTML(html) {
    const escaped = escapeSourceHTML(html);

    return escaped.replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?&gt;)|(&amp;(?:#(?:[xX][\dA-Fa-f]+|\d+)|[A-Za-z][A-Za-z\d]+);)/g, (
        match,
        comment,
        bracket,
        tagName,
        attributes,
        closeBracket,
        entity
    ) => {
        if (comment) {
            return `<span class="syntax-comment">${comment}</span>`;
        }

        if (entity) {
            return `<span class="syntax-entity">${entity}</span>`;
        }

        const highlightedAttributes = attributes.replace(/([^\s=\/&]+)(=)(&quot;.*?&quot;|&#039;.*?&#039;|[^\s&]+)?/g, (attributeMatch, name, equals, value = '') => {
            return `<span class="syntax-attr">${name}</span>${equals}<span class="syntax-value">${value}</span>`;
        });

        return `<span class="syntax-bracket">${bracket}</span><span class="syntax-name">${tagName}</span><span class="syntax-tag">${highlightEntities(highlightedAttributes)}${closeBracket}</span>`;
    });
}
