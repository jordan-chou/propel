import { replaceWithSanitizedHTML, sanitizeDocumentTree } from './security.js';

/**
 * Owns Propel's canonical document and provides a single mutation boundary.
 * Views may render the document, but must not become an alternative source of truth.
 */
export class DocumentStore {
    #root;
    #listeners = new Set();
    #revision = 0;

    constructor(root) {
        if (!(root instanceof HTMLElement)) {
            throw new TypeError('DocumentStore requires an HTMLElement root.');
        }
        this.#root = root;
    }

    get root() {
        return this.#root;
    }

    get revision() {
        return this.#revision;
    }

    getHTML() {
        return this.#root.innerHTML;
    }

    replaceHTML(html, metadata = {}) {
        replaceWithSanitizedHTML(this.#root, html);
        sanitizeDocumentTree(this.#root, { includeRoot: true });
        this.#publish({ type: 'replace', ...metadata });
        return this.#root;
    }

    mutate(label, mutation, metadata = {}) {
        if (typeof mutation !== 'function') {
            throw new TypeError('Document mutation must be a function.');
        }
        const result = mutation(this.#root);
        sanitizeDocumentTree(this.#root, { includeRoot: true });
        this.#publish({ type: 'mutation', label, ...metadata });
        return result;
    }

    touch(label, metadata = {}) {
        this.#publish({ type: 'mutation', label, ...metadata });
    }

    subscribe(listener) {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }

    snapshot() {
        return Object.freeze({ html: this.getHTML(), revision: this.#revision });
    }

    #publish(change) {
        this.#revision += 1;
        const event = Object.freeze({ ...change, revision: this.#revision });
        this.#listeners.forEach(listener => listener(event, this));
    }
}
