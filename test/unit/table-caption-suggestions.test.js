import test from 'node:test';
import assert from 'node:assert/strict';

import {
    classifyTableCaptionLabels,
    isTableUnitLabel,
    suggestTableId
} from '../../src/table-editor/caption-suggestions.js';

test('recognizes currency-scaled table unit labels', () => {
    [
        '$ million',
        '$ billions',
        'millions of dollars',
        'billions of dollars'
    ].forEach((label) => assert.equal(isTableUnitLabel(label), true, label));
});

test('preserves existing percent and bilingual scale recognition', () => {
    [
        'per cent',
        '(per cent)',
        'pourcentage',
        'millions de dollars',
        'milliards'
    ].forEach((label) => assert.equal(isTableUnitLabel(label), true, label));
});

test('does not treat ordinary table text as a unit label', () => {
    [
        'Annual revenue',
        'Dollar amount by year',
        'The company made millions of dollars last year'
    ].forEach((label) => assert.equal(isTableUnitLabel(label), false, label));
});

test('uses table number, title, unit order for unfamiliar unit wording', () => {
    assert.deepEqual(classifyTableCaptionLabels([
        'Table 7',
        'Quarterly operating revenue',
        'CAD, seasonally adjusted'
    ]), {
        number: 0,
        title: 1,
        unit: 2
    });
});

test('recognizes an alphanumeric dotted table number', () => {
    assert.deepEqual(classifyTableCaptionLabels([
        'Table 2b.1',
        'Operating expenses'
    ]), {
        number: 0,
        title: 1
    });
});

test('does not infer positional metadata without a table number', () => {
    assert.deepEqual(classifyTableCaptionLabels([
        'Introductory paragraph',
        'Annual revenue',
        'CAD, seasonally adjusted'
    ]), {});
});

test('builds table IDs from simple and dotted table numbers', () => {
    [
        ['Table 1', 't1'],
        ['Table 1.2', 't1-2'],
        ['Table 2b.1', 't2b-1'],
        ['Table 23.2.1', 't23-2-1'],
        ['1.4', 't1-4']
    ].forEach(([label, expected]) => assert.equal(suggestTableId(label), expected, label));
});

test('does not suggest a table ID without an Arabic table number', () => {
    assert.equal(suggestTableId('Table IV'), '');
    assert.equal(suggestTableId('Annual revenue'), '');
});
