export function createJSONStorage(storage, namespace) {
    return {
        get(key, fallback = null) {
            try {
                const value = storage.getItem(`${namespace}.${key}`);
                return value === null ? fallback : JSON.parse(value);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                storage.setItem(`${namespace}.${key}`, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        }
    };
}
