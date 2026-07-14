/** Creates the isolated WET-styled contenteditable surface inside the supplied host. */
export function createWetLiveEditor(host) {
    if (!host) {
        return null;
    }

    const placeholder = host.getAttribute('data-placeholder') || '';
    host.removeAttribute('contenteditable');
    host.removeAttribute('role');
    host.removeAttribute('aria-multiline');

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
        <link rel="stylesheet" href="css/wet-boew.min.css">
        <link rel="stylesheet" href="css/theme.min.css">
        <style>
            * {
                box-sizing: border-box;
            }

            :host {
                display: block;
                position: relative;
                height: 100%;
                min-height: 0;
                background: #fff;
                color: #333;
            }

            .wet-live-editor {
                min-height: 100%;
                height: 100%;
                overflow: auto;
                padding: 16px;
                outline: none;
                background: #fff;
                color: #333;
                font-family: "Noto Sans", sans-serif;
                font-size: 16px;
                line-height: 1.4375;
                -webkit-user-select: text;
                user-select: text;
            }

            .wet-live-editor:empty::before {
                content: attr(data-placeholder);
                color: #6f6f6f;
            }

            .wet-live-editor h1:first-child {
                margin-top: 0;
            }

            .wet-live-editor img {
                max-width: 100%;
                height: auto;
            }

            .wet-live-editor table,
            .wet-live-editor .table-responsive {
                transition: outline-color 0.15s ease, box-shadow 0.15s ease;
            }

            .wet-live-editor table:hover,
            .wet-live-editor .table-responsive:hover {
                outline: 2px solid rgba(37,87,214,0.58);
                outline-offset: 3px;
                box-shadow: 0 0 0 6px rgba(37,87,214,0.08);
            }

            .wet-live-editor .review-flagged-component {
                position: relative;
            }

            .wet-live-editor .review-flag-button {
                position: absolute;
                z-index: 12;
                top: -7px;
                left: -7px;
                display: grid;
                width: 14px;
                height: 14px;
                place-items: center;
                border: 1px solid #92400e;
                border-radius: 50%;
                background: #fff7ed;
                color: #b45309;
                font: 700 9px/1 sans-serif;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
                cursor: pointer;
                opacity: 0;
                pointer-events: none;
                transform: scale(0.88);
                transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                -webkit-user-select: none;
                user-select: none;
            }

            .wet-live-editor.review-flags-visible .review-flag-button {
                opacity: 0.6;
                pointer-events: auto;
            }

            .wet-live-editor.review-flags-visible .review-flag-button:hover,
            .wet-live-editor .review-flag-button:focus {
                opacity: 1;
                transform: scale(1);
                outline: 2px solid rgba(37, 87, 214, 0.45);
                outline-offset: 1px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.24);
            }

            .review-flag-count {
                position: absolute;
                top: -7px;
                right: -8px;
                min-width: 12px;
                height: 12px;
                padding: 0 3px;
                border-radius: 999px;
                background: #b45309;
                color: #fff;
                font: 700 8px/12px sans-serif;
                text-align: center;
            }

            .review-flag-button-error .review-flag-count {
                background: #b91c1c;
            }

            .wet-live-editor .review-flag-button-error {
                border-color: #991b1b;
                background: #fef2f2;
                color: #b91c1c;
            }

            .wet-live-editor .review-flag-target {
                animation: review-flag-pulse 0.8s ease-in-out 2;
            }

            @keyframes review-flag-pulse {
                50% { box-shadow: 0 0 0 7px rgba(180, 83, 9, 0.22); }
            }

            .table-edit-popover {
                position: absolute;
                z-index: 20;
                display: none;
                align-items: center;
                gap: 6px;
                min-height: 32px;
                padding: 5px 10px;
                border: 1px solid rgba(37,87,214,0.36);
                border-radius: 999px;
                background: #fff;
                color: #0f3557;
                font: 700 0.82rem/1.2 "Noto Sans", sans-serif;
                box-shadow: 0 10px 26px rgba(16, 24, 40, 0.18);
                cursor: pointer;
                -webkit-user-select: none;
                user-select: none;
            }

            .table-edit-popover.visible {
                display: inline-flex;
            }

            .table-edit-popover:hover,
            .table-edit-popover:focus {
                border-color: rgba(37,87,214,0.68);
                background: #eef4ff;
                outline: 2px solid rgba(37,87,214,0.24);
                outline-offset: 1px;
            }

            .table-edit-popover-icon {
                position: relative;
                display: inline-block;
                width: 15px;
                height: 15px;
                border: 1px solid currentColor;
                border-radius: 2px;
                background:
                    linear-gradient(currentColor, currentColor) 0 33% / 100% 1px no-repeat,
                    linear-gradient(currentColor, currentColor) 0 66% / 100% 1px no-repeat,
                    linear-gradient(currentColor, currentColor) 33% 0 / 1px 100% no-repeat,
                    linear-gradient(currentColor, currentColor) 66% 0 / 1px 100% no-repeat;
            }
        </style>
        <div id="wetLiveEditor" class="wet-live-editor" contenteditable="true" role="textbox" aria-multiline="true" tabindex="0"></div>
        <button type="button" id="tableEditPopover" class="table-edit-popover" aria-label="Edit table">
            <span class="table-edit-popover-icon" aria-hidden="true"></span>
            <span>Edit table</span>
        </button>
        <button type="button" id="tableComponentPopover" class="table-edit-popover table-component-popover" aria-label="Convert table to component">
            <span aria-hidden="true">◇</span>
            <span>Convert</span>
        </button>
    `;

    const editor = shadow.getElementById('wetLiveEditor');
    editor.setAttribute('data-placeholder', placeholder);
    host.setAttribute('tabindex', '0');
    return editor;
}

/** Redirects focus from the host itself without stealing focus from shadow controls. */
export function focusWetLiveEditorFromHost(event, host, editor) {
    const focusTarget = event?.composedPath?.()[0] || event?.target;
    if (focusTarget === host) {
        editor?.focus();
    }
}

/** Reports whether an event target is inside one of the Live editor overlays. */
export function isWetLiveEditorOverlayTarget(target, overlays) {
    return overlays.some((overlay) => Boolean(overlay && target && overlay.contains(target)));
}
