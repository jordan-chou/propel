import test from 'node:test';
import assert from 'node:assert/strict';
import {
    FEEDBACK_EMAIL_ADDRESS,
    FEEDBACK_EMAIL_BODY,
    FEEDBACK_EMAIL_CC,
    buildBugReportUrl,
    buildFeedbackEmailBody,
    buildFeedbackEmailUrl,
    buildFeatureRequestUrl,
    detectFeedbackBrowser,
    detectFeedbackDistribution,
    detectFeedbackOperatingSystem,
    normalizeFeedbackLanguage
} from '../../src/support/feedback.js';
import { PROPEL_VERSION } from '../../src/app/app-info.js';

test('feedback email targets the shared mailbox and copies the maintainer', () => {
    const url = new URL(buildFeedbackEmailUrl());

    assert.equal(url.protocol, 'mailto:');
    assert.equal(url.pathname, FEEDBACK_EMAIL_ADDRESS);
    assert.equal(url.searchParams.get('cc'), FEEDBACK_EMAIL_CC);
    assert.equal(url.searchParams.get('subject'), 'Propel feedback');
});

test('feedback email contains the short in-app entry and privacy warning', () => {
    const feedback = {
        type: 'improvement',
        title: 'Pin common components',
        details: 'Let me keep frequently used components at the top.'
    };
    const url = new URL(buildFeedbackEmailUrl({}, feedback));
    const body = url.searchParams.get('body');

    assert.equal(url.searchParams.get('subject'), 'Propel feedback: Pin common components');
    assert.match(body, /Type: Suggestion/);
    assert.match(body, /Title: Pin common components/);
    assert.match(body, /Let me keep frequently used components/);
    assert.match(body, new RegExp(`Propel version: ${PROPEL_VERSION}`));
    assert.doesNotMatch(body, /Steps to reproduce/);
    assert.match(body, /remove document content/i);
    assert.equal(new URL(buildFeedbackEmailUrl()).searchParams.get('body'), FEEDBACK_EMAIL_BODY);
});

test('feedback email prefills selected browser details without exposing the hostname', () => {
    const environment = {
        protocol: 'https:',
        hostname: 'internal.example.gc.ca',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
        browserLanguage: 'en-CA'
    };
    const body = buildFeedbackEmailBody(environment);

    assert.match(body, /Distribution: Web deployment/);
    assert.match(body, /Browser: Microsoft Edge 140\.0\.0\.0/);
    assert.match(body, /Operating system: Windows 10 or 11/);
    assert.match(body, /Browser language: en-CA/);
    assert.doesNotMatch(body, /internal\.example\.gc\.ca/);
    assert.doesNotMatch(body, /Mozilla\/5\.0/);
});

test('feedback environment helpers handle portable Safari and reject arbitrary language text', () => {
    const safariUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_7) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15';

    assert.equal(detectFeedbackDistribution({ protocol: 'file:', hostname: '' }), 'Portable or local-file version');
    assert.equal(detectFeedbackDistribution({ protocol: 'http:', hostname: 'localhost' }), 'Development or local web server');
    assert.equal(detectFeedbackBrowser(safariUserAgent), 'Safari 18.6');
    assert.equal(detectFeedbackOperatingSystem(safariUserAgent), 'macOS 15.7.7');
    assert.equal(normalizeFeedbackLanguage('fr-CA'), 'fr-CA');
    assert.equal(normalizeFeedbackLanguage('private details'), 'Not detected');
});

test('GitHub problem form URL prefills the in-app entry and environment summary', () => {
    const environment = {
        appVersion: '1.2.3',
        protocol: 'file:',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/141.0',
        browserLanguage: 'fr-CA'
    };
    const url = new URL(buildBugReportUrl(environment, {
        title: 'Cleanup does not open',
        details: 'The table editor stays closed.'
    }));
    const summary = url.searchParams.get('environment');

    assert.equal(url.searchParams.get('template'), 'bug_report.yml');
    assert.equal(url.searchParams.get('title'), 'Cleanup does not open');
    assert.equal(url.searchParams.get('details'), 'The table editor stays closed.');
    assert.match(summary, /Propel version: 1\.2\.3/);
    assert.match(summary, /Distribution: Portable or local-file version/);
    assert.match(summary, /Browser: Mozilla Firefox 141\.0/);
    assert.match(summary, /Operating system: Linux/);
    assert.match(summary, /Browser language: fr-CA/);
});

test('GitHub suggestion form prefills content and a safe environment summary', () => {
    const url = new URL(buildFeatureRequestUrl({
        protocol: 'https:',
        hostname: 'internal.example.gc.ca',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_7) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15',
        browserLanguage: 'en-CA'
    }, {
        title: 'Pin common components',
        details: 'Keep selected components at the top.'
    }));
    const environment = url.searchParams.get('environment');

    assert.equal(url.searchParams.get('template'), 'feature_request.yml');
    assert.equal(url.searchParams.get('title'), 'Pin common components');
    assert.equal(url.searchParams.get('details'), 'Keep selected components at the top.');
    assert.match(environment, /Safari 18\.6/);
    assert.match(environment, /macOS 15\.7\.7/);
    assert.doesNotMatch(environment, /internal\.example\.gc\.ca/);
    assert.doesNotMatch(environment, /Mozilla\/5\.0/);
});
