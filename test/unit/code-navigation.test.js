import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getLineNumberForIndex,
    getLineStartIndex,
    goToCodeLine,
    isGoToLineShortcut
} from '../../src/ui/code-navigation.js';

test('recognizes primary-modifier G without conflicting modifiers', () => {
    assert.equal(isGoToLineShortcut({ key: 'g', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }), true);
    assert.equal(isGoToLineShortcut({ key: 'G', ctrlKey: false, metaKey: true, altKey: false, shiftKey: false }), true);
    assert.equal(isGoToLineShortcut({ key: 'g', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true }), false);
    assert.equal(isGoToLineShortcut({ key: 'g', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }), false);
});

test('maps logical source lines to their one-based numbers and start indexes', () => {
    const source = 'first\nsecond\n\nfourth\n';

    assert.equal(getLineStartIndex(source, 1), 0);
    assert.equal(getLineStartIndex(source, 0), 0);
    assert.equal(getLineNumberForIndex(source, source.indexOf('second') + 3), 2);
    assert.equal(getLineStartIndex(source, 4), source.indexOf('fourth'));
    assert.equal(getLineStartIndex(source, 5), source.length);
});

test('go to line selects the requested line and reports prompt context', () => {
    const calls = [];
    const textarea = {
        value: 'first\nsecond\nthird',
        selectionStart: 8,
        focus: () => calls.push('focus'),
        setSelectionRange: (start, end) => calls.push([start, end])
    };

    const result = goToCodeLine(textarea, (currentLine, totalLines) => {
        assert.equal(currentLine, 2);
        assert.equal(totalLines, 3);
        return '3';
    });

    assert.deepEqual(result, { lineNumber: 3, index: 13 });
    assert.deepEqual(calls, ['focus', [13, 13]]);
});

test('go to line clamps whole numbers and ignores cancelled or invalid requests', () => {
    const selections = [];
    const textarea = {
        value: 'one\ntwo',
        selectionStart: 5,
        focus: () => {},
        setSelectionRange: (start, end) => selections.push([start, end])
    };

    assert.deepEqual(goToCodeLine(textarea, () => '99'), { lineNumber: 2, index: 4 });
    assert.deepEqual(goToCodeLine(textarea, () => '1'), { lineNumber: 1, index: 0 });
    assert.deepEqual(goToCodeLine(textarea, () => '-4'), { lineNumber: 1, index: 0 });
    assert.deepEqual(selections, [[4, 4], [0, 0], [0, 0]]);
    assert.equal(goToCodeLine(textarea, () => null), null);
    assert.equal(goToCodeLine(textarea, () => '1.5'), null);
});
