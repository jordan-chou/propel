/** Creates controllers for the activity drawer and shortcut dialog. */
export function createDrawerControllers({ activity, shortcuts, onActivityChange }) {
    let shortcutPreviousFocus = null;

    function isActivityOpen() {
        return Boolean(activity.panel && activity.panel.classList.contains('open'));
    }

    function setActivityOpen(isOpen) {
        if (!activity.panel) return;
        activity.panel.classList.toggle('open', isOpen);
        activity.panel.setAttribute('aria-hidden', String(!isOpen));
        activity.toggleButton?.setAttribute('aria-expanded', String(isOpen));
        onActivityChange?.(isOpen);
    }

    function handleActivityKeydown(event) {
        if (event.key !== 'Escape' || !isActivityOpen()) return;
        event.preventDefault();
        setActivityOpen(false);
        activity.toggleButton?.focus();
    }

    function updateShortcutPlatform() {
        if (!shortcuts.dialog) return;
        const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
        const isApple = /mac|iphone|ipad|ipod/i.test(platform);
        const labels = isApple ? { primary: 'Cmd', alternate: 'Option' } : { primary: 'Ctrl', alternate: 'Alt' };
        shortcuts.dialog.querySelectorAll('[data-shortcut-key]').forEach((key) => {
            key.textContent = labels[key.dataset.shortcutKey];
        });
        shortcuts.dialog.querySelectorAll('[data-shortcut-platform]').forEach((item) => {
            item.hidden = item.dataset.shortcutPlatform === 'apple' ? !isApple : isApple;
        });
    }

    function selectCheatsheetTab(tabName, { focus = false } = {}) {
        if (!shortcuts.dialog) return;
        const tabs = Array.from(shortcuts.dialog.querySelectorAll('[data-cheatsheet-tab]'));
        const selectedTab = tabs.find((tab) => tab.dataset.cheatsheetTab === tabName) || tabs[0];
        if (!selectedTab) return;

        tabs.forEach((tab) => {
            const isSelected = tab === selectedTab;
            tab.setAttribute('aria-selected', String(isSelected));
            tab.tabIndex = isSelected ? 0 : -1;
        });
        shortcuts.dialog.querySelectorAll('[data-cheatsheet-panel]').forEach((panel) => {
            panel.hidden = panel.dataset.cheatsheetPanel !== selectedTab.dataset.cheatsheetTab;
        });
        if (focus) selectedTab.focus();
    }

    function handleCheatsheetTabKeydown(event) {
        const currentTab = event.target.closest('[data-cheatsheet-tab]');
        if (!currentTab || !shortcuts.dialog) return;
        const tabs = Array.from(shortcuts.dialog.querySelectorAll('[data-cheatsheet-tab]'));
        const currentIndex = tabs.indexOf(currentTab);
        let nextIndex = null;

        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        selectCheatsheetTab(tabs[nextIndex].dataset.cheatsheetTab, { focus: true });
    }

    function openShortcuts(tabName = null) {
        if (!shortcuts.dialog) return;
        shortcutPreviousFocus = document.activeElement;
        if (tabName) selectCheatsheetTab(tabName);
        shortcuts.dialog.hidden = false;
        shortcuts.backdrop?.classList.add('open');
        shortcuts.toggleButton?.setAttribute('aria-expanded', 'true');
        shortcuts.feedbackButton?.setAttribute('aria-expanded', 'true');
        shortcuts.closeButton?.focus();
    }

    function closeShortcuts() {
        if (!shortcuts.dialog || shortcuts.dialog.hidden) return;
        shortcuts.dialog.hidden = true;
        shortcuts.backdrop?.classList.remove('open');
        shortcuts.toggleButton?.setAttribute('aria-expanded', 'false');
        shortcuts.feedbackButton?.setAttribute('aria-expanded', 'false');
        shortcutPreviousFocus?.focus?.();
        shortcutPreviousFocus = null;
    }

    function handleShortcutKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeShortcuts();
            return;
        }
        if (event.key !== 'Tab' || !shortcuts.dialog || shortcuts.dialog.hidden) return;
        const focusable = getFocusableElements(shortcuts.dialog);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function bind() {
        activity.toggleButton?.addEventListener('click', () => setActivityOpen(!isActivityOpen()));
        activity.closeButton?.addEventListener('click', () => setActivityOpen(false));
        document.addEventListener('keydown', handleActivityKeydown, true);
        shortcuts.toggleButton?.addEventListener('click', () => openShortcuts());
        shortcuts.feedbackButton?.addEventListener('click', () => openShortcuts('feedback'));
        shortcuts.instructionsButton?.addEventListener('click', () => openShortcuts('instructions'));
        shortcuts.closeButton?.addEventListener('click', closeShortcuts);
        shortcuts.backdrop?.addEventListener('click', closeShortcuts);
        shortcuts.dialog?.addEventListener('keydown', handleShortcutKeydown);
        shortcuts.dialog?.querySelectorAll('[data-cheatsheet-tab]').forEach((tab) => {
            tab.addEventListener('click', () => selectCheatsheetTab(tab.dataset.cheatsheetTab));
            tab.addEventListener('keydown', handleCheatsheetTabKeydown);
        });
        updateShortcutPlatform();
    }

    return {
        bind,
        activity: { isOpen: isActivityOpen, setOpen: setActivityOpen },
        shortcuts: { open: openShortcuts, close: closeShortcuts }
    };
}

function getFocusableElements(root) {
    return Array.from(root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
}
