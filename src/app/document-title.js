export const DEFAULT_DOCUMENT_TITLE = 'Propel - Word to HTML Conversion Tool';

/** Builds a browser-tab title from document content and import metadata. */
export function getContextualDocumentTitle({ headings = [], fileName = '' } = {}) {
    const heading = Array.from(headings, normalizeTitlePart).find(Boolean);
    const importedName = normalizeTitlePart(fileName).replace(/\.docx?$/i, '').trim();
    const context = heading || importedName;

    return context ? `${context} – Propel` : DEFAULT_DOCUMENT_TITLE;
}

function normalizeTitlePart(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}
