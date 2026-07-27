export const DOCUMENT_RECOVERY_SCHEMA_VERSION = 1;

const defaultDatabaseName = 'propel-document-recovery';
const defaultStoreName = 'documentRecovery';

/**
 * Persists versioned document-recovery records in IndexedDB.
 * The store owns persistence only; DocumentStore remains the canonical state owner.
 */
export function createDocumentRecoveryStore(indexedDB, options = {}) {
    const databaseName = options.databaseName || defaultDatabaseName;
    const storeName = options.storeName || defaultStoreName;
    let databasePromise = null;

    function openDatabase() {
        if (!indexedDB || typeof indexedDB.open !== 'function') {
            return Promise.reject(new Error('IndexedDB is unavailable.'));
        }

        if (!databasePromise) {
            databasePromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(databaseName, 1);
                request.onupgradeneeded = () => {
                    const database = request.result;
                    if (!database.objectStoreNames.contains(storeName)) {
                        const objectStore = database.createObjectStore(storeName, { keyPath: 'draftId' });
                        objectStore.createIndex('savedAt', 'savedAt');
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('Could not open document recovery storage.'));
                request.onblocked = () => reject(new Error('Document recovery storage is blocked by another page.'));
            });
        }

        return databasePromise;
    }

    async function runTransaction(mode, operation) {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, mode);
            const objectStore = transaction.objectStore(storeName);
            let result;

            try {
                result = operation(objectStore);
            } catch (error) {
                reject(error);
                return;
            }

            transaction.oncomplete = () => resolve(result?.result);
            transaction.onerror = () => reject(transaction.error || result?.error || new Error('Document recovery storage failed.'));
            transaction.onabort = () => reject(transaction.error || new Error('Document recovery storage was aborted.'));
        });
    }

    return {
        async save(record) {
            if (!isValidDocumentRecoveryRecord(record)) {
                throw new TypeError('Invalid document recovery record.');
            }
            await runTransaction('readwrite', objectStore => {
                objectStore.clear();
                return objectStore.put(record);
            });
            return record;
        },

        async get(draftId) {
            if (!draftId) return null;
            const result = await runTransaction('readonly', objectStore => objectStore.get(draftId));
            return isValidDocumentRecoveryRecord(result) ? result : null;
        },

        async getLatest() {
            const database = await openDatabase();
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(storeName, 'readonly');
                const index = transaction.objectStore(storeName).index('savedAt');
                const request = index.openCursor(null, 'prev');
                request.onsuccess = () => {
                    const record = request.result?.value;
                    if (record && !isValidDocumentRecoveryRecord(record)) {
                        request.result.continue();
                        return;
                    }
                    resolve(record || null);
                };
                request.onerror = () => reject(request.error || new Error('Could not read document recovery storage.'));
            });
        },

        async delete(draftId) {
            if (!draftId) return;
            await runTransaction('readwrite', objectStore => objectStore.delete(draftId));
        },

        async clear() {
            await runTransaction('readwrite', objectStore => objectStore.clear());
        }
    };
}

/** Reports whether persisted data is safe to offer as a compatible recovery record. */
export function isValidDocumentRecoveryRecord(record) {
    return Boolean(
        record &&
        record.schemaVersion === DOCUMENT_RECOVERY_SCHEMA_VERSION &&
        typeof record.draftId === 'string' &&
        record.draftId.length > 0 &&
        typeof record.html === 'string' &&
        Number.isFinite(record.savedAt) &&
        Number.isFinite(new Date(record.savedAt).getTime()) &&
        Number.isInteger(record.revision) &&
        record.revision >= 0 &&
        (record.language === 'en' || record.language === 'fr') &&
        Array.isArray(record.rootAttributes) &&
        record.rootAttributes.every(attribute =>
            attribute &&
            typeof attribute.name === 'string' &&
            attribute.name.length > 0 &&
            !/[\u0000-\u0020"'/>=]/.test(attribute.name) &&
            typeof attribute.value === 'string'
        )
    );
}
