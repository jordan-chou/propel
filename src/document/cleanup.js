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

export function runStandardCleanup(root) {
    const changes = {
        imageSources: cleanImageSources(root),
        bookmarks: removeWordBookmarks(root),
        bookmarkLinks: cleanWordBookmarkLinks(root),
        emptyAnchors: removeEmptyAnchors(root)
    };
    normalizeSmartQuotes(root);
    return Object.freeze(changes);
}
