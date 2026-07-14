import test from 'node:test';
import assert from 'node:assert/strict';
import { buildElementSourceMap } from '../../src/app/editor-source-map.js';

test('maps nested elements to child paths and source ranges', () => {
    const html = '<div><h1>Title</h1><p>Text<br></p></div>';
    const entries = buildElementSourceMap(html);

    assert.deepEqual(entries.map(({ tagName, path }) => ({ tagName, path })), [
        { tagName: 'h1', path: [0] },
        { tagName: 'p', path: [1] },
        { tagName: 'br', path: [1, 0] }
    ]);
    assert.equal(html.slice(entries[0].startIndex, entries[0].endIndex), '<h1>Title</h1>');
});

test('does not treat angle brackets inside quoted attributes as tag endings', () => {
    const html = '<div><a title="1 > 0">Link</a></div>';
    const [entry] = buildElementSourceMap(html);

    assert.equal(entry.openEndIndex, html.indexOf('>Link') + 1);
    assert.equal(html.slice(entry.startIndex, entry.endIndex), '<a title="1 > 0">Link</a>');
});
