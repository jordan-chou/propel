import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_DOCUMENT_TITLE,
    getContextualDocumentTitle
} from '../../src/app/document-title.js';

test('uses the first non-empty document heading for the browser title', () => {
    assert.equal(getContextualDocumentTitle({
        headings: ['  ', ' Fiscal\n  Update 2026 '],
        fileName: 'fallback.docx'
    }), 'Fiscal Update 2026 – Propel');
});

test('uses the imported Word filename when the document has no heading', () => {
    assert.equal(getContextualDocumentTitle({
        headings: [],
        fileName: 'Quarterly results.DOCX'
    }), 'Quarterly results – Propel');
});

test('uses the default application title without contextual document text', () => {
    assert.equal(getContextualDocumentTitle(), DEFAULT_DOCUMENT_TITLE);
    assert.equal(getContextualDocumentTitle({ fileName: '.doc' }), DEFAULT_DOCUMENT_TITLE);
});
