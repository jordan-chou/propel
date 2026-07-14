/** Resolves the document language from explicit run text and DOCX defaults. */
export function getLanguageResultFromDocxXml(xmlParts, decodeXmlText = decodeBasicXmlText) {
    const documentCounts = getLanguageCountsFromXml(xmlParts.documentXml || '', decodeXmlText);
    const defaultLanguage = getDefaultDocxLanguage(xmlParts.stylesXml || '') ||
        getDefaultDocxLanguage(xmlParts.settingsXml || '');
    const explicitLanguage = getExplicitDocumentLanguage(documentCounts, defaultLanguage);
    const language = explicitLanguage || defaultLanguage;

    return language ? { language, counts: documentCounts, defaultLanguage, explicitLanguage } : null;
}

/** Returns explicit document language. */
export function getExplicitDocumentLanguage(languageText, defaultLanguage) {
    const total = languageText.en + languageText.fr;
    if (total === 0) return null;

    const language = languageText.fr > languageText.en ? 'fr' : 'en';
    const winningCount = languageText[language];
    const winningShare = winningCount / total;
    if (!defaultLanguage) return total >= 200 && winningShare >= 0.75 ? language : null;
    if (language === defaultLanguage) return language;
    return winningCount >= 200 && winningShare >= 0.75 ? language : null;
}

/** Returns default DOCX language. */
export function getDefaultDocxLanguage(xml) {
    const docDefaultsMatch = xml.match(/<w:docDefaults\b[\s\S]*?<\/w:docDefaults>/i);
    const defaultLanguage = getFirstPrimaryLanguageFromXml(docDefaultsMatch ? docDefaultsMatch[0] : '');
    if (defaultLanguage) return defaultLanguage;

    const themeLanguageMatch = xml.match(/<w:themeFontLang\b[^>]*>/i);
    return themeLanguageMatch ? getSupportedLanguageCode(getXmlAttribute(themeLanguageMatch[0], 'w:val')) : null;
}

/** Returns language counts from XML. */
export function getLanguageCountsFromXml(xml, decodeXmlText = decodeBasicXmlText) {
    const counts = { en: 0, fr: 0 };
    const paragraphPattern = /<w:p\b[\s\S]*?<\/w:p>/gi;
    const documentXml = stripNonBodyLanguageXml(xml);
    let paragraphMatch;

    while ((paragraphMatch = paragraphPattern.exec(documentXml)) !== null) {
        const paragraphXml = paragraphMatch[0];
        const paragraphLanguage = getFirstPrimaryLanguageFromXml(getFirstXmlBlock(paragraphXml, 'w:pPr'));
        const runPattern = /<w:r\b[\s\S]*?<\/w:r>/gi;
        let runMatch;

        while ((runMatch = runPattern.exec(paragraphXml)) !== null) {
            const runXml = runMatch[0];
            const runLanguage = getFirstPrimaryLanguageFromXml(getFirstXmlBlock(runXml, 'w:rPr')) || paragraphLanguage;
            if (runLanguage) counts[runLanguage] += getWordTextLength(runXml, decodeXmlText);
        }
    }

    return counts;
}

/** Returns first primary language from XML. */
function getFirstPrimaryLanguageFromXml(xml) {
    const languageTagPattern = /<w:lang\b[^>]*>/gi;
    let tagMatch;
    while ((tagMatch = languageTagPattern.exec(xml)) !== null) {
        const language = getSupportedLanguageCode(getXmlAttribute(tagMatch[0], 'w:val'));
        if (language) return language;
    }
    return null;
}

/** Removes drawing and embedded-object markup from language analysis. */
function stripNonBodyLanguageXml(xml) {
    return xml
        .replace(/<w:drawing\b[\s\S]*?<\/w:drawing>/gi, '')
        .replace(/<w:pict\b[\s\S]*?<\/w:pict>/gi, '')
        .replace(/<mc:AlternateContent\b[\s\S]*?<\/mc:AlternateContent>/gi, '')
        .replace(/<w:object\b[\s\S]*?<\/w:object>/gi, '');
}

/** Returns first XML block. */
function getFirstXmlBlock(xml, tagName) {
    const match = xml.match(new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'i'));
    return match ? match[0] : '';
}

/** Returns word text length. */
function getWordTextLength(xml, decodeXmlText) {
    const textPattern = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
    let textLength = 0;
    let textMatch;
    while ((textMatch = textPattern.exec(xml)) !== null) {
        textLength += decodeXmlText(textMatch[1]).trim().length;
    }
    return textLength;
}

/** Decodes XML character references used in Word text. */
function decodeBasicXmlText(text) {
    return text
        .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
        .replace(/&#([0-9]+);/g, (_, value) => String.fromCodePoint(parseInt(value, 10)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

/** Returns XML attribute. */
function getXmlAttribute(tag, attributeName) {
    const match = tag.match(new RegExp(`\\s${attributeName}="([^"]+)"`, 'i'));
    return match ? match[1] : '';
}

/** Returns supported language code. */
function getSupportedLanguageCode(languageCode) {
    const normalized = (languageCode || '').toLowerCase();
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
    if (normalized === 'fr' || normalized.startsWith('fr-')) return 'fr';
    return null;
}
