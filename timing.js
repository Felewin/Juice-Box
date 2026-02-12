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

// Ms the clicked mode button lingers before starting its fade-out (mode select → level).
const MODE_BUTTON_FADE_DELAY_MS = 900;

// Ms to wait before fading macguffin cells (Pairy Picking) so the player sees where duplicates were.
const MACGUFFIN_FADE_DELAY_MS = 600;

// Ms for mode button + background fade-out before drain/level (mode select → level). 4× FADE_MS.
const MODE_SELECT_TO_LEVEL_FADE_MS = FADE_MS * 4;

// Ms for Juice Box + mode buttons fade when returning to title screen.
const RETURN_TO_TITLE_FADE_MS = 300;

// Grid cell bounce-in: random stagger range (min + random up to max).
const GRID_BOUNCE_STAGGER_MIN_MS = 50;
const GRID_BOUNCE_STAGGER_MAX_MS = 600;
