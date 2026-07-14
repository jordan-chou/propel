import test from 'node:test';
import assert from 'node:assert/strict';
import { getExplicitDocumentLanguage, getLanguageResultFromDocxXml } from '../../src/conversion/docx-language.js';

test('uses the DOCX default language when explicit text is absent', () => {
    const result = getLanguageResultFromDocxXml({
        documentXml: '',
        stylesXml: '<w:docDefaults><w:rPrDefault><w:rPr><w:lang w:val="fr-CA"/></w:rPr></w:rPrDefault></w:docDefaults>',
        settingsXml: ''
    });

    assert.equal(result.language, 'fr');
    assert.equal(result.defaultLanguage, 'fr');
    assert.deepEqual(result.counts, { en: 0, fr: 0 });
});

test('counts explicit run languages and ignores drawing text', () => {
    const visibleFrench = 'é'.repeat(210);
    const ignoredEnglish = 'x'.repeat(300);
    const result = getLanguageResultFromDocxXml({
        documentXml: `<w:body><w:p><w:r><w:rPr><w:lang w:val="fr-CA"/></w:rPr><w:t>${visibleFrench}</w:t></w:r><w:drawing><w:p><w:r><w:rPr><w:lang w:val="en-CA"/></w:rPr><w:t>${ignoredEnglish}</w:t></w:r></w:p></w:drawing></w:p></w:body>`,
        stylesXml: '',
        settingsXml: ''
    });

    assert.equal(result.language, 'fr');
    assert.deepEqual(result.counts, { en: 0, fr: 210 });
});

test('requires strong evidence to override the default language', () => {
    assert.equal(getExplicitDocumentLanguage({ en: 80, fr: 120 }, 'en'), null);
    assert.equal(getExplicitDocumentLanguage({ en: 20, fr: 220 }, 'en'), 'fr');
});
