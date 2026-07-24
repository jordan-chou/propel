import test from 'node:test';
import assert from 'node:assert/strict';
import {
    findCodeMatches,
    getCodeFindShortcutMode,
    replaceAllCodeMatches,
    replaceCodeMatch
} from '../../src/ui/code-find.js';

test('plain Code view searches are case-insensitive and treat punctuation literally', () => {
    const result = findCodeMatches('A.b aXb A.B', 'a.b');

    assert.equal(result.error, null);
    assert.deepEqual(result.matches.map(match => [match.start, match.end, match.text]), [
        [0, 3, 'A.b'],
        [8, 11, 'A.B']
    ]);
});

test('regex searches support multiline anchors and report invalid patterns', () => {
    const result = findCodeMatches('one\nTwo\nthree', '^(t)(\\w+)', true);

    assert.equal(result.error, null);
    assert.deepEqual(result.matches.map(match => [match.text, ...match.captures]), [
        ['Two', 'T', 'wo'],
        ['three', 't', 'hree']
    ]);
    assert.equal(findCodeMatches('text', '[', true).error, 'Invalid regular expression');
});

test('single and replace-all operations expand regex captures', () => {
    const source = '<h1>One</h1>\n<h2>Two</h2>';
    const { matches } = findCodeMatches(source, '<h(\\d)>(.*?)</h\\d>', true);
    const template = '<h$1 id="$2">$2</h$1>';

    const single = replaceCodeMatch(source, matches[0], template, true);
    assert.equal(single.value, '<h1 id="One">One</h1>\n<h2>Two</h2>');
    assert.equal(
        replaceAllCodeMatches(source, matches, template, true),
        '<h1 id="One">One</h1>\n<h2 id="Two">Two</h2>'
    );
});

test('plain replacements preserve dollar characters literally', () => {
    const source = 'cost cost';
    const { matches } = findCodeMatches(source, 'cost');

    assert.equal(replaceAllCodeMatches(source, matches, '$&5'), '$&5 $&5');
});

test('recognizes primary-modifier find and replace shortcuts', () => {
    assert.equal(getCodeFindShortcutMode({ key: 'f', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }), 'find');
    assert.equal(getCodeFindShortcutMode({ key: 'F', ctrlKey: false, metaKey: true, altKey: false, shiftKey: true }), 'replace');
    assert.equal(getCodeFindShortcutMode({ key: 'f', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }), null);
    assert.equal(getCodeFindShortcutMode({ key: 'f', ctrlKey: true, metaKey: false, altKey: true, shiftKey: false }), null);
});
