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
