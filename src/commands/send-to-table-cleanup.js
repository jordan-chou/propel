/**
 * Stores HTML for the Table Cleanup tool and returns a short session token.
 */
export function saveHTMLToSession(html) {
    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem(token, html);
    return token;
}
