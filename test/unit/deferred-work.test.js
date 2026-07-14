import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeferredWork } from '../../src/app/deferred-work.js';

function createFakeTimers() {
    let nextId = 0;
    const callbacks = new Map();
    return {
        setTimeout(callback) {
            const id = ++nextId;
            callbacks.set(id, callback);
            return id;
        },
        clearTimeout(id) {
            callbacks.delete(id);
        },
        runPending() {
            const pending = Array.from(callbacks.values());
            callbacks.clear();
            pending.forEach(callback => callback());
        },
        get size() {
            return callbacks.size;
        }
    };
}

test('deferred work coalesces rapid scheduling into one callback', () => {
    const timers = createFakeTimers();
    let calls = 0;
    const work = createDeferredWork(() => calls += 1, 160, timers);

    work.schedule();
    work.schedule();
    work.schedule();
    assert.equal(timers.size, 1);

    timers.runPending();
    assert.equal(calls, 1);
});

test('deferred work can be flushed when an editor loses focus', () => {
    const timers = createFakeTimers();
    let calls = 0;
    const work = createDeferredWork(() => calls += 1, 160, timers);

    work.schedule();
    work.flush();

    assert.equal(calls, 1);
    assert.equal(timers.size, 0);
});
