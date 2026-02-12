/*
 * ============================================================
 *  JUICE BOX — Shared Utilities
 * ============================================================
 *  Helpers used across multiple modules (shuffle, doubleRAF).
 *  Timing constants live in timing.js. Loaded early; no dependencies.
 * ============================================================
 */

/**
 * Fisher-Yates shuffle — returns a new randomly-ordered copy of `array`.
 * Does NOT mutate the original.
 *
 * @param {Array} array  Array to shuffle
 * @returns {Array}      New array with elements in random order
 */
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Double requestAnimationFrame — waits for the browser to finish painting the
 * current frame before running the callback. Use when applying a CSS change and
 * immediately triggering a transition; a single rAF may not yield a visible paint.
 *
 * @param {Function} callback  Function to run after the browser has painted.
 */
function doubleRAF(callback) {
    requestAnimationFrame(() => {
        requestAnimationFrame(callback);
    });
}
