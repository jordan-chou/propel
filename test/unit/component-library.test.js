import test from 'node:test';
import assert from 'node:assert/strict';
import {
    applyComponentTemplate,
    applySmartComponent,
    convertSelectionToComponent,
    defaultComponentLibrary,
    parseComponentLibrary,
    serializeComponentLibrary,
    validateComponentLibrary
} from '../../src/commands/component-library.js';

test('starter component library is valid and round trips as JSON', () => {
    assert.equal(validateComponentLibrary(defaultComponentLibrary).valid, true);
    assert.deepEqual(parseComponentLibrary(serializeComponentLibrary(defaultComponentLibrary)), defaultComponentLibrary);
});

test('rejects duplicate ids and templates without exactly one content slot', () => {
    const library = {
        format: 'propel-component-library', version: 1, name: 'Invalid', components: [
            { id: 'same', name: 'One', template: '{{content}}{{content}}' },
            { id: 'same', name: 'Two', template: '<div>Nothing</div>' }
        ]
    };
    const result = validateComponentLibrary(library);
    assert.equal(result.valid, false);
    assert.match(result.errors.join(' '), /exactly one/);
    assert.match(result.errors.join(' '), /unique/);
});

test('rejects executable markup in imported component templates', () => {
    const library = {
        format: 'propel-component-library', version: 1, name: 'Unsafe', components: [
            { id: 'unsafe', name: 'Unsafe', template: '<div onclick="alert(1)">{{content}}</div>' }
        ]
    };
    assert.match(validateComponentLibrary(library).errors.join(' '), /executable/);
});

test('applies a component without escaping selected HTML', () => {
    assert.equal(applyComponentTemplate('<aside>{{content}}</aside>', '<p>Hello</p>'), '<aside><p>Hello</p></aside>');
});

test('converts only the selected code range and returns a structured result', () => {
    const result = convertSelectionToComponent({
        html: '<p>Before</p><p>Selected</p><p>After</p>',
        selectionStart: 13,
        selectionEnd: 28,
        component: { id: 'panel', name: 'Panel', template: '<section>{{content}}</section>' }
    });
    assert.equal(result.html, '<p>Before</p><section><p>Selected</p></section><p>After</p>');
    assert.equal(result.changes[0].componentId, 'panel');
});

test('smart heading components promote the first table cell to a heading', () => {
    const component = defaultComponentLibrary.components.find(item => item.id === 'box-heading-panel');
    const html = applySmartComponent(component, '<table><tr><td>Program</td><td>Program details</td></tr></table>');
    assert.match(html, /panel-title[^>]*>Program</);
    assert.match(html, /panel-body[\s\S]*<p>Program details<\/p>/);
    assert.doesNotMatch(html, /<table/);
});

test('smart heading components split a heading and body stored in one table cell', () => {
    const component = defaultComponentLibrary.components.find(item => item.id === 'box-heading-panel');
    const html = applySmartComponent(component, '<table><tr><td><p><strong>Program title</strong></p><p>First paragraph.</p><ul><li>More detail</li></ul></td></tr></table>');
    assert.match(html, /panel-title[^>]*><strong>Program title<\/strong>/);
    assert.match(html, /panel-body[\s\S]*<p>First paragraph.<\/p>[\s\S]*<ul>/);
    assert.doesNotMatch(html.match(/<div class="panel-title[^>]*>[\s\S]*?<\/div>/)[0], /First paragraph/);
});

test('smart heading components keep a lone long paragraph in the body', () => {
    const component = defaultComponentLibrary.components.find(item => item.id === 'box-gray');
    const paragraph = '<p>This is a complete paragraph with enough detail that it should remain body content rather than becoming the heading.</p>';
    const html = applySmartComponent(component, `<table><tr><td>${paragraph}</td></tr></table>`);
    assert.match(html, /<h4 class="mrgn-tp-0 h4">Heading<\/h4>/);
    assert.match(html, new RegExp(paragraph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('smart component fallbacks follow the selected French command language', () => {
    const box = defaultComponentLibrary.components.find(item => item.id === 'box-gray');
    const chart = defaultComponentLibrary.components.find(item => item.id === 'chart-figure');
    const quote = defaultComponentLibrary.components.find(item => item.id === 'quote');
    const longFrenchParagraph = '<table><tr><td><p>Ce paragraphe complet contient suffisamment de détails pour demeurer dans le corps du composant.</p></td></tr></table>';

    assert.match(applySmartComponent(box, longFrenchParagraph, { language: 'fr' }), />Titre<\/h4>/);
    assert.match(applySmartComponent(chart, '<p>Texte</p>', { language: 'fr' }), /<summary>Version texte<\/summary>/);
    const quoteHTML = applySmartComponent(quote, '<table><tr><td>Une citation.<\/td></tr></table>', { language: 'fr' });
    assert.match(quoteHTML, /Nom de l’auteur/);
    assert.match(quoteHTML, /Titre du contenu cité/);
});

test('smart quote components map table cells to quote attribution fields', () => {
    const component = defaultComponentLibrary.components.find(item => item.id === 'quote');
    const html = applySmartComponent(component, '<table><tr><td>Words</td><td>Author</td><td>Source</td></tr></table>');
    assert.match(html, /<blockquote>[\s\S]*<p>Words<\/p>/);
    assert.match(html, /<footer class="text-right">Author<br>/);
    assert.match(html, /<cite>Source<\/cite>/);
});

test('chart conversion keeps the source table in the text version', () => {
    const component = defaultComponentLibrary.components.find(item => item.id === 'chart-figure');
    const html = applySmartComponent(component, '<table><tr><td>Chart 1</td><td><img src="chart.png" alt="Chart 1"></td></tr></table>');
    assert.match(html, /<figure class="panel panel-default">/);
    assert.match(html, /<summary>Text version<\/summary>[\s\S]*<table[^>]*data-propel-component-source="true"/);
    assert.match(html, /img-responsive full-width/);
});

test('chart conversion maps number, title, notes, and sources into guide positions', () => {
    const component = defaultComponentLibrary.components.find(item => item.id === 'chart-figure');
    const source = '<table><tr><td><p>Chart 7</p><p>Revenue by year</p></td></tr><tr><td><img src="chart.png" alt="Chart 7: Revenue by year"></td></tr><tr><td><p>Sources: Departmental data</p></td></tr><tr><td><p>Notes: Values are rounded.</p></td></tr></table>';
    const html = applySmartComponent(component, source);
    assert.match(html, /<figcaption class="panel-heading">Chart 7<br>\s*<b>Revenue by year<\/b>/);
    assert.match(html, /<footer class="panel-footer">[\s\S]*Sources: Departmental data[\s\S]*Notes: Values are rounded.[\s\S]*<details/);
});

test('French chart conversion recognizes French metadata labels', () => {
    const component = defaultComponentLibrary.components.find(item => item.id === 'chart-figure');
    const source = '<table><tr><td>Graphique 2</td><td>Revenus annuels</td><td>Remarque : Valeurs arrondies.</td><td>Source : Données ministérielles</td></tr></table>';
    const html = applySmartComponent(component, source, { language: 'fr' });
    assert.match(html, /Graphique 2<br>\s*<b>Revenus annuels<\/b>/);
    assert.match(html, /Remarque : Valeurs arrondies.[\s\S]*Source : Données ministérielles[\s\S]*<summary>Version texte/);
});
