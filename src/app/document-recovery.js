import { DOCUMENT_RECOVERY_SCHEMA_VERSION } from '../document/recovery-store.js';

/** Creates an isolated identifier for a browser-tab document recovery stream. */
export function createRecoveryDraftId(cryptoProvider = globalThis.crypto) {
    if (cryptoProvider && typeof cryptoProvider.randomUUID === 'function') {
        return cryptoProvider.randomUUID();
    }

    const randomPart = Math.random().toString(36).slice(2);
    return `draft-${Date.now().toString(36)}-${randomPart}`;
}

/**
 * Coordinates debounced persistence without becoming another document state owner.
 * Snapshot creation remains injected so callers always read from DocumentStore.
 */
export function createDocumentRecoveryController({
    store,
    draftId,
    getSnapshot,
    delay = 1500,
    now = () => Date.now(),
    setTimer = (callback, timeout) => globalThis.setTimeout(callback, timeout),
    clearTimer = timer => globalThis.clearTimeout(timer),
    onError = () => {}
}) {
    let activeDraftId = draftId;
    let dirty = false;
    let timer = null;
    let writeQueue = Promise.resolve();
    let enabled = true;

    function schedule() {
        if (!enabled) return;
        dirty = true;
        if (timer !== null) clearTimer(timer);
        timer = setTimer(() => {
            timer = null;
            void flush();
        }, delay);
    }

    function flush() {
        if (timer !== null) {
            clearTimer(timer);
            timer = null;
        }
        if (!enabled) {
            dirty = false;
            return writeQueue;
        }
        if (!dirty) return writeQueue;

        dirty = false;
        const snapshot = getSnapshot();
        const record = {
            schemaVersion: DOCUMENT_RECOVERY_SCHEMA_VERSION,
            draftId: activeDraftId,
            savedAt: now(),
            html: snapshot.html,
            rootAttributes: snapshot.rootAttributes,
            language: snapshot.language,
            sourceFileName: snapshot.sourceFileName,
            revision: snapshot.revision
        };

        const persist = async () => {
            try {
                if (record.html.trim()) {
                    await store.save(record);
                } else {
                    await store.delete(record.draftId);
                }
                return record;
            } catch (error) {
                dirty = true;
                onError(error);
                return null;
            }
        };

        writeQueue = writeQueue.then(persist, persist);
        return writeQueue;
    }

    async function findCandidate() {
        if (!enabled) return null;
        try {
            const current = await store.get(activeDraftId);
            return current || await store.getLatest();
        } catch (error) {
            onError(error);
            return null;
        }
    }

    async function discard(candidateDraftId = activeDraftId) {
        try {
            await store.delete(candidateDraftId);
            return true;
        } catch (error) {
            onError(error);
            return false;
        }
    }

    async function clearAll() {
        dirty = false;
        if (timer !== null) {
            clearTimer(timer);
            timer = null;
        }
        try {
            await store.clear();
            return true;
        } catch (error) {
            onError(error);
            return false;
        }
    }

    function setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);
        if (!enabled) {
            dirty = false;
            if (timer !== null) {
                clearTimer(timer);
                timer = null;
            }
        }
    }

    function setDraftId(nextDraftId) {
        if (!nextDraftId) {
            throw new TypeError('Recovery draft ID is required.');
        }
        activeDraftId = nextDraftId;
    }

    return {
        schedule,
        flush,
        findCandidate,
        discard,
        clearAll,
        setEnabled,
        setDraftId,
        getDraftId: () => activeDraftId,
        isEnabled: () => enabled
    };
}
