import test from 'node:test';
import assert from 'node:assert/strict';
import {
    FEEDBACK_EMAIL_ADDRESS,
    FEEDBACK_EMAIL_BODY,
    FEEDBACK_EMAIL_CC,
    GENERAL_FEEDBACK_EMAIL_BODY,
    GENERAL_FEEDBACK_EMAIL_SUBJECT,
    buildFeedbackEmailUrl,
    buildGeneralFeedbackEmailUrl,
    configureFeedbackEmailLink,
    configureGeneralFeedbackEmailLink
} from '../../src/support/feedback.js';

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
    assert.match(body, /Propel version or release:/);
    assert.match(body, /Steps to reproduce/);
    assert.match(body, /Accessibility or official-languages implications:/);
    assert.match(body, /do not include document content/i);
});

test('configuring the feedback link does not require document or editor state', () => {
    const link = { href: '' };

    configureFeedbackEmailLink(link);

    assert.equal(link.href, buildFeedbackEmailUrl());
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
