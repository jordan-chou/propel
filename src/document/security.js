const BLOCKED_ELEMENTS = [
    'applet',
    'base',
    'embed',
    'frame',
    'frameset',
    'iframe',
    'link',
    'meta',
    'noscript',
    'object',
    'script',
    'style',
    'template'
];

const URL_ATTRIBUTES = new Set([
    'action',
    'background',
    'code',
    'codebase',
    'data',
    'formaction',
    'href',
    'poster',
    'src',
    'srcset',
    'xlink:href'
]);

const UNSAFE_STYLE_PATTERN = /(?:@import|expression\s*\(|behavior\s*:|-moz-binding\s*:|url\s*\()/i;

/** Reports whether a URL can execute code or access a local file. */
export function isUnsafeDocumentUrl(value) {
    const normalized = String(value ?? '')
        .replace(/[\u0000-\u0020\u007f-\u009f]+/g, '')
        .toLowerCase();
    return /^(?:javascript|vbscript|file|filesystem):/.test(normalized) ||
        /^data:(?:text\/html|application\/xhtml\+xml)/.test(normalized);
}

/** Parses HTML in an inert template, sanitizes it, and moves it into the target. */
export function replaceWithSanitizedHTML(target, html) {
    if (!target?.ownerDocument) {
        throw new TypeError('A document-owned target is required.');
    }

    const template = target.ownerDocument.createElement('template');
    template.innerHTML = String(html ?? '');
    const report = sanitizeDocumentTree(template.content);
    target.replaceChildren(template.content);
    return report;
}

/**
 * Removes executable document markup while preserving publishing structure and
 * ordinary links. Network loading is independently constrained by the app CSP.
 */
export function sanitizeDocumentTree(root, { includeRoot = false } = {}) {
    if (!root || typeof root.querySelectorAll !== 'function') {
        throw new TypeError('A DOM root is required.');
    }

    const report = {
        removedElements: 0,
        removedAttributes: 0,
        hardenedLinks: 0
    };
    const blockedSelector = BLOCKED_ELEMENTS.join(',');

    root.querySelectorAll(blockedSelector).forEach((element) => {
        element.remove();
        report.removedElements += 1;
    });

    const elements = [
        ...(includeRoot && root.nodeType === 1 ? [root] : []),
        ...root.querySelectorAll('*')
    ];
    elements.forEach((element) => sanitizeElement(element, report));
    return Object.freeze(report);
}

function sanitizeElement(element, report) {
    Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;
        const remove =
            name.startsWith('on') ||
            name === 'srcdoc' ||
            name === 'ping' ||
            name === 'action' ||
            name === 'formaction' ||
            (name === 'style' && UNSAFE_STYLE_PATTERN.test(value)) ||
            (URL_ATTRIBUTES.has(name) && isUnsafeDocumentUrl(value));

        if (remove) {
            element.removeAttribute(attribute.name);
            report.removedAttributes += 1;
        }
    });

    if (element.tagName?.toLowerCase() === 'a' && element.getAttribute('target')?.toLowerCase() === '_blank') {
        const rel = new Set((element.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
        const previousSize = rel.size;
        rel.add('noopener');
        rel.add('noreferrer');
        element.setAttribute('rel', Array.from(rel).join(' '));
        if (rel.size !== previousSize) report.hardenedLinks += 1;
    }
}
