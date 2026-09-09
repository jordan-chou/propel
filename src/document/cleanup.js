/** Deterministic cleanup applied immediately after conversion and on demand. */
export function cleanImageSources(root) {
    const images = root.querySelectorAll('img');
    images.forEach(image => image.setAttribute('src', ''));
    return images.length;
}

export function removeWordBookmarks(root) {
    const bookmarks = root.querySelectorAll('a[id^="_"]');
    bookmarks.forEach((bookmark) => bookmark.replaceWith(...bookmark.childNodes));
    return bookmarks.length;
}

export function cleanWordBookmarkLinks(root) {
    const links = root.querySelectorAll('a[href^="#_Toc"]');
    links.forEach(link => link.setAttribute('href', ''));
    return links.length;
}

export function removeEmptyAnchors(root) {
    const anchors = Array.from(root.querySelectorAll('a')).filter((anchor) =>
        Array.from(anchor.childNodes).every((node) =>
            node.nodeType === node.COMMENT_NODE ||
            (node.nodeType === node.TEXT_NODE && !node.textContent.replace(/\u00a0/g, '').trim())
        )
    );
    anchors.forEach(anchor => anchor.remove());
    return anchors.length;
}

export function normalizeSmartQuotes(root) {
    root.innerHTML = root.innerHTML.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

/** Unwrap Outlook Safe Links without resolving or fetching their destinations. */
export function unwrapSafeLink(href) {
    let result = href;
    while (true) {
        try {
            const wrapper = new URL(result);
            if (!['https:', 'http:'].includes(wrapper.protocol) ||
                !(wrapper.hostname === 'safelinks.protection.outlook.com' ||
                    wrapper.hostname.endsWith('.safelinks.protection.outlook.com'))) break;

            // URLSearchParams decodes one wrapper layer. Decoding again would
            // corrupt percent escapes belonging to the destination itself.
            const destination = wrapper.searchParams.get('url');
            const parsed = new URL(destination);
            if (!['https:', 'http:'].includes(parsed.protocol) || destination === result) break;
            result = destination;
        } catch {
            break;
        }
    }
    return result;
}

export function cleanSafeLinks(root) {
    let count = 0;
    root.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href');
        const destination = unwrapSafeLink(href);
        if (destination !== href) {
            link.setAttribute('href', destination);
            count += 1;
        }
    });
    return count;
}

export function runStandardCleanup(root) {
    const changes = {
        imageSources: cleanImageSources(root),
        bookmarks: removeWordBookmarks(root),
        bookmarkLinks: cleanWordBookmarkLinks(root),
        emptyAnchors: removeEmptyAnchors(root)
    };
    normalizeSmartQuotes(root);
    changes.safeLinks = cleanSafeLinks(root);
    return Object.freeze(changes);
}
