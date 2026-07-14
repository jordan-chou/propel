import test from 'node:test';
import assert from 'node:assert/strict';

import {
    classifyTableCaptionLabels,
    isTableUnitLabel
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

test('does not infer positional metadata without a table number', () => {
    assert.deepEqual(classifyTableCaptionLabels([
        'Introductory paragraph',
        'Annual revenue',
        'CAD, seasonally adjusted'
    ]), {});
});
