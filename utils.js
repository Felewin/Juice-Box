/*
 * ============================================================
 *  JUICE BOX — Shared Utilities
 * ============================================================
 *  Helpers used across multiple modules (shuffle, doubleRAF).
 *  Timing constants live in timing.js. Loaded early; no dependencies.
 * ============================================================
 */

/**
 * Appends cache-bust query param to a URL. Uses CACHE_BUST from version.js
 * when present (set by deploy); otherwise Date.now() for local dev.
 *
 * @param {string} path  Asset path (e.g. "sprites/banana.png", "audio/click.mp3")
 * @returns {string}     Path with ?v=...
 */
function withCacheBust(path) {
    const v = typeof CACHE_BUST !== 'undefined' ? CACHE_BUST : Date.now();
    return path + (path.includes('?') ? '&' : '?') + 'v=' + v;
}

/**
 * Returns true or false at random (50/50). General-purpose coin toss.
 * @returns {boolean}
 */
function randomCoinToss() {
    return Math.random() < 0.5;
}

/**
 * Randomly applies horizontal mirroring (or not) to a sprite img. Adds .mirrored class when mirrored.
 * Returns scaleX value (1 or -1) for use in JS transforms (e.g. flying sprites).
 *
 * @param {HTMLImageElement} img  Sprite image element
 * @returns {1|-1}  Value for scaleX() in transform
 */
function randomlyApplyHorizontalMirroringOrNotToSprite(img) {
    const mirrored = randomCoinToss();
    if (mirrored) img.classList.add('mirrored');
    return mirrored ? -1 : 1;
}

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
