# Security and privacy

Propel processes Word files and HTML locally in the browser. The active
application has no API client, analytics, telemetry, document-upload endpoint,
or automatic feedback submission.

## Browser network boundary

Both the served application and portable release use a Content Security Policy
that permits scripts and styles only from the application itself, blocks
connection APIs, embedded objects, and form submission, and prevents remote
images, fonts, and media from loading. A `no-referrer` policy prevents the
application origin from being disclosed during an explicit navigation.

The checked-in WET theme contains upstream Google Fonts and Canada.ca resource
references. The browser policy blocks those references in the served
application, and the portable build removes them from the release stylesheet.
The older `src/run_prettify.js` distribution also contains CDN URLs but is not
referenced by either application entry point.

Ordinary links in document content remain available because editors need to
prepare publishing links. Following one is an explicit navigation away from
Propel. The Feedback routes likewise open GitHub or the user's email client only
after the user chooses a destination.

## Untrusted HTML

All canonical document replacements and command mutations pass through the
document sanitizer before rendering or recovery storage. The sanitizer removes
scripts, embedded documents, active metadata, event-handler attributes, form
destinations, executable URL schemes, and unsafe CSS constructs. Links that
open a new tab receive `noopener noreferrer`.

The Content Security Policy is a second boundary: it blocks inline event
handlers and outbound resource loading if unsafe markup bypasses the sanitizer.
Component-library templates have their own validation, and component previews
run in a sandboxed frame.

The sanitizer intentionally preserves ordinary publishing URLs in the output.
They cannot load as remote resources inside Propel, but may work normally after
the HTML is copied into its intended publishing environment.

## Local storage

Document recovery is enabled by default and retains only the latest sanitized
HTML snapshot, document settings, and source filename (when imported) in
IndexedDB. The Information panel can disable recovery or delete the saved copy
at any time. Disabling recovery deletes existing recovery data and prevents new
writes until it is enabled again.

Recovery data and component-library preferences are not encrypted. Browser
profiles and operating-system accounts remain responsible for protecting local
storage. Deploy Propel on a dedicated origin rather than alongside unrelated
applications so other same-origin scripts cannot access its browser storage.

## Verification and limitations

`npm run check:security` verifies the active entry point's browser policy,
referrer policy, sanitizer boundary, lack of remote runtime assets, and absence
of application network primitives. `npm run verify:portable` additionally
builds the offline release and verifies that remote theme resources and runtime
requests are absent.

These controls cover Propel's code, not browser extensions, compromised
browsers or operating systems, user-chosen external navigation, or HTML after
it leaves Propel. A release security review should also check recorded
third-party versions against current advisories.
