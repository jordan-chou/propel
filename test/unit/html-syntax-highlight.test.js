import test from 'node:test';
import assert from 'node:assert/strict';

import { highlightHTML } from '../../src/ui/html-syntax-highlight.js';

test('highlights named and numeric HTML character entities in text', () => {
    const highlighted = highlightHTML('<p>&nbsp; &#160; &#xA0;</p>');

    assert.equal(
        highlighted,
        '<span class="syntax-bracket">&lt;</span><span class="syntax-name">p</span><span class="syntax-tag">&gt;</span>'
        + '<span class="syntax-entity">&amp;nbsp;</span> '
        + '<span class="syntax-entity">&amp;#160;</span> '
        + '<span class="syntax-entity">&amp;#xA0;</span>'
        + '<span class="syntax-bracket">&lt;/</span><span class="syntax-name">p</span><span class="syntax-tag">&gt;</span>'
    );
});

test('highlights an entity within an attribute value while preserving value coloring', () => {
    const highlighted = highlightHTML('<a title="Terms &amp; conditions">Link</a>');

    assert.match(
        highlighted,
        /<span class="syntax-value">&quot;Terms <span class="syntax-entity">&amp;amp;<\/span> conditions&quot;<\/span>/
    );
});

test('does not recolor entity-like text inside comments or incomplete references', () => {
    const highlighted = highlightHTML('<!-- &nbsp; --> &not-an-entity');

    assert.match(highlighted, /^<span class="syntax-comment">.*&amp;nbsp;.*<\/span>/);
    assert.doesNotMatch(highlighted, /syntax-comment[^]*syntax-entity/);
    assert.equal(highlighted.endsWith(' &amp;not-an-entity'), true);
});
