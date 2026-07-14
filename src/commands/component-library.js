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
            id: 'box-heading-panel',
            name: 'Box: Heading panel',
            description: 'Uses the first table cell or heading as the panel heading.',
            conversion: 'heading-content',
            template: '<section class="panel panel-default mrgn-tp-md mrgn-bttm-md">\n<header class="panel-heading">\n<div class="panel-title mrgn-tp-0 h4">{{heading}}</div>\n</header>\n<div class="panel-body">\n{{content}}\n</div>\n</section>'
        }),
        Object.freeze({
            id: 'box-gray',
            name: 'Box: Gray',
            description: 'Uses the first table cell or heading as the box heading.',
            conversion: 'heading-content',
            template: '<section class="well mrgn-tp-md mrgn-bttm-md">\n<h4 class="mrgn-tp-0 h4">{{heading}}</h4>\n{{content}}\n</section>'
        }),
        Object.freeze({
            id: 'box-white',
            name: 'Box: White',
            description: 'Uses the first table cell or heading as the box heading.',
            conversion: 'heading-content',
            template: '<section class="panel panel-default mrgn-tp-md mrgn-bttm-md">\n<div class="panel-body">\n<h4 class="mrgn-tp-0 h4">{{heading}}</h4>\n{{content}}\n</div>\n</section>'
        }),
        Object.freeze({
            id: 'chart-figure',
            name: 'Charts and Figures',
            description: 'Uses the first image as the chart and preserves the table as its accessible text version.',
            conversion: 'chart',
            template: '<figure class="panel panel-default">\n<figcaption class="panel-heading">{{heading}}</figcaption>\n<div class="panel-body">{{image}}</div>\n<footer class="panel-footer">\n<p class="small">{{notesLabel}}</p>\n<p class="small">{{sourcesLabel}}</p>\n<details class="mrgn-tp-sm">\n<summary>{{textVersionLabel}}</summary>\n{{content}}\n</details>\n</footer>\n</figure>'
        }),
        Object.freeze({
            id: 'charts-double',
            name: 'Charts: Double',
            description: 'Creates a two-column chart row while preserving the selected table as a text version.',
            conversion: 'double-chart',
            template: '<div class="row">\n<div class="col-md-6">{{figureOne}}</div>\n<div class="col-md-6">{{figureTwo}}</div>\n</div>\n<div class="wb-inv component-text-version">{{content}}</div>'
        }),
        Object.freeze({
            id: 'quote',
            name: 'Quote',
            description: 'Uses the first three table cells as quote, author, and citation.',
            conversion: 'quote',
            template: '<div class="row">\n<div class="col-lg-10 col-lg-offset-1">\n<blockquote>\n{{content}}\n<footer class="text-right">{{author}}<br>\n<cite>{{citation}}</cite>\n</footer>\n</blockquote>\n</div>\n</div>'
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
            if (component.conversion !== undefined && !['heading-content', 'chart', 'double-chart', 'quote'].includes(component.conversion)) errors.push(`${path}.conversion is not supported.`);
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
            ...(component.conversion ? { conversion: component.conversion } : {}),
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

function getTableCells(html) {
    return Array.from(html.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi), match => match[1].trim()).filter(Boolean);
}

function getFirstHeading(html) {
    const match = html.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    return match ? { heading: match[1].trim(), content: html.replace(match[0], '').trim() } : null;
}

function getTextContent(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function unwrapTextBlock(html) {
    const match = html.trim().match(/^<(?:p|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>$/i);
    return match ? match[1].trim() : html.trim();
}

function splitHeadingCell(cell, hasFollowingCells, fallbackHeading) {
    const explicitHeading = cell.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (explicitHeading) {
        return { heading: explicitHeading[1].trim(), content: cell.replace(explicitHeading[0], '').trim() };
    }

    const blocks = Array.from(cell.matchAll(/<(?:p|h[1-6])\b[^>]*>[\s\S]*?<\/(?:p|h[1-6])>/gi), match => match[0]);
    if (blocks.length > 1) {
        return { heading: unwrapTextBlock(blocks[0]), content: cell.replace(blocks[0], '').trim() };
    }

    const singleBlock = blocks.length === 1 ? blocks[0] : cell;
    const blockInner = unwrapTextBlock(singleBlock);
    const leadingEmphasis = blockInner.match(/^<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*(?:<br\s*\/?>)?\s*([\s\S]*)$/i);
    if (leadingEmphasis && leadingEmphasis[2].trim()) {
        return { heading: leadingEmphasis[1].trim(), content: asParagraph(leadingEmphasis[2].trim()) };
    }

    const lineBreak = blockInner.match(/^([\s\S]*?)<br\s*\/?>\s*([\s\S]+)$/i);
    if (lineBreak) {
        return { heading: lineBreak[1].trim(), content: asParagraph(lineBreak[2].trim()) };
    }

    const text = getTextContent(blockInner);
    const looksLikeHeading = text.length > 0 && text.length <= 80 && !/[.!?](?:\s|$)/.test(text);
    if (hasFollowingCells || looksLikeHeading) {
        return { heading: blockInner, content: '' };
    }

    return { heading: fallbackHeading, content: singleBlock.trim() };
}

function getHeadingContent(html, cells, fallbackHeading) {
    if (cells.length > 0) {
        const firstCell = splitHeadingCell(cells[0], cells.length > 1, fallbackHeading);
        const body = [firstCell.content, ...cells.slice(1).map(asParagraph)].filter(Boolean).join('\n');
        return { heading: firstCell.heading, content: body || '<p></p>' };
    }

    const headingMatch = getFirstHeading(html);
    if (headingMatch) return { heading: headingMatch.heading, content: headingMatch.content || '<p></p>' };
    const split = splitHeadingCell(html, false, fallbackHeading);
    return { heading: split.heading, content: split.content || '<p></p>' };
}

function asParagraph(html) {
    return /^<(?:p|ul|ol|div|section|table)\b/i.test(html.trim()) ? html : `<p>${html}</p>`;
}

function fillTemplate(template, values) {
    return Object.entries(values).reduce((result, [name, value]) => result.replaceAll(`{{${name}}}`, value), template);
}

function chartFigure({ heading, image, content, labels }) {
    return `<figure class="panel panel-default">\n<figcaption class="panel-heading">${heading}</figcaption>\n<div class="panel-body">${image}</div>\n<footer class="panel-footer"><p class="small">${labels.notes}</p><p class="small">${labels.sources}</p><details class="mrgn-tp-sm"><summary>${labels.textVersion}</summary>${content}</details></footer>\n</figure>`;
}

function normalizeChartImage(image) {
    if (/\bclass\s*=/i.test(image)) {
        return image.replace(/class=(['"])(.*?)\1/i, (_match, quote, classes) => `class=${quote}${classes} img-responsive full-width${quote}`);
    }
    return image.replace(/^<img\b/i, '<img class="img-responsive full-width"');
}

export function applySmartComponent(component, selectedHTML, { language = 'en' } = {}) {
    const isFrench = language === 'fr';
    const labels = {
        heading: isFrench ? 'Titre' : 'Heading',
        chartHeading: isFrench ? 'Graphique no<br><b>Titre du graphique</b>' : 'Chart #<br><b>Chart title</b>',
        notes: 'Notes',
        sources: 'Sources',
        textVersion: isFrench ? 'Version texte' : 'Text version',
        author: isFrench ? 'Nom de l’auteur' : 'Author’s name',
        citation: isFrench ? 'Titre du contenu cité' : 'Title of cited source content'
    };
    const componentSourceHTML = selectedHTML.replace(/<table\b/gi, '<table data-propel-component-source="true"');
    const cells = getTableCells(selectedHTML);

    if (component.conversion === 'heading-content') {
        return fillTemplate(component.template, getHeadingContent(selectedHTML, cells, labels.heading));
    }
    if (component.conversion === 'quote') {
        return fillTemplate(component.template, {
            content: asParagraph(cells[0] || selectedHTML),
            author: cells[1] || labels.author,
            citation: cells[2] || labels.citation
        });
    }
    if (component.conversion === 'chart' || component.conversion === 'double-chart') {
        const images = Array.from(selectedHTML.matchAll(/<img\b[^>]*>/gi), match => normalizeChartImage(match[0]));
        const textVersion = /<table\b/i.test(selectedHTML) ? componentSourceHTML : asParagraph(selectedHTML);
        if (component.conversion === 'double-chart') {
            const figureOne = chartFigure({ heading: cells[0] || labels.chartHeading, image: images[0] || '', content: textVersion, labels });
            const figureTwo = chartFigure({ heading: cells[1] || labels.chartHeading, image: images[1] || images[0] || '', content: textVersion, labels });
            return fillTemplate(component.template, { figureOne, figureTwo, content: textVersion });
        }
        return fillTemplate(component.template, {
            heading: cells[0] || labels.chartHeading,
            image: images[0] || '',
            content: textVersion,
            notesLabel: labels.notes,
            sourcesLabel: labels.sources,
            textVersionLabel: labels.textVersion
        });
    }
    return applyComponentTemplate(component.template, componentSourceHTML);
}

export function convertSelectionToComponent({ html, selectionStart, selectionEnd, component, language = 'en' }) {
    if (typeof html !== 'string' || !component) throw new TypeError('HTML and a component are required.');
    if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart < 0 || selectionEnd <= selectionStart || selectionEnd > html.length) {
        throw new Error('Select text or HTML before converting it to a component.');
    }
    const selectedHTML = html.slice(selectionStart, selectionEnd);
    const converted = applySmartComponent(component, selectedHTML, { language });
    return createCommandResult({
        html: `${html.slice(0, selectionStart)}${converted}${html.slice(selectionEnd)}`,
        summary: `Converted selection to ${component.name}.`,
        changes: [{ type: 'replace-selection', componentId: component.id, selectionStart, selectionEnd }],
        affectedPaths: ['selection']
    });
}
