/**
 * Coalesces replaceable work so rapid input only processes the latest state.
 * Callers must flush before operations that depend on pending work.
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
