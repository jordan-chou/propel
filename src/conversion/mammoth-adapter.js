export function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('File reading failed.'));
        reader.readAsArrayBuffer(file);
    });
}

export function getMammothLibrary(globalObject = window) {
    const library = globalObject.mammoth;
    return library && typeof library.convertToHtml === 'function' ? library : null;
}

export async function convertWithMammoth(library, arrayBuffer) {
    if (!library) throw new Error('Mammoth is not loaded.');
    const result = await library.convertToHtml({ arrayBuffer });
    return Object.freeze({ html: result.value, messages: result.messages || [] });
}
