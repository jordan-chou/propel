import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNbspRules } from '../../src/commands/nbsp.js';

test('applies English non-breaking-space rules', () => {
    assert.equal(applyNbspRules('5 percent and Table 2', false), '5&nbsp;percent and Table&nbsp;2');
});

test('applies French punctuation and number rules', () => {
    assert.equal(applyNbspRules('Tableau 2 : 10 %', true), 'Tableau&nbsp;2 : 10&nbsp;%');
});
