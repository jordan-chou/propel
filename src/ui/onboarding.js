const dismissalPreferenceKey = 'onboardingDismissed';

export function createOnboardingController({ card, blankButton, dismissButton, preferences, onDismiss }) {
    let dismissed = preferences?.get(dismissalPreferenceKey, false) === true;
    let hasFile = false;
    let recoveryAvailable = false;

    function render() {
        if (card) {
            card.hidden = hasFile || (dismissed && !recoveryAvailable);
        }
    }

    function update(nextHasFile = false) {
        hasFile = nextHasFile;
        render();
    }

    function setRecoveryAvailable(available) {
        recoveryAvailable = available;
        render();
    }

    function show() {
        dismissed = false;
        preferences?.set(dismissalPreferenceKey, false);
        update(false);
    }

    function dismiss() {
        dismissed = true;
        recoveryAvailable = false;
        preferences?.set(dismissalPreferenceKey, true);
        render();
        onDismiss?.();
    }

    function bind() {
        blankButton?.addEventListener('click', dismiss);
        dismissButton?.addEventListener('click', dismiss);
        update(false);
    }

    return { bind, update, show, setRecoveryAvailable };
}
