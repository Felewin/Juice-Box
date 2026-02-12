/*
 * ============================================================
 *  JUICE BOX — Timing Constants
 * ============================================================
 *  Fade durations and transition delays. Loaded early; no dependencies.
 *  FADE_MS is read from CSS --fade-duration so JS stays in sync with stylesheet.
 * ============================================================
 */

// Fade duration in ms, read from CSS --fade-duration (keeps JS in sync with stylesheet).
const FADE_MS = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--fade-duration'));

// Delay before starting a level when showLiquidDrain runs. Used for mode→level and level→level.
const LEVEL_TRANSITION_DELAY = FADE_MS + 100;

// Ms to wait after fade-out completes before revealing the mode screen (return-to-mode-select).
const LEVEL_POST_FADE_OUT_LINGER_BEFORE_RETURNING_TO_MODE_SELECT = 100;
