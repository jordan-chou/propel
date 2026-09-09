import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrapSafeLink } from '../../src/document/cleanup.js';

function wrap(destination, host = 'nam01.safelinks.protection.outlook.com') {
    return `https://${host}/?url=${encodeURIComponent(destination)}&data=tracking&sdata=signature&reserved=0`;
}

test('Safe Links restore the complete destination with exactly one decode per wrapper', () => {
    const destination = 'https://www.canada.ca/fr/page%20name.html?q=a%2Bb+c&next=%252F&lang=fr#détails';
    for (const host of ['nam01.safelinks.protection.outlook.com', 'eur02.safelinks.protection.outlook.com', 'safelinks.protection.outlook.com', 'NAM01.SAFELINKS.PROTECTION.OUTLOOK.COM']) {
        assert.equal(unwrapSafeLink(wrap(destination, host)), destination);
    }
    assert.equal(unwrapSafeLink(wrap('http://example.com/path')), 'http://example.com/path');
});

test('nested Safe Links are fully unwrapped and cleanup is idempotent', () => {
    const destination = 'https://example.com/?url=ordinary&item=2#section';
    const result = unwrapSafeLink(wrap(wrap(destination)));
    assert.equal(result, destination);
    assert.equal(unwrapSafeLink(result), destination);
});

test('ordinary links, lookalike hosts and invalid wrappers are preserved', () => {
    for (const href of [
        '', '#section', '/relative', 'mailto:editor@example.com',
        'https://example.com/?url=https%3A%2F%2Fcanada.ca',
        wrap('https://example.com', 'notsafelinks.protection.outlook.com'),
        wrap('https://example.com', 'safelinks.protection.outlook.com.example.com'),
        'https://safelinks.protection.outlook.com/?data=tracking',
        'https://safelinks.protection.outlook.com/?url=',
        'https://safelinks.protection.outlook.com/?url=%E0%A4%A',
        wrap('/relative'), wrap('not a URL'), wrap('https://'),
        wrap('javascript:alert(1)'), wrap('data:text/html,<script>alert(1)</script>'),
        wrap('file:///etc/passwd'), wrap('java\nscript:alert(1)')
    ]) {
        assert.equal(unwrapSafeLink(href), href);
    }
});
