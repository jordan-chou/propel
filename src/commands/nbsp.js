/**
 * Adds required non-breaking spaces to document text without changing markup
 * or attributes.
 */

const NBSP_CHARACTER = '\u00a0';
const NBSP_ENTITY = '&nbsp;';

const SKIPPED_ELEMENTS = new Set([
    'CODE',
    'KBD',
    'MATH',
    'PRE',
    'SAMP',
    'SCRIPT',
    'STYLE',
    'SVG',
    'TEXTAREA'
]);

const BLOCK_ELEMENTS = new Set([
    'ADDRESS',
    'ARTICLE',
    'ASIDE',
    'BLOCKQUOTE',
    'CAPTION',
    'DD',
    'DETAILS',
    'DIALOG',
    'DIV',
    'DL',
    'DT',
    'FIELDSET',
    'FIGCAPTION',
    'FIGURE',
    'FOOTER',
    'FORM',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'HEADER',
    'HGROUP',
    'HR',
    'LI',
    'MAIN',
    'NAV',
    'OL',
    'P',
    'SECTION',
    'SUMMARY',
    'TABLE',
    'TBODY',
    'TD',
    'TFOOT',
    'TH',
    'THEAD',
    'TR',
    'UL'
]);

const MONTHS_ENGLISH = 'January|February|March|April|May|June|July|August|September|October|November|December';
const MONTHS_FRENCH = 'janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre';

const ENGLISH_RULES = [
    createRule('english-month-number', new RegExp(`\\b(?:${MONTHS_ENGLISH}) +\\d+`, 'giu')),
    createRule('english-number-unit', /\d+ +(days?|months?|years?|millions?|billions?|times?|percent|per +cent)\b/giu),
    createRule('english-numbered-label', /\b(Budget|Graph|Table|Chapter|Figure|Article|Annex) +\d+/giu),
    createRule('english-percentage', /\d+ +%/gu),
    createRule('english-money', /\d+ +\$/gu),
    createRule('english-preposition-number', /\b(Since|From|Of|To|In|For|On|Until) +\d+/giu),
    createRule('english-ordinal', /\d+(st|nd|rd|th) +/giu),
    createRule('english-per-cent', /\bper +cent\b/giu)
];

const FRENCH_RULES = [
    createRule('french-day-month', new RegExp(`\\d+ +(?:${MONTHS_FRENCH})\\b`, 'giu')),
    createRule('french-month-number', new RegExp(`\\b(?:${MONTHS_FRENCH}) +\\d+`, 'giu')),
    createRule('french-number-unit', /\d+ +(jours?|mois|ans|millions?|milliards?|fois|pour +cent)\b/giu),
    createRule('french-numbered-label', /\b(Budget|Graphique|Tableau|Chapitre|Figure|Annexe) +\d+/giu),
    createRule('french-grouped-number', /\d{1,3}(?: +\d{3})+/gu),
    createRule('french-percentage', /\d+ +%/gu),
    createRule('french-money', /\d+ +\$/gu),
    createRule('french-preposition-number', /\b(Depuis|De|Du|Au|En|Pour|Le|Jusqu'à|article) +\d+/giu),
    createRule('french-ordinal', /\d+(er|e|ème|nd|rd) +/giu),
    createRule('french-colon-semicolon', /[\p{L}\p{N}] +[:;]/gu),
    createRule('french-pour-cent', /\bpour +cent\b/giu)
];

/** Creates a stable, independently testable typography rule. */
function createRule(id, pattern) {
    return { id, pattern };
}

/**
 * Applies language rules to plain text. This compatibility entry point returns
 * HTML entity spelling so callers never receive thin-space variants.
 */
export function applyNbspRules(text, isFrench) {
    return applyRulesToText(text, isFrench).text.replaceAll(NBSP_CHARACTER, NBSP_ENTITY);
}

/**
 * Applies NBSP rules to visible HTML text and returns an auditable result.
 * Attributes and skipped/preformatted elements are never inspected.
 */
export function transformNbspHTML(html, isFrench, documentRef = document) {
    const container = documentRef.createElement('div');
    container.innerHTML = html;

    const changes = [];
    processContainer(container, isFrench, changes);

    return {
        html: container.innerHTML,
        changes,
        warnings: []
    };
}

/** Compatibility wrapper used by the registered document command. */
export function fixNbspHTML(html, isFrench, documentRef = document) {
    return transformNbspHTML(html, isFrench, documentRef).html;
}

/**
 * Builds text runs across inline markup while keeping block, line-break, and
 * preserved-spacing boundaries independent.
 */
function processContainer(container, isFrench, changes) {
    let run = [];

    const flush = () => {
        if (run.length === 0) {
            return;
        }

        processTextRun(run, isFrench, changes);
        run = [];
    };

    const visit = parent => {
        for (const child of parent.childNodes) {
            if (child.nodeType === 3) {
                run.push(child);
                continue;
            }

            if (child.nodeType !== 1) {
                continue;
            }

            if (shouldPreserveSpacing(child)) {
                flush();
                continue;
            }

            if (child.tagName === 'BR' || BLOCK_ELEMENTS.has(child.tagName)) {
                flush();
                if (child.tagName !== 'BR' && child.tagName !== 'HR') {
                    processContainer(child, isFrench, changes);
                }
                flush();
                continue;
            }

            visit(child);
        }
    };

    visit(container);
    flush();
}

/** Returns true when typography transformations must not touch an element. */
function shouldPreserveSpacing(element) {
    return SKIPPED_ELEMENTS.has(element.tagName)
        || element.hasAttribute('data-propel-preserve-spacing');
}

/** Maps combined inline text changes back to their original text nodes. */
function processTextRun(nodes, isFrench, changes) {
    const offsets = [];
    let text = '';

    for (const node of nodes) {
        offsets.push({ node, start: text.length, end: text.length + node.data.length });
        text += node.data;
    }

    const result = applyRulesToText(text, isFrench);
    if (result.changes.length === 0) {
        return;
    }

    for (const entry of offsets) {
        entry.node.data = result.text.slice(entry.start, entry.end);
    }

    changes.push(...result.changes);
}

/** Applies each rule without normalizing or collapsing unrelated whitespace. */
function applyRulesToText(input, isFrench) {
    let text = input;
    const changes = [];
    const rules = isFrench ? FRENCH_RULES : ENGLISH_RULES;

    for (const rule of rules) {
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        const matches = Array.from(text.matchAll(pattern));

        for (const match of matches) {
            const before = match[0];
            const after = before.replaceAll(' ', NBSP_CHARACTER);
            if (before === after) {
                continue;
            }

            const start = match.index;
            text = text.slice(0, start) + after + text.slice(start + before.length);
            changes.push({
                ruleId: rule.id,
                before,
                after: after.replaceAll(NBSP_CHARACTER, NBSP_ENTITY)
            });
        }
    }

    return { text, changes };
}
