import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDocumentRecoveryController,
    createRecoveryDraftId
} from '../../src/app/document-recovery.js';
import {
    DOCUMENT_RECOVERY_SCHEMA_VERSION,
    isValidDocumentRecoveryRecord
} from '../../src/document/recovery-store.js';

function makeSnapshot(overrides = {}) {
    return {
        html: '<p>Recovered work</p>',
        rootAttributes: [{ name: 'class', value: 'content-area' }],
        language: 'en',
        revision: 3,
        ...overrides
    };
}

test('recovery controller debounces and persists the latest canonical snapshot', async () => {
    const saved = [];
    const timers = new Map();
    let nextTimer = 1;
    let snapshot = makeSnapshot();
    const controller = createDocumentRecoveryController({
        store: {
            save: async record => saved.push(record),
            delete: async () => {},
            get: async () => null,
            getLatest: async () => null
        },
        draftId: 'draft-1',
        getSnapshot: () => snapshot,
        now: () => 1234,
        setTimer(callback) {
            const id = nextTimer++;
            timers.set(id, callback);
            return id;
        },
        clearTimer: id => timers.delete(id)
    });

    controller.schedule();
    snapshot = makeSnapshot({ html: '<p>Latest work</p>', revision: 4 });
    controller.schedule();
    assert.equal(timers.size, 1);

    await controller.flush();

    assert.equal(saved.length, 1);
    assert.equal(saved[0].html, '<p>Latest work</p>');
    assert.equal(saved[0].revision, 4);
    assert.equal(saved[0].savedAt, 1234);
    assert.equal(saved[0].schemaVersion, DOCUMENT_RECOVERY_SCHEMA_VERSION);
});

test('recovery controller removes a stale recovery record for an empty document', async () => {
    const deleted = [];
    const controller = createDocumentRecoveryController({
        store: {
            save: async () => assert.fail('Empty document should not be saved'),
            delete: async draftId => deleted.push(draftId),
            get: async () => null,
            getLatest: async () => null
        },
        draftId: 'draft-empty',
        getSnapshot: () => makeSnapshot({ html: '' })
    });

    controller.schedule();
    await controller.flush();

    assert.deepEqual(deleted, ['draft-empty']);
});

test('disabled recovery does not schedule writes and can clear all saved copies', async () => {
    let saved = 0;
    let cleared = 0;
    const controller = createDocumentRecoveryController({
        store: {
            save: async () => { saved += 1; },
            delete: async () => {},
            clear: async () => { cleared += 1; },
            get: async () => null,
            getLatest: async () => null
        },
        draftId: 'draft-disabled',
        getSnapshot: makeSnapshot
    });

    controller.setEnabled(false);
    controller.schedule();
    await controller.flush();
    assert.equal(saved, 0);
    assert.equal(controller.isEnabled(), false);
    assert.equal(await controller.clearAll(), true);
    assert.equal(cleared, 1);
});

test('recovery controller prefers the current tab draft before the latest abandoned draft', async () => {
    const current = {
        ...makeSnapshot(),
        schemaVersion: DOCUMENT_RECOVERY_SCHEMA_VERSION,
        draftId: 'current',
        savedAt: 20
    };
    let latestReads = 0;
    const controller = createDocumentRecoveryController({
        store: {
            save: async () => {},
            delete: async () => {},
            get: async draftId => draftId === 'current' ? current : null,
            getLatest: async () => {
                latestReads += 1;
                return null;
            }
        },
        draftId: 'current',
        getSnapshot: makeSnapshot
    });

    assert.equal(await controller.findCandidate(), current);
    assert.equal(latestReads, 0);
});

test('recovery records reject incompatible or malformed browser data', () => {
    const valid = {
        ...makeSnapshot(),
        schemaVersion: DOCUMENT_RECOVERY_SCHEMA_VERSION,
        draftId: 'draft-valid',
        savedAt: 100
    };

    assert.equal(isValidDocumentRecoveryRecord(valid), true);
    assert.equal(isValidDocumentRecoveryRecord({ ...valid, schemaVersion: 99 }), false);
    assert.equal(isValidDocumentRecoveryRecord({ ...valid, rootAttributes: [{ name: 'class' }] }), false);
    assert.equal(isValidDocumentRecoveryRecord({ ...valid, rootAttributes: [{ name: 'bad name', value: '' }] }), false);
    assert.equal(isValidDocumentRecoveryRecord({ ...valid, language: 'es' }), false);
});

test('recovery draft IDs use the browser UUID provider when available', () => {
    assert.equal(createRecoveryDraftId({ randomUUID: () => 'stable-id' }), 'stable-id');
});
