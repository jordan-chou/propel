import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNbspRules } from '../../src/commands/nbsp.js';

test('applies English non-breaking-space rules', () => {
    assert.equal(
        applyNbspRules('5 percent, 2 days, 3 billion and Table 2', false),
        '5&nbsp;percent, 2&nbsp;days, 3&nbsp;billion and Table&nbsp;2'
    );
});

test('applies French punctuation and number rules', () => {
    assert.equal(
        applyNbspRules('Tableau 2 : 10 % et 1 234 dollars sur 2 jours', true),
        'Tableau&nbsp;2&nbsp;: 10&nbsp;% et 1&nbsp;234 dollars sur 2&nbsp;jours'
    );
});

test('uses only nbsp entities and preserves existing consecutive nbsp entities', () => {
    assert.equal(
        applyNbspRules('&nbsp;&nbsp;Table 2', false),
        '&nbsp;&nbsp;Table&nbsp;2'
    );
});

test('follows the supported English and French date policies', () => {
    assert.equal(applyNbspRules('January 5 and 5 January', false), 'January&nbsp;5 and 5 January');
    assert.equal(applyNbspRules('5 janvier 2026', true), '5&nbsp;janvier&nbsp;2026');
});

test('does not add French non-breaking spaces before exclamation or question marks', () => {
    assert.equal(applyNbspRules('Attention ! Vraiment ?', true), 'Attention ! Vraiment ?');
});
