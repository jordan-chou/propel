import { PROPEL_VERSION } from '../app/app-info.js';

export const FEEDBACK_EMAIL_ADDRESS = 'web@fin.gc.ca';
export const FEEDBACK_EMAIL_CC = 'jordan.chou@fin.gc.ca';
export const FEEDBACK_EMAIL_SUBJECT = 'Propel feedback';
export const GENERAL_FEEDBACK_EMAIL_SUBJECT = 'Propel comment or compliment';
export const GITHUB_NEW_ISSUE_URL = 'https://github.com/jordan-chou/propel/issues/new';
export const BUG_REPORT_TEMPLATE = 'bug_report.yml';
export const FEATURE_REQUEST_TEMPLATE = 'feature_request.yml';

const UNKNOWN_BROWSER_DETAIL = 'Not detected';

/** Returns a broad deployment category without exposing the current hostname or URL. */
export function detectFeedbackDistribution({ protocol = '', hostname = '' } = {}) {
    if (protocol === 'file:') return 'Portable or local-file version';

    const normalizedHostname = hostname.toLowerCase();
    if (normalizedHostname === 'localhost' || normalizedHostname === '127.0.0.1' || normalizedHostname === '[::1]') {
        return 'Development or local web server';
    }

    if (protocol === 'http:' || protocol === 'https:') return 'Web deployment';
    return UNKNOWN_BROWSER_DETAIL;
}

/** Converts a user-agent string into a short browser name and version. */
export function detectFeedbackBrowser(userAgent = '') {
    const browserPatterns = [
        ['Microsoft Edge', /(?:Edg|EdgA|EdgiOS)\/([0-9.]+)/],
        ['Opera', /(?:OPR|Opera)\/([0-9.]+)/],
        ['Google Chrome', /(?:Chrome|CriOS)\/([0-9.]+)/],
        ['Mozilla Firefox', /(?:Firefox|FxiOS)\/([0-9.]+)/],
        ['Safari', /Version\/([0-9.]+).*Safari/]
    ];

    for (const [name, pattern] of browserPatterns) {
        const match = userAgent.match(pattern);
        if (match) return `${name} ${match[1]}`;
    }

    return UNKNOWN_BROWSER_DETAIL;
}

/** Converts a user-agent string into a broad operating-system name and version. */
export function detectFeedbackOperatingSystem(userAgent = '') {
    let match = userAgent.match(/(?:iPhone OS|CPU(?: iPhone)? OS) ([0-9_]+)/);
    if (match) return `iOS ${match[1].replaceAll('_', '.')}`;

    match = userAgent.match(/Android ([0-9.]+)/);
    if (match) return `Android ${match[1]}`;

    match = userAgent.match(/Windows NT ([0-9.]+)/);
    if (match) {
        const versions = {
            '10.0': 'Windows 10 or 11',
            '6.3': 'Windows 8.1',
            '6.2': 'Windows 8',
            '6.1': 'Windows 7'
        };
        return versions[match[1]] || `Windows (NT ${match[1]})`;
    }

    match = userAgent.match(/CrOS [^ ]+ ([0-9.]+)/);
    if (match) return `ChromeOS ${match[1]}`;

    match = userAgent.match(/Mac OS X ([0-9_]+)/);
    if (match) return `macOS ${match[1].replaceAll('_', '.')}`;

    if (/Linux/.test(userAgent)) return 'Linux';
    return UNKNOWN_BROWSER_DETAIL;
}

/** Accepts only a short language tag rather than arbitrary browser-provided text. */
export function normalizeFeedbackLanguage(language = '') {
    return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language)
        ? language
        : UNKNOWN_BROWSER_DETAIL;
}

/** Returns the normalized values shared by email and GitHub feedback routes. */
export function getFeedbackEnvironmentDetails({
    appVersion = PROPEL_VERSION,
    protocol = '',
    hostname = '',
    userAgent = '',
    browserLanguage = ''
} = {}) {
    return {
        version: appVersion,
        distribution: detectFeedbackDistribution({ protocol, hostname }),
        browser: detectFeedbackBrowser(userAgent),
        operatingSystem: detectFeedbackOperatingSystem(userAgent),
        browserLanguage: normalizeFeedbackLanguage(browserLanguage)
    };
}

/** Builds a draft using only selected, privacy-safe environment details. */
export function buildFeedbackEmailBody({
    appVersion = PROPEL_VERSION,
    protocol = '',
    hostname = '',
    userAgent = '',
    browserLanguage = ''
} = {}) {
    const details = getFeedbackEnvironmentDetails({
        appVersion,
        protocol,
        hostname,
        userAgent,
        browserLanguage
    });

    return `Hello Propel team,

Feedback type: [Problem / improvement / accessibility / documentation / help]
Summary:

Propel version or release: ${details.version}
Distribution: ${details.distribution}
Browser and version: ${details.browser}
Operating system: ${details.operatingSystem}
Browser language: ${details.browserLanguage}
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
}

export const FEEDBACK_EMAIL_BODY = buildFeedbackEmailBody();

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

function buildGitHubIssueUrl(template, fields) {
    const url = new URL(GITHUB_NEW_ISSUE_URL);
    url.searchParams.set('template', template);
    for (const [id, value] of Object.entries(fields)) url.searchParams.set(id, value);
    return url.toString();
}

/** Builds a GitHub Issue Form URL with technical fields prefilled. */
export function buildBugReportUrl(environment) {
    const details = getFeedbackEnvironmentDetails(environment);
    return buildGitHubIssueUrl(BUG_REPORT_TEMPLATE, {
        version: details.version,
        distribution: details.distribution,
        browser: details.browser,
        'operating-system': details.operatingSystem,
        'browser-language': details.browserLanguage
    });
}

/** Builds a feature-request URL with an optional prefilled environment summary. */
export function buildFeatureRequestUrl(environment) {
    const details = getFeedbackEnvironmentDetails(environment);
    const summary = [
        `Propel version: ${details.version}`,
        `Distribution: ${details.distribution}`,
        `Browser and version: ${details.browser}`,
        `Operating system: ${details.operatingSystem}`,
        `Browser language: ${details.browserLanguage}`
    ].join('\n');
    return buildGitHubIssueUrl(FEATURE_REQUEST_TEMPLATE, { environment: summary });
}

/** Configures both GitHub links without retaining or transmitting document state. */
export function configureGitHubIssueLinks({ bugReportLink, featureRequestLink }, environment) {
    if (bugReportLink) bugReportLink.href = buildBugReportUrl(environment);
    if (featureRequestLink) featureRequestLink.href = buildFeatureRequestUrl(environment);
}

/** Builds a mailto URL that users can inspect and edit before sending. */
export function buildFeedbackEmailUrl(environment) {
    return buildEmailUrl(FEEDBACK_EMAIL_SUBJECT, buildFeedbackEmailBody(environment));
}

/** Builds a shorter mail draft for comments and compliments. */
export function buildGeneralFeedbackEmailUrl() {
    return buildEmailUrl(GENERAL_FEEDBACK_EMAIL_SUBJECT, GENERAL_FEEDBACK_EMAIL_BODY);
}

/** Configures the feedback email link without reading document or editor state. */
export function configureFeedbackEmailLink(link, environment) {
    if (!link) return;
    link.href = buildFeedbackEmailUrl(environment);
}

/** Configures the lightweight comments-and-compliments email link. */
export function configureGeneralFeedbackEmailLink(link) {
    if (!link) return;
    link.href = buildGeneralFeedbackEmailUrl();
}
