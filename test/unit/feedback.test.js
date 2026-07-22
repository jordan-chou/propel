import test from 'node:test';
import assert from 'node:assert/strict';
import {
    FEEDBACK_EMAIL_ADDRESS,
    FEEDBACK_EMAIL_BODY,
    FEEDBACK_EMAIL_CC,
    GENERAL_FEEDBACK_EMAIL_BODY,
    GENERAL_FEEDBACK_EMAIL_SUBJECT,
    buildBugReportUrl,
    buildFeedbackEmailBody,
    buildFeedbackEmailUrl,
    buildFeatureRequestUrl,
    buildGeneralFeedbackEmailUrl,
    configureFeedbackEmailLink,
    configureGeneralFeedbackEmailLink,
    configureGitHubIssueLinks,
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

test('feedback email requests actionable details and includes a privacy warning', () => {
    const body = new URL(buildFeedbackEmailUrl()).searchParams.get('body');

    assert.equal(body, FEEDBACK_EMAIL_BODY);
    assert.match(body, /Feedback type:/);
    assert.match(body, new RegExp(`Propel version or release: ${PROPEL_VERSION}`));
    assert.match(body, /Steps to reproduce/);
    assert.match(body, /Accessibility or official-languages implications:/);
    assert.match(body, /do not include document content/i);
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
    assert.match(body, /Browser and version: Microsoft Edge 140\.0\.0\.0/);
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

test('GitHub problem form URL prefills each technical field by its form id', () => {
    const environment = {
        appVersion: '1.2.3',
        protocol: 'file:',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/141.0',
        browserLanguage: 'fr-CA'
    };
    const url = new URL(buildBugReportUrl(environment));

    assert.equal(url.searchParams.get('template'), 'bug_report.yml');
    assert.equal(url.searchParams.get('version'), '1.2.3');
    assert.equal(url.searchParams.get('distribution'), 'Portable or local-file version');
    assert.equal(url.searchParams.get('browser'), 'Mozilla Firefox 141.0');
    assert.equal(url.searchParams.get('operating-system'), 'Linux');
    assert.equal(url.searchParams.get('browser-language'), 'fr-CA');
});

test('GitHub feature form URL prefills a safe environment summary', () => {
    const url = new URL(buildFeatureRequestUrl({
        protocol: 'https:',
        hostname: 'internal.example.gc.ca',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_7) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15',
        browserLanguage: 'en-CA'
    }));
    const environment = url.searchParams.get('environment');

    assert.equal(url.searchParams.get('template'), 'feature_request.yml');
    assert.match(environment, /Safari 18\.6/);
    assert.match(environment, /macOS 15\.7\.7/);
    assert.doesNotMatch(environment, /internal\.example\.gc\.ca/);
    assert.doesNotMatch(environment, /Mozilla\/5\.0/);
});

test('configuring GitHub issue links supports either link independently', () => {
    const bugReportLink = { href: '' };
    const featureRequestLink = { href: '' };
    const environment = { protocol: 'https:', browserLanguage: 'en' };

    configureGitHubIssueLinks({ bugReportLink, featureRequestLink }, environment);

    assert.equal(bugReportLink.href, buildBugReportUrl(environment));
    assert.equal(featureRequestLink.href, buildFeatureRequestUrl(environment));
    assert.doesNotThrow(() => configureGitHubIssueLinks({}, environment));
});

test('configuring the feedback link does not require document or editor state', () => {
    const link = { href: '' };
    const environment = {
        protocol: 'file:',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/141.0',
        browserLanguage: 'en'
    };

    configureFeedbackEmailLink(link, environment);

    assert.equal(link.href, buildFeedbackEmailUrl(environment));
    assert.doesNotThrow(() => configureFeedbackEmailLink(null));
});

test('general feedback uses a shorter email draft for comments and compliments', () => {
    const url = new URL(buildGeneralFeedbackEmailUrl());
    const link = { href: '' };

    assert.equal(url.pathname, FEEDBACK_EMAIL_ADDRESS);
    assert.equal(url.searchParams.get('cc'), FEEDBACK_EMAIL_CC);
    assert.equal(url.searchParams.get('subject'), GENERAL_FEEDBACK_EMAIL_SUBJECT);
    assert.equal(url.searchParams.get('body'), GENERAL_FEEDBACK_EMAIL_BODY);
    assert.match(url.searchParams.get('body'), /Comment or compliment:/);
    configureGeneralFeedbackEmailLink(link);
    assert.equal(link.href, buildGeneralFeedbackEmailUrl());
    assert.doesNotThrow(() => configureGeneralFeedbackEmailLink(null));
});
