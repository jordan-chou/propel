export function analyzeDocument(root) {
    const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const tables = Array.from(root.querySelectorAll('table'));
    const figures = Array.from(root.querySelectorAll('figure'));
    const images = Array.from(root.querySelectorAll('img'));
    const links = Array.from(root.querySelectorAll('a'));
    const documentPositionPreceding = root.ownerDocument.defaultView?.Node.DOCUMENT_POSITION_PRECEDING ?? 2;
    const missingIdTargets = [...headings, ...tables, ...figures]
        .filter(element => !element.id)
        .sort((first, second) => first.compareDocumentPosition(second) & documentPositionPreceding ? 1 : -1);
    const headingSkips = headings.filter((heading, index) => index > 0 &&
        Number(heading.tagName.substring(1)) > Number(headings[index - 1].tagName.substring(1)) + 1);

    const issueGroups = [
        { label: 'Empty links', severity: 'error', targets: links.filter(link => !link.getAttribute('href')?.trim()), getMessage: target => `${describeTarget(target, 'Link')} has an empty or missing href value.` },
        { label: 'Missing IDs', severity: 'warning', action: 'addIds', actionLabel: 'Add IDs', targets: missingIdTargets, getMessage: target => `${describeTarget(target, getTargetType(target))} is missing an ID.` },
        { label: 'Table cleanup', severity: 'error', action: 'tableCleanup', actionLabel: 'Table Cleanup', targets: tables.filter(table => !isCleanedTable(table)), getMessage: (target, index) => `${describeTarget(target, `Table ${index + 1}`)} may not have been cleaned up yet. Open Table cleanup to review.` },
        { label: 'Heading level skips', severity: 'error', targets: headingSkips, getMessage: target => `${describeTarget(target, target.tagName)} may skip a heading level.` },
        { label: 'Missing image alt text', severity: 'error', targets: images.filter(image => !image.hasAttribute('alt')), getMessage: (target, index) => `${describeTarget(target, `Image ${index + 1}`)} is missing an alt attribute. Empty alt may be valid for decorative images.` }
    ].filter(group => group.targets.length > 0);

    return Object.freeze({
        stats: Object.freeze({
            headings: headings.length,
            tables: tables.length,
            figures: figures.length,
            images: images.length,
            links: links.length,
            footnoteRefs: root.querySelectorAll('sup a, a[href^="#fn"], a[href^="#ftn"]').length,
            emptyLinks: links.filter(link => !link.getAttribute('href')?.trim()).length,
            missingHeadingIds: headings.filter(heading => !heading.id).length,
            missingTableIds: tables.filter(table => !table.id).length,
            tablesNeedingCleanup: tables.filter(table => !isCleanedTable(table)).length,
            missingFigureIds: figures.filter(figure => !figure.id).length,
            imagesMissingAlt: images.filter(image => !image.hasAttribute('alt')).length,
            headingSkips: headingSkips.length
        }),
        issueGroups
    });
}

export function isCleanedTable(table) {
    return Boolean(table?.classList.contains('table') && table.classList.contains('table-bordered') &&
        table.parentElement?.matches('div.table-responsive') && table.querySelector(':scope > thead') &&
        table.querySelector(':scope > tbody'));
}

function getTargetType(target) {
    if (target.matches('table')) return 'Table';
    if (target.matches('figure')) return 'Figure';
    return target.tagName;
}

function describeTarget(target, fallback) {
    const text = (target.getAttribute?.('aria-label') || target.getAttribute?.('alt') || target.textContent || '')
        .replace(/\s+/g, ' ').trim();
    if (!text) return fallback;
    const summary = text.length > 42 ? `${text.substring(0, 39).trim()}…` : text;
    return `${fallback} “${summary}”`;
}
