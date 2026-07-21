const dismissalPreferenceKey = 'onboardingDismissed';

export function createOnboardingController({ card, blankButton, preferences }) {
    let dismissed = preferences?.get(dismissalPreferenceKey, false) === true;

    function update(hasFile = false) {
        if (card) {
            card.hidden = hasFile || dismissed;
        }
    }

    function dismiss() {
        dismissed = true;
        preferences?.set(dismissalPreferenceKey, true);
        update(false);
    }

    function bind() {
        blankButton?.addEventListener('click', dismiss);
        update(false);
    }

    return { bind, update };
}
