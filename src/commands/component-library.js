import { createCommandResult } from './command-registry.js';

export const COMPONENT_LIBRARY_FORMAT = 'propel-component-library';
export const COMPONENT_LIBRARY_VERSION = 1;
export const COMPONENT_CONTENT_SLOT = '{{content}}';

export const defaultComponentLibrary = Object.freeze({
    format: COMPONENT_LIBRARY_FORMAT,
    version: COMPONENT_LIBRARY_VERSION,
    name: 'Propel starter components',
    components: Object.freeze([
        Object.freeze({
            id: 'callout-info',
            name: 'Information callout',
            description: 'Places the selection in a styled information panel.',
            template: '<section class="alert alert-info">\n{{content}}\n</section>'
        }),
        Object.freeze({
            id: 'details',
            name: 'Expandable details',
            description: 'Places the selection in an expandable details component.',
            template: '<details>\n<summary>Details</summary>\n{{content}}\n</details>'
        }),
        Object.freeze({
            id: 'well',
            name: 'Inset panel',
            description: 'Places the selection in a neutral inset panel.',
            template: '<div class="well well-sm">\n{{content}}\n</div>'
        })
    ])
});

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasUnsafeTemplateMarkup(template) {
    return /<(?:script|style|link|iframe|object|embed)\b/i.test(template) ||
        /\son[a-z]+\s*=/i.test(template) ||
        /(?:href|src)\s*=\s*["']?\s*javascript:/i.test(template);
}

export function validateComponentLibrary(value) {
    const errors = [];
    if (!isRecord(value)) return { valid: false, errors: ['Library must be a JSON object.'] };
    if (value.format !== COMPONENT_LIBRARY_FORMAT) errors.push(`format must be "${COMPONENT_LIBRARY_FORMAT}".`);
    if (value.version !== COMPONENT_LIBRARY_VERSION) errors.push(`version must be ${COMPONENT_LIBRARY_VERSION}.`);
    if (typeof value.name !== 'string' || !value.name.trim()) errors.push('name must be a non-empty string.');
    if (!Array.isArray(value.components) || value.components.length === 0) {
        errors.push('components must be a non-empty array.');
    } else {
        const ids = new Set();
        value.components.forEach((component, index) => {
            const path = `components[${index}]`;
            if (!isRecord(component)) {
                errors.push(`${path} must be an object.`);
                return;
            }
            if (typeof component.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(component.id)) {
                errors.push(`${path}.id must contain only letters, numbers, dots, underscores, or hyphens.`);
            } else if (ids.has(component.id)) {
                errors.push(`${path}.id must be unique.`);
            } else {
                ids.add(component.id);
            }
            if (typeof component.name !== 'string' || !component.name.trim()) errors.push(`${path}.name must be a non-empty string.`);
            if (component.description !== undefined && typeof component.description !== 'string') errors.push(`${path}.description must be a string.`);
            if (typeof component.template !== 'string') {
                errors.push(`${path}.template must be a string.`);
            } else if (component.template.split(COMPONENT_CONTENT_SLOT).length !== 2) {
                errors.push(`${path}.template must contain exactly one ${COMPONENT_CONTENT_SLOT} slot.`);
            } else if (hasUnsafeTemplateMarkup(component.template)) {
                errors.push(`${path}.template contains executable or embedded content that is not allowed.`);
            }
        });
    }
    return { valid: errors.length === 0, errors };
}

export function parseComponentLibrary(json) {
    let value;
    try {
        value = JSON.parse(json);
    } catch {
        throw new Error('The selected file is not valid JSON.');
    }
    const validation = validateComponentLibrary(value);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    return {
        format: value.format,
        version: value.version,
        name: value.name.trim(),
        components: value.components.map(component => ({
            id: component.id,
            name: component.name.trim(),
            description: component.description || '',
            template: component.template
        }))
    };
}

export function serializeComponentLibrary(library) {
    const validation = validateComponentLibrary(library);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    return `${JSON.stringify(library, null, 2)}\n`;
}

export function applyComponentTemplate(template, selectedHTML) {
    if (typeof template !== 'string' || template.split(COMPONENT_CONTENT_SLOT).length !== 2) {
        throw new Error(`Component template must contain exactly one ${COMPONENT_CONTENT_SLOT} slot.`);
    }
    return template.replace(COMPONENT_CONTENT_SLOT, selectedHTML);
}

export function convertSelectionToComponent({ html, selectionStart, selectionEnd, component }) {
    if (typeof html !== 'string' || !component) throw new TypeError('HTML and a component are required.');
    if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart < 0 || selectionEnd <= selectionStart || selectionEnd > html.length) {
        throw new Error('Select text or HTML before converting it to a component.');
    }
    const selectedHTML = html.slice(selectionStart, selectionEnd);
    const converted = applyComponentTemplate(component.template, selectedHTML);
    return createCommandResult({
        html: `${html.slice(0, selectionStart)}${converted}${html.slice(selectionEnd)}`,
        summary: `Converted selection to ${component.name}.`,
        changes: [{ type: 'replace-selection', componentId: component.id, selectionStart, selectionEnd }],
        affectedPaths: ['selection']
    });
}
