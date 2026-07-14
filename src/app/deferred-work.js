/**
 * Coalesces replaceable UI work so rapid input only renders the latest state.
 * The caller remains responsible for committing source-of-truth state first.
 */
export function createDeferredWork(callback, delay = 160, timers = globalThis) {
    let timer = null;

    function cancel() {
        if (timer === null) return;
        timers.clearTimeout(timer);
        timer = null;
    }

    function run() {
        cancel();
        callback();
    }

    return Object.freeze({
        schedule() {
            cancel();
            timer = timers.setTimeout(run, delay);
        },
        flush() {
            if (timer !== null) run();
        },
        cancel
    });
}
