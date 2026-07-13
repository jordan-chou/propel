import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProposal } from '../../src/ai/proposals.js';

test('accepts a current structured text proposal', () => {
    const result = validateProposal({
        action: 'replace_text', revision: 3, targetPath: [1, 0], expectedText: 'Before', replacement: 'After'
    }, { revision: 3 });
    assert.equal(result.valid, true);
});

test('rejects stale proposals', () => {
    const result = validateProposal({
        action: 'replace_text', revision: 2, targetPath: [0], expectedText: 'Before'
    }, { revision: 3 });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(' '), /outdated/);
});
