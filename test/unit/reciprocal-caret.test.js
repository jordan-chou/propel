import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getSourceIndexForTextOffset,
    getTextOffsetForSourceIndex
} from '../../src/app/reciprocal-caret.js';

const decodeEntity = source => source === '&amp;' ? '&' : source === '&nbsp;' ? '\u00a0' : source;

test('maps rendered text offsets through nested markup to source indexes', () => {
    const html = '<p>One <strong>two</strong> three</p>';
    const start = html.indexOf('>') + 1;
    const end = html.lastIndexOf('</p>');

    assert.equal(getSourceIndexForTextOffset(html, start, end, 4, decodeEntity), html.indexOf('<strong>'));
    assert.equal(getSourceIndexForTextOffset(html, start, end, 7, decodeEntity), html.indexOf('</strong>'));
    assert.equal(getTextOffsetForSourceIndex(html, start, end, html.indexOf('three'), decodeEntity), 8);
});

test('treats an HTML entity as one rendered character', () => {
    const html = '<p>A&amp;B&nbsp;C</p>';
    const start = html.indexOf('>') + 1;
    const end = html.lastIndexOf('</p>');

    assert.equal(getSourceIndexForTextOffset(html, start, end, 2, decodeEntity), html.indexOf(';') + 1);
    assert.equal(getTextOffsetForSourceIndex(html, start, end, html.indexOf('B'), decodeEntity), 2);
});
