/*
 * ============================================================
 *  JUICE BOX — Shared Utilities
 * ============================================================
 *  Constants and helpers used across multiple modules.
 *  Loaded early; no dependencies on grid, modes, or app.
 * ============================================================
 */

// Fade duration in ms, read from CSS --fade-duration (keeps JS in sync with stylesheet).
const FADE_MS = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--fade-duration'));

// Delay before starting a level after fade-out begins. Used for mode→level and level→level.
const LEVEL_TRANSITION_DELAY = FADE_MS + 100;

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
 * Adds extra targets to an items array via repeated 50% chances.
 * Items must already have at least one target. Each run has 50% chance to
 * replace one random non-target cell with the target (0–extraRuns extra).
 *
 * @param {string[]} items
 * @param {string} target
 * @param {number} [extraRuns=3] Number of 50% chances
 */
function addExtraTargetsByChance(items, target, extraRuns = 3) {
    for (let i = 0; i < extraRuns; i++) {
        if (Math.random() < 0.5) {
            const nonTargetIndices = items
                .map((s, idx) => (s === target ? -1 : idx))
                .filter((idx) => idx >= 0);
            if (nonTargetIndices.length > 0) {
                const idx = nonTargetIndices[Math.floor(Math.random() * nonTargetIndices.length)];
                items[idx] = target;
            }
        }
    }
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
