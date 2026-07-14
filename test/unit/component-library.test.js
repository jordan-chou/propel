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
