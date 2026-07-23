import { PROPEL_VERSION } from '../app/app-info.js';

export const FEEDBACK_EMAIL_ADDRESS = 'web@fin.gc.ca';
export const FEEDBACK_EMAIL_CC = 'jordan.chou@fin.gc.ca';
export const FEEDBACK_EMAIL_SUBJECT = 'Propel feedback';
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

function getFeedbackContent({ type = 'problem', title = '', details = '' } = {}) {
    return {
        type: type === 'improvement' ? 'Suggestion' : 'Issue',
        title: title.trim(),
        details: details.trim()
    };
}

function buildEnvironmentSummary(environment) {
    const details = getFeedbackEnvironmentDetails(environment);
    return [
        `Propel version: ${details.version}`,
        `Distribution: ${details.distribution}`,
        `Browser: ${details.browser}`,
        `Operating system: ${details.operatingSystem}`,
        `Browser language: ${details.browserLanguage}`
    ].join('\n');
}

/** Builds a short draft using the user's in-app entry and privacy-safe environment details. */
export function buildFeedbackEmailBody({
    appVersion = PROPEL_VERSION,
    protocol = '',
    hostname = '',
    userAgent = '',
    browserLanguage = ''
} = {}, feedback = {}) {
    const content = getFeedbackContent(feedback);
    const environment = buildEnvironmentSummary({
        appVersion,
        protocol,
        hostname,
        userAgent,
        browserLanguage
    });

    return `Hello Propel team,

Type: ${content.type}
Title: ${content.title}

Details:
${content.details}

Environment:
${environment}

Please remove document content, personal or protected information, credentials, internal URLs, and full local file paths before sending.`;
}

export const FEEDBACK_EMAIL_BODY = buildFeedbackEmailBody();

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

/** Builds a problem form URL from the user's in-app entry. */
export function buildBugReportUrl(environment, feedback = {}) {
    const content = getFeedbackContent(feedback);
    return buildGitHubIssueUrl(BUG_REPORT_TEMPLATE, {
        title: content.title,
        details: content.details,
        environment: buildEnvironmentSummary(environment)
    });
}

/** Builds an improvement form URL from the user's in-app entry. */
export function buildFeatureRequestUrl(environment, feedback = {}) {
    const content = getFeedbackContent(feedback);
    return buildGitHubIssueUrl(FEATURE_REQUEST_TEMPLATE, {
        title: content.title,
        details: content.details,
        environment: buildEnvironmentSummary(environment)
    });
}

/** Builds a mailto URL that users can inspect and edit before sending. */
export function buildFeedbackEmailUrl(environment, feedback = {}) {
    const content = getFeedbackContent(feedback);
    const subject = content.title
        ? `${FEEDBACK_EMAIL_SUBJECT}: ${content.title}`
        : FEEDBACK_EMAIL_SUBJECT;
    return buildEmailUrl(subject, buildFeedbackEmailBody(environment, feedback));
}

/**
 * Keeps both submission routes synchronized with the compact in-app form.
 * No document or editor content is read or retained.
 */
export function createFeedbackComposer({
    form,
    typeInputs = [],
    titleInput,
    detailsInput,
    detailsLabel,
    githubIssueLink,
    feedbackEmailLink
}, environment) {
    const inputList = Array.from(typeInputs);
    const getFeedback = () => ({
        type: inputList.find(input => input.checked)?.value || 'problem',
        title: titleInput?.value || '',
        details: detailsInput?.value || ''
    });

    const update = () => {
        const feedback = getFeedback();
        const isImprovement = feedback.type === 'improvement';
        if (titleInput) {
            titleInput.placeholder = isImprovement
                ? 'Example: Add a faster way to insert common components'
                : 'Example: Table cleanup does not open';
        }
        if (detailsLabel) {
            detailsLabel.textContent = isImprovement
                ? 'What would improve Propel?'
                : 'What happened?';
        }
        if (detailsInput) {
            detailsInput.placeholder = isImprovement
                ? 'Example: Let me pin frequently used components so I can insert them without searching each time.'
                : 'Example: I selected a table and chose Table cleanup, but the editor did not open. I expected to see the table editor.';
        }
        if (githubIssueLink) {
            githubIssueLink.href = isImprovement
                ? buildFeatureRequestUrl(environment, feedback)
                : buildBugReportUrl(environment, feedback);
        }
        if (feedbackEmailLink) {
            feedbackEmailLink.href = buildFeedbackEmailUrl(environment, feedback);
        }
    };

    const requireCompleteEntry = event => {
        update();
        if (form && !form.reportValidity()) event.preventDefault();
    };

    [...inputList, titleInput, detailsInput].forEach(input => {
        input?.addEventListener('input', update);
        input?.addEventListener('change', update);
    });
    githubIssueLink?.addEventListener('click', requireCompleteEntry);
    feedbackEmailLink?.addEventListener('click', requireCompleteEntry);
    update();

    return { update };
}
