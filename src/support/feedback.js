export const FEEDBACK_EMAIL_ADDRESS = 'web@fin.gc.ca';
export const FEEDBACK_EMAIL_CC = 'jordan.chou@fin.gc.ca';
export const FEEDBACK_EMAIL_SUBJECT = 'Propel feedback';
export const GENERAL_FEEDBACK_EMAIL_SUBJECT = 'Propel comment or compliment';

export const FEEDBACK_EMAIL_BODY = `Hello Propel team,

Feedback type: [Problem / improvement / accessibility / documentation / help]
Summary:

Propel version or release:
Distribution: [Portable / hosted / local deployment / development]
Browser and version:
Operating system:
Managed organizational device: [Yes / No / Unsure]

What were you trying to accomplish?

What happened or what would you like improved?

What result did you expect?

Steps to reproduce, if reporting a problem:
1.
2.
3.

Operational impact:

Accessibility or official-languages implications:

Additional sanitized context:

Please do not include document content, personal or protected information, credentials, internal URLs, full local file paths, or sensitive screenshots.`;

export const GENERAL_FEEDBACK_EMAIL_BODY = `Hello Propel team,

Comment or compliment:


May we contact you for follow-up? [Yes / No]

Please do not include document content, personal or protected information, credentials, internal URLs, full local file paths, or sensitive screenshots.`;

function buildEmailUrl(subject, body) {
    const query = [
        ['cc', FEEDBACK_EMAIL_CC],
        ['subject', subject],
        ['body', body]
    ].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('&');
    return `mailto:${FEEDBACK_EMAIL_ADDRESS}?${query}`;
}

/** Builds a mailto URL that users can inspect and edit before sending. */
export function buildFeedbackEmailUrl() {
    return buildEmailUrl(FEEDBACK_EMAIL_SUBJECT, FEEDBACK_EMAIL_BODY);
}

/** Builds a shorter mail draft for comments and compliments. */
export function buildGeneralFeedbackEmailUrl() {
    return buildEmailUrl(GENERAL_FEEDBACK_EMAIL_SUBJECT, GENERAL_FEEDBACK_EMAIL_BODY);
}

/** Configures the feedback email link without reading document or editor state. */
export function configureFeedbackEmailLink(link) {
    if (!link) return;
    link.href = buildFeedbackEmailUrl();
}

/** Configures the lightweight comments-and-compliments email link. */
export function configureGeneralFeedbackEmailLink(link) {
    if (!link) return;
    link.href = buildGeneralFeedbackEmailUrl();
}
