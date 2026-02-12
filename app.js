/*
 * ============================================================
 *  JUICE BOX — App Orchestration
 * ============================================================
 *
 * SCREEN FLOW:
 *   Title screen → (click) → Mode screen → (click mode) → Level
 *   Level → (win) → Level (level-to-level via liquid drain)
 *   Level → (ESC or Juice Box button) → Mode screen → (ESC) → Title screen
 *
 * MODE REGISTRY:
 *   Modes register themselves on window.MODES in their own files.
 *   Each mode has a start(gridEl, opts) method. When the player clicks a
 *   mode button, the data-mode attribute is read and MODES[modeId].start()
 *   is called.
 *
 * HOW TO ADD A NEW MODE (for future programmers):
 *  1. Create a new file in modes/ (e.g. modes/mynewmode.js).
 *  2. Wrap your mode in an IIFE so MAX_CELLS is file-scoped. In start(),
 *     generate level data, define checkWin, then call
 *     startModeLevel(gridEl, opts, MAX_CELLS, { items }, checkWin).
 *  3. Add your mode to window.MODES (inside the IIFE):
 *       (function () {
 *         const MAX_CELLS = ...;
 *         const MODES = window.MODES || {};
 *         MODES.mynewmode = {
 *           start(gridEl, opts) {
 *             const { items } = generateLevel();
 *             const checkWin = (cell) => ...;
 *             startModeLevel(gridEl, opts, MAX_CELLS, { items }, checkWin);
 *           }
 *         };
 *         window.MODES = MODES;
 *       })();
 *  4. Add a mode button in index.html: <button class="mode-btn" data-mode="mynewmode">My New Mode</button>
 *  5. Add <script src="modes/mynewmode.js"></script> before app.js in index.html.
 *
 *  Win conditions vary by mode: some check cell.dataset.sprite, others might check
 *  order, pairs, or custom data attributes. buildGrid only needs checkWin and onWin.
 *
 * TRANSITION & ESC BEHAVIOR:
 *  ESC (or the Juice Box button) goes back one screen: level → mode select → title.
 *
 *  Two kinds of transitions that use the drain animation:
 *  (1) Win transition: Player wins a level → drain plays → next level loads.
 *  (2) Return transition: Player presses ESC or clicks the Juice Box button during a
 *      level → we stop the drain (timers, audio) and fade the overlay out, clear the
 *      grid, and show the mode select.
 *
 *  ESC works during both, so the player can abort a win transition. isTransitioning
 *  blocks cell clicks during either; isReturningToModeSelect blocks ESC spam once we're
 *  already returning. When starting a new drain, any existing drain is cancelled.
 *
 *  Juice Box button: shown on mode select and in level; hidden on title-only. It
 *  fades out during any screen change and fades in when the new screen is ready.
 *  Uses .visible and .hidden-during-transition (see style.css).
 * ============================================================
 */

window.MODES = window.MODES || {};

const titleScreen = document.getElementById('title-screen');
const titleHeading = document.getElementById('title');
const modeScreen = document.getElementById('mode-screen');
const liquidOverlay = document.getElementById('liquid-overlay');
const grid = document.getElementById('grid');
const juiceboxButton = document.getElementById('juicebox-button');

let isTransitioning = false;      // True during win→level or level→mode-select; blocks cell input.
let isSceneTransitioning = false; // True while drain overlay is visible; fades out Juice Box button.
let isReturningToModeSelect = false;    // True only during level→mode-select; blocks returnToModeSelect re-entry.
let isReturningToTitle = false;         // True during mode-select→title; used for Juice Box button fade.
let currentMode = null;  // Set when a mode button is clicked; used by startLevel to dispatch.
let startLevelTimeoutId = null;  // Cleared when returnToModeSelect or when starting a new drain.

/**
 * Updates Juice Box button visibility: .visible when on mode select or level,
 * .hidden-during-transition (fade out) during any transition.
 */
function updateJuiceboxButtonVisibility() {
    if (!juiceboxButton) return;
    const isOnModeSelectOrLevel = !modeScreen.classList.contains('hidden') || titleScreen.classList.contains('hidden');
    if (isOnModeSelectOrLevel) {
        juiceboxButton.classList.add('visible');
    } else {
        juiceboxButton.classList.remove('visible');
    }
    const shouldFadeOut = isSceneTransitioning || isReturningToModeSelect || isReturningToTitle;
    if (shouldFadeOut) {
        juiceboxButton.classList.add('hidden-during-transition');
    } else {
        juiceboxButton.classList.remove('hidden-during-transition');
    }
}

const MACGUFFIN_FADE_DELAY_MS = 600;

/**
 * Called when the player wins a level. Fades cells, plays liquid drain, then
 * starts the next level via startLevel() (which dispatches to the current mode).
 *
 * @param {Object} [winData] Optional data from the mode. If winData.macguffin is set
 *   (Pairy Picking), the two macguffin cells fade 600ms later than the rest,
 *   so the player can see where the duplicates were. Drain and level transition wait
 *   for macguffins to finish fading (600ms + FADE_MS) before starting.
 */
function winLevel(winData = {}) {
    isTransitioning = true;

    if (winData.macguffin) {
        // Fade non-macguffins first; macguffins fade 600ms later so the player
        // can see where the duplicates were.
        grid.querySelectorAll('.cell').forEach((cell) => {
            if (cell.dataset.sprite !== winData.macguffin) {
                cell.classList.add('fade-out');
            }
        });
        setTimeout(() => {
            grid.querySelectorAll('.cell').forEach((cell) => {
                if (cell.dataset.sprite === winData.macguffin) {
                    cell.classList.add('fade-out');
                }
            });
            // Wait for macguffins to finish fading, plus the mode's buffer ms, before starting drain and next level
            setTimeout(() => {
                showLiquidDrain(liquidOverlay, {
                    onTransitionStart: () => {
                        isSceneTransitioning = true;
                        updateJuiceboxButtonVisibility();
                    },
                    onTransitionEnd: () => {
                        isSceneTransitioning = false;
                        updateJuiceboxButtonVisibility();
                    }
                });
                if (startLevelTimeoutId) clearTimeout(startLevelTimeoutId);
                startLevelTimeoutId = setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
            }, FADE_MS + winData.postClickedSpriteFadingPreTransitioningFadeMs);
        }, MACGUFFIN_FADE_DELAY_MS);
    } else {
        fadeOutCells(grid);
        showLiquidDrain(liquidOverlay, {
            onTransitionStart: () => {
                isSceneTransitioning = true;
                updateJuiceboxButtonVisibility();
            },
            onTransitionEnd: () => {
                isSceneTransitioning = false;
                updateJuiceboxButtonVisibility();
            }
        });
        if (startLevelTimeoutId) clearTimeout(startLevelTimeoutId);
        startLevelTimeoutId = setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
    }
}

/**
 * Returns the player to the mode select screen from a level. Cancels any drain
 * (fades it out), clears the grid, and shows the mode screen. Guarded by
 * isReturningToModeSelect so ESC spam is ignored.
 */
function returnToModeSelect() {
    if (isReturningToModeSelect) return;
    isReturningToModeSelect = true;
    isTransitioning = true;

    juiceboxButton?.classList.add('hidden-during-transition');

    cancelLiquidDrain(liquidOverlay, {
        fadeOut: true,
        onCancelled: () => {
            isSceneTransitioning = false;
            updateJuiceboxButtonVisibility();
        }
    });

    if (startLevelTimeoutId) {
        clearTimeout(startLevelTimeoutId);
        startLevelTimeoutId = null;
    }

    fadeOutCells(grid);

    // Wait for fade-out (overlay + cells) to complete, then linger before revealing mode screen.
    setTimeout(() => {
        setTimeout(() => {
            grid.innerHTML = '';
            titleScreen.classList.remove('hidden');
            titleHeading.classList.add('faded');
            modeScreen.classList.remove('hidden');
            modeScreen.setAttribute('aria-hidden', 'false');
            modeScreen.querySelectorAll('.mode-btn').forEach((btn) => btn.classList.remove('fade-out'));
            isTransitioning = false;
            isReturningToModeSelect = false;
            updateJuiceboxButtonVisibility();
        }, LEVEL_POST_FADE_OUT_LINGER_BEFORE_RETURNING_TO_MODE_SELECT);
    }, FADE_MS);
}

/**
 * Returns from mode select to the title screen (title only, mode buttons hidden).
 * Fades the Juice Box button and mode buttons out together (300ms), then hides.
 */
function returnToTitle() {
    if (isReturningToTitle) return;
    isReturningToTitle = true;
    juiceboxButton?.classList.add('hidden-during-transition');
    modeScreen.classList.add('fade-out');
    setTimeout(() => {
        titleHeading.classList.remove('faded');
        modeScreen.classList.remove('fade-out');
        modeScreen.classList.add('hidden');
        modeScreen.setAttribute('aria-hidden', 'true');
        juiceboxButton?.classList.remove('visible');
        isReturningToTitle = false;
    }, 300);
}

/**
 * Starts a level by dispatching to the current mode's start() method.
 * Each mode is responsible for generating level data, defining checkWin, and
 * calling buildGrid. opts (onWin, shouldIgnoreInput) are provided by app.
 */
function startLevel() {
    isTransitioning = false;
    startLevelTimeoutId = null;
    const mode = MODES[currentMode];
    if (!mode || !mode.start) return;
    mode.start(grid, {
        onWin: winLevel,
        shouldIgnoreInput: () => isTransitioning
    });
}

const MODE_BUTTON_FADE_DELAY_MS = 850;

/**
 * Called when the player clicks a mode button. Sets currentMode. Fades juicebox
 * and other mode buttons immediately; delays the clicked button's fade by 850ms,
 * then hides the title screen, plays the liquid drain, and schedules startLevel.
 *
 * @param {string} modeId The data-mode value from the clicked button (e.g. 'pairy-picking').
 * @param {HTMLElement} [clickedBtn] The mode button that was clicked; if provided, it fades 850ms later.
 */
function startGameFromMode(modeId, clickedBtn) {
    currentMode = modeId;

    if (clickedBtn) {
        // Fade juicebox and non-clicked mode buttons immediately
        juiceboxButton?.classList.add('hidden-during-transition');
        modeScreen.querySelectorAll('.mode-btn').forEach((btn) => {
            if (btn !== clickedBtn) btn.classList.add('fade-out');
        });

        // After 850ms, fade the clicked button and start the drain/level
        setTimeout(() => {
            clickedBtn.classList.add('fade-out');
            titleScreen.classList.add('hidden');
            showLiquidDrain(liquidOverlay, {
                onTransitionStart: () => {
                    isSceneTransitioning = true;
                    updateJuiceboxButtonVisibility();
                },
                onTransitionEnd: () => {
                    isSceneTransitioning = false;
                    updateJuiceboxButtonVisibility();
                }
            });
            if (startLevelTimeoutId) clearTimeout(startLevelTimeoutId);
            startLevelTimeoutId = setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
        }, MODE_BUTTON_FADE_DELAY_MS);
    } else {
        titleScreen.classList.add('hidden');
        showLiquidDrain(liquidOverlay, {
            onTransitionStart: () => {
                isSceneTransitioning = true;
                updateJuiceboxButtonVisibility();
            },
            onTransitionEnd: () => {
                isSceneTransitioning = false;
                updateJuiceboxButtonVisibility();
            }
        });
        if (startLevelTimeoutId) clearTimeout(startLevelTimeoutId);
        startLevelTimeoutId = setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
    }
}

/**
 * First click on title screen fades the title and reveals the mode screen.
 * Subsequent clicks (when mode screen is visible) are handled by the mode buttons.
 */
function setupTitleScreenClickHandler() {
    titleScreen.addEventListener('click', () => {
        if (!modeScreen.classList.contains('hidden')) return;
        titleHeading.classList.add('faded');
        modeScreen.classList.remove('hidden');
        modeScreen.setAttribute('aria-hidden', 'false');
        juiceboxButton?.classList.add('visible', 'hidden-during-transition');
        doubleRAF(() => juiceboxButton?.classList.remove('hidden-during-transition'));
    });
}

/**
 * Listens for clicks on mode buttons. Reads data-mode to determine which mode
 * to start. Buttons must have data-mode="<modeId>" matching a key in window.MODES.
 */
function setupModeScreenHandlers() {
    modeScreen.addEventListener('click', (e) => {
        const btn = e.target.closest('.mode-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        playOneshot('audio/Success Jingle Plucking.mp3');
        const modeId = btn.dataset.mode || Object.keys(MODES)[0] || 'go-bananas';  // Fallback: first registered mode
        startGameFromMode(modeId, btn);
    });
}

/**
 * True when the player is in a level (title hidden). Used for ESC and Juice Box button.
 */
function isInLevel() {
    return titleScreen.classList.contains('hidden');
}

/**
 * True when the player is on the mode select screen (mode buttons visible).
 */
function isOnModeSelect() {
    return !modeScreen.classList.contains('hidden');
}

/**
 * Recalculates sprite cell size from viewport. Called on load and resize.
 * Uses ACTUAL_GRID_COLUMNS/ROWS. Each mode sets these when it loads or when it starts.
 */
function updateCellSize() {
    const widthBasedSize = window.innerWidth / (ACTUAL_GRID_COLUMNS + 2);
    const heightBasedSize = window.innerHeight / (ACTUAL_GRID_ROWS + 2);
    const cellSize = Math.min(widthBasedSize, heightBasedSize);
    document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
}

/**
 * Sets mode button height via --mode-btn-height. Each button gets 1/(n+2) of
 * viewport height (n = number of buttons); the +2 reserves space above and below.
 * Called on init and resize.
 */
function updateModeButtonHeight() {
    const btns = modeScreen.querySelectorAll('.mode-btn');
    const n = btns.length;
    const height = n > 0 ? `calc(100vh / ${n + 2})` : 'auto';
    document.documentElement.style.setProperty('--mode-btn-height', height);
}

// Startup: init grid dimensions, set cell size, preload sprites. After fonts load, add .ready
// and wire up title/mode click handlers.
initDefaultGridDimensions();
updateCellSize();
updateModeButtonHeight();
window.addEventListener('resize', () => {
    updateCellSize();
    updateModeButtonHeight();
});

ALL_SPRITES.forEach((name) => {
    const img = new Image();
    img.src = spriteSrc(name);
});

document.fonts.ready.then(() => {
    doubleRAF(() => {
        titleScreen.classList.add('ready');
        setupTitleScreenClickHandler();
        setupModeScreenHandlers();
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (isInLevel()) returnToModeSelect();
    else if (isOnModeSelect()) returnToTitle();
});

juiceboxButton.addEventListener('click', () => {
    if (isInLevel()) {
        juiceboxButton.classList.add('hidden-during-transition');
        returnToModeSelect();
    } else if (isOnModeSelect()) {
        returnToTitle();
    }
});
