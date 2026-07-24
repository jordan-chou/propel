const TABLE_UNIT_PATTERN = /^(?:units?|unit[eé]s?)\s*[:\-]|^(?:per\s+cent|percent(?:age)?|pour\s+cent|pourcentage)\b|^(?:[$€£]\s*)?(?:in\s+|en\s+)?(?:thousands?|millions?|billions?|milliers?|milliards?)(?:\s+of|\s+de)?\b|^\([^)]*(?:[$€£%]|dollars?|euros?|per\s+cent|percent(?:age)?|pour\s+cent|pourcentage|millions?|billions?|milliers?|milliards?)[^)]*\)$/i;
const TABLE_NUMBER_PATTERN = /^(?:table|tableau)\s+(?:no\.?\s*)?(?:\d+[a-z]?(?:[.\-]\d+[a-z]?)*|[ivxlcdm]+)(?:[.:]|\b)/i;

/** Returns whether text looks like a unit label placed near a table. */
export function isTableUnitLabel(text) {
    return TABLE_UNIT_PATTERN.test(String(text || '').trim());
}

/** Builds a table ID from the first dotted Arabic table number in a label. */
export function suggestTableId(tableNumber) {
    const match = String(tableNumber || '').match(/\d+[a-z]?(?:\.\d+[a-z]?)*(?![\w.])/i);
    return match ? `t${match[0].toLowerCase().replaceAll('.', '-')}` : '';
}

/**
 * Classifies an ordered block immediately preceding or starting a table.
 * A table-number label anchors the conventional number, title, unit sequence,
 * allowing the unit wording itself to vary between source documents.
 */
export function classifyTableCaptionLabels(labels) {
    const values = Array.from(labels || [], (label) => String(label || '').trim());
    const number = values.findIndex((value) => TABLE_NUMBER_PATTERN.test(value));
    let unit = values.findIndex(isTableUnitLabel);
    const result = {};

    if (number >= 0) {
        result.number = number;
        const title = values.findIndex((value, index) => index > number && index !== unit && Boolean(value));

        if (title >= 0) {
            result.title = title;
        }
        if (unit < 0 && title >= 0) {
            unit = values.findIndex((value, index) => index > title && Boolean(value));
        }
    }

    if (unit >= 0) {
        result.unit = unit;
    }

    return result;
}
