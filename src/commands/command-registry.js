export class CommandRegistry {
    #commands = new Map();

    register(id, definition) {
        if (!id || typeof definition?.execute !== 'function') {
            throw new TypeError('Commands require an id and execute function.');
        }
        if (this.#commands.has(id)) {
            throw new Error(`Command already registered: ${id}`);
        }
        this.#commands.set(id, Object.freeze({ id, ...definition }));
        return this;
    }

    get(id) {
        return this.#commands.get(id) || null;
    }

    list() {
        return Array.from(this.#commands.values());
    }

    async execute(id, context = {}) {
        const command = this.get(id);
        if (!command) throw new Error(`Unknown command: ${id}`);
        return command.execute(context);
    }
}

export function createCommandResult({ html, summary = '', changes = [], warnings = [], affectedPaths = [] }) {
    return Object.freeze({ html, summary, changes, warnings, affectedPaths });
}
