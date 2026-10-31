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

test('keeps entities inside quoted attribute values in the value color', () => {
    const highlighted = highlightHTML('<a title="Terms &amp; conditions">Link</a>');

    assert.match(
        highlighted,
        /<span class="syntax-value">&quot;Terms &amp;amp; conditions&quot;<\/span>/
    );
    assert.doesNotMatch(highlighted, /syntax-value[^]*syntax-entity/);
});

test('keeps named and numeric entities in single- and double-quoted alt values', () => {
    for (const [quote, escapedQuote] of [['"', '&quot;'], ["'", '&#039;']]) {
        const highlighted = highlightHTML(`<img alt=${quote}Revenue &amp; costs&nbsp;: &#160; &#xA0; &#XA0;${quote}>`);

        assert.ok(highlighted.includes(
            `<span class="syntax-value">${escapedQuote}Revenue &amp;amp; costs&amp;nbsp;: &amp;#160; &amp;#xA0; &amp;#XA0;${escapedQuote}</span>`
        ));
        assert.doesNotMatch(highlighted, /syntax-entity/);
    }
});

test('keeps encoded quotes and markup within attribute value highlighting', () => {
    const highlighted = highlightHTML('<img alt="&quot;Chart&quot; &lt;strong&gt;total&lt;/strong&gt;" title=\'L&apos;économie&#8239;: 10\'>');

    assert.ok(highlighted.includes('<span class="syntax-value">&quot;&amp;quot;Chart&amp;quot; &amp;lt;strong&amp;gt;total&amp;lt;/strong&amp;gt;&quot;</span>'));
    assert.ok(highlighted.includes('<span class="syntax-value">&#039;L&amp;apos;économie&amp;#8239;: 10&#039;</span>'));
    assert.doesNotMatch(highlighted, /syntax-entity/);
    assert.deepEqual([...highlighted.matchAll(/class="syntax-name">([^<]*)/g)].map(match => match[1]), ['img']);
});

test('still highlights text entities between tags with entity-containing attributes', () => {
    const highlighted = highlightHTML('<a href="?first=1&amp;second=2" title=\'Terms &amp; conditions\'>&amp; &#160; &#xA0;</a><img alt="&nbsp;">');

    assert.deepEqual(
        [...highlighted.matchAll(/<span class="syntax-entity">([^<]*)<\/span>/g)].map(match => match[1]),
        ['&amp;amp;', '&amp;#160;', '&amp;#xA0;']
    );
    assert.deepEqual(
        [...highlighted.matchAll(/<span class="syntax-value">([^<]*)<\/span>/g)].map(match => match[1]),
        ['&quot;?first=1&amp;amp;second=2&quot;', '&#039;Terms &amp;amp; conditions&#039;', '&quot;&amp;nbsp;&quot;']
    );
});

test('does not recolor entity-like text inside comments or incomplete references', () => {
    const highlighted = highlightHTML('<!-- &nbsp; --> &not-an-entity');

    assert.match(highlighted, /^<span class="syntax-comment">.*&amp;nbsp;.*<\/span>/);
    assert.doesNotMatch(highlighted, /syntax-comment[^]*syntax-entity/);
    assert.equal(highlighted.endsWith(' &amp;not-an-entity'), true);
});
