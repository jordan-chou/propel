/** Binds and renders the abandoned-document recovery prompt. */
export function createRecoveryPrompt({
    container,
    message,
    restoreButton,
    discardButton,
    dismissButton,
    onRestore,
    onDiscard,
    onDismiss,
    formatSavedAt = formatRecoverySavedAt
}) {
    let candidate = null;

    function hide() {
        if (container) container.hidden = true;
        candidate = null;
    }

    function show(record) {
        candidate = record;
        if (message) {
            message.textContent = `Propel saved a local recovery copy ${formatSavedAt(record.savedAt)}.`;
        }
        if (container) container.hidden = false;
        restoreButton?.focus();
    }

    function bindAction(button, action) {
        button?.addEventListener('click', () => {
            if (!candidate) return;
            const selected = candidate;
            button.disabled = true;
            try {
                const result = action?.(selected);
                if (result && typeof result.then === 'function') {
                    void result.finally(() => {
                        hide();
                        button.disabled = false;
                    });
                    return;
                }
                hide();
                button.disabled = false;
            } catch (error) {
                button.disabled = false;
                throw error;
            }
        });
    }

    function bind() {
        bindAction(restoreButton, onRestore);
        bindAction(discardButton, onDiscard);
        bindAction(dismissButton, onDismiss);
        hide();
    }

    return { bind, show, hide };
}

export function formatRecoverySavedAt(savedAt, locale = undefined) {
    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(savedAt));
}
