import test from 'node:test';
import assert from 'node:assert/strict';
import { createJSONStorage } from '../../src/ui/storage.js';

test('namespaces and serializes UI preferences', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const preferences = createJSONStorage(storage, 'propel');
    preferences.set('pane', { width: 0.5 });
    assert.deepEqual(preferences.get('pane'), { width: 0.5 });
    assert.equal(values.has('propel.pane'), true);
});
