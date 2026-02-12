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
 *  Three transition scenarios:
 *  (1) Mode-select → Level: User clicks a mode button. After delay, title hides,
 *      drain plays, level loads. If ESC during this (before/during drain, before
 *      sprites appear), abortTransitionToLevel() returns to mode select.
 *  (2) Win transition: Player wins a level → drain plays → next level loads.
 *  (3) Return from level: ESC or Juice Box during a level → returnToModeSelect()
 *      cancels drain, clears grid, shows mode select.
 *
 *  Spam guards: isReturningToModeSelect, isReturningToTitle, and isTransitioningToLevel
 *  prevent re-entry; abortTransitionToLevel returns early when !isTransitioningToLevel.
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
let isFirstLevelOfSession = false; // True when entering a mode from mode select; false when continuing from a win.
let isReturningToModeSelect = false;    // True only during level→mode-select; blocks returnToModeSelect re-entry.
let isReturningToTitle = false;         // True during mode-select→title; used for Juice Box button fade.
let isTransitioningToLevel = false;     // True from mode-button click until startLevel runs; ESC aborts to mode select.
let currentMode = null;  // Set when a mode button is clicked; used by startLevel to dispatch.
let startLevelTimeoutId = null;  // Scheduled by scheduleDrainAndLevel; cleared on abort or return.
let timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel = [];   // Outer+inner timeouts (button fade, drain schedule); cleared on abort or return to mode select.

/** Restores body background (used when returning from level or aborting transition). */
function resetBodyBackground() {
    document.body.style.background = '';
    document.body.style.backgroundSize = '';
    document.body.style.animation = '';
}

/**
 * Returns drain callbacks for showLiquidDrain. Pass opts to add/override (e.g. color, startVisible).
 */
function createDrainCallbacks(opts = {}) {
    return {
        onTransitionStart: () => {
            isSceneTransitioning = true;
            updateJuiceboxButtonVisibility();
        },
        onTransitionEnd: () => {
            isSceneTransitioning = false;
            updateJuiceboxButtonVisibility();
        },
        ...opts
    };
}

/**
 * Plays the liquid drain and schedules startLevel after LEVEL_TRANSITION_DELAY.
 */
function scheduleDrainAndLevel(drainOpts) {
    showLiquidDrain(liquidOverlay, drainOpts);
    if (startLevelTimeoutId) clearTimeout(startLevelTimeoutId);
    startLevelTimeoutId = setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
}

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

/**
 * Called when the player wins a level. Fades cells, plays liquid drain, then
 * starts the next level via startLevel() (which dispatches to the current mode).
 *
 * @param {Object} [winData] Optional data from the mode. If winData.macguffin is set
 *   (Pairy Picking), the two macguffin cells fade MACGUFFIN_FADE_DELAY_MS later than the rest,
 *   so the player can see where the duplicates were. Drain and level transition wait
 *   for macguffins to finish fading (MACGUFFIN_FADE_DELAY_MS + FADE_MS) before starting.
 */
function winLevel(winData = {}) {
    isTransitioning = true;

    const drainColor = currentMode ? MODE_ACCENT_COLORS[currentMode] : null;
    const drainOpts = createDrainCallbacks({ color: drainColor });

    if (winData.macguffin) {
        // Fade non-macguffins first; macguffins fade MACGUFFIN_FADE_DELAY_MS later so the player
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
                scheduleDrainAndLevel(drainOpts);
            }, FADE_MS + winData.postClickedSpriteFadingPreTransitioningFadeMs);
        }, MACGUFFIN_FADE_DELAY_MS);
    } else {
        fadeOutCells(grid);
        scheduleDrainAndLevel(drainOpts);
    }
}

/**
 * Returns the player to the mode select screen from a level. Cancels any drain
 * (fades it out), clears the grid, and shows the mode screen.
 *
 * Guarded by isReturningToModeSelect so ESC spam is ignored.
 * Also used when aborting a win transition (ESC during level-to-level drain).
 */
function returnToModeSelect() {
    if (isReturningToModeSelect) return;
    isReturningToModeSelect = true;
    isTransitioning = true;
    isTransitioningToLevel = false;

    juiceboxButton?.classList.add('hidden-during-transition');

    cancelLiquidDrain(liquidOverlay, {
        fadeOut: true,
        onCancelled: () => {
            isSceneTransitioning = false;
            updateJuiceboxButtonVisibility();
        }
    });

    // Cancel any scheduled level start or mode-transition timeouts
    if (startLevelTimeoutId) {
        clearTimeout(startLevelTimeoutId);
        startLevelTimeoutId = null;
    }
    timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel.forEach((id) => clearTimeout(id));
    timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel = [];

    fadeOutCells(grid);
    resetBodyBackground();

    // Wait for overlay + cell fade-out, then linger, then reveal mode select
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
 * Aborts the mode-select→level transition. Called when ESC or Juice Box is pressed
 * after clicking a mode button but before (or during) the drain, or before the level
 * loads. Returns to mode select without ever showing the grid.
 *
 * Handles both cases: (1) Before title was hidden (overlay just appeared), (2) After
 * title hidden and drain started (sprites not yet appeared). In case (2), we must
 * restore the title screen since it was hidden when the inner timeout ran.
 *
 * Guarded by isTransitioningToLevel; returns early if not transitioning (spam-safe).
 */
function abortTransitionToLevel() {
    if (!isTransitioningToLevel) return;
    isTransitioningToLevel = false;

    // Cancel delayed work: button fades, drain schedule, and level start
    timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel.forEach((id) => clearTimeout(id));
    timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel = [];
    if (startLevelTimeoutId) {
        clearTimeout(startLevelTimeoutId);
        startLevelTimeoutId = null;
    }

    cancelLiquidDrain(liquidOverlay, {
        fadeOut: true,
        onCancelled: () => {
            isSceneTransitioning = false;
            updateJuiceboxButtonVisibility();
        }
    });

    liquidOverlay.classList.remove('visible', 'draining');
    liquidOverlay.classList.add('hidden');

    resetBodyBackground();

    // Restore title screen and mode select (needed when drain started—case 2; harmless no-op in case 1)
    titleScreen.classList.remove('hidden');
    titleHeading.classList.add('faded');
    modeScreen.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.style.transition = '';
        btn.classList.remove('fade-out');
    });
    juiceboxButton?.classList.remove('hidden-during-transition');
    updateJuiceboxButtonVisibility();
}

/**
 * Returns from mode select to the title screen (title only, mode buttons hidden).
 * Fades the Juice Box button and mode buttons out together, then hides.
 *
 * Guarded by isReturningToTitle so ESC spam is ignored.
 */
function returnToTitle() {
    if (isReturningToTitle) return;
    isReturningToTitle = true;
    resetBodyBackground();
    cancelLiquidDrain(liquidOverlay);
    liquidOverlay.classList.remove('visible', 'draining');
    liquidOverlay.classList.add('hidden');
    juiceboxButton?.classList.add('hidden-during-transition');
    modeScreen.classList.add('fade-out');
    setTimeout(() => {
        titleHeading.classList.remove('faded');
        modeScreen.classList.remove('fade-out');
        modeScreen.classList.add('hidden');
        modeScreen.setAttribute('aria-hidden', 'true');
        juiceboxButton?.classList.remove('visible');
        isReturningToTitle = false;
    }, RETURN_TO_TITLE_FADE_MS);
}

/**
 * Starts a level by dispatching to the current mode's start() method.
 * Each mode is responsible for generating level data, defining checkWin, and
 * calling buildGrid. opts (onWin, shouldIgnoreInput) are provided by app.
 */
function startLevel() {
    isTransitioning = false;
    isTransitioningToLevel = false;
    startLevelTimeoutId = null;
    const mode = MODES[currentMode];
    if (!mode || !mode.start) return;
    const opts = {
        onWin: winLevel,
        shouldIgnoreInput: () => isTransitioning,
        isFirstLevelOfSession: isFirstLevelOfSession
    };
    isFirstLevelOfSession = false;
    mode.start(grid, opts);
}

/**
 * Called when the player clicks a mode button. Sets currentMode. Fades juicebox
 * and other mode buttons immediately; delays the clicked button's fade by MODE_BUTTON_FADE_DELAY_MS,
 * then hides the title screen, plays the liquid drain, and schedules startLevel.
 *
 * @param {string} modeId The data-mode value from the clicked button (e.g. 'pairy-picking').
 * @param {HTMLElement} [clickedBtn] The mode button that was clicked; if provided, it fades after MODE_BUTTON_FADE_DELAY_MS.
 */
function startGameFromMode(modeId, clickedBtn) {
    currentMode = modeId;
    isFirstLevelOfSession = true;
    isTransitioningToLevel = true;  // ESC aborts until startLevel runs

    // Clear any pending timeouts from a previous abort (if user re-clicked quickly)
    timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel.forEach((id) => clearTimeout(id));
    timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel = [];

    if (clickedBtn) {
        // Fade juicebox and non-clicked mode buttons immediately
        juiceboxButton?.classList.add('hidden-during-transition');
        modeScreen.querySelectorAll('.mode-btn').forEach((btn) => {
            if (btn !== clickedBtn) btn.classList.add('fade-out');
        });

        // Fade in the liquid overlay with mode accent color (behind the mode button)
        const accentColor = MODE_ACCENT_COLORS[modeId];
        if (accentColor) {
            liquidOverlay.style.backgroundColor = accentColor;
            liquidOverlay.classList.remove('hidden', 'draining');
            doubleRAF(() => liquidOverlay.classList.add('visible'));
        }

        // After linger, fade the clicked button, then hide title and start drain/level.
        // Store timeout IDs so abortTransitionToLevel can cancel them.
        const outerId = setTimeout(() => {
            if (!isTransitioningToLevel) return;  // Aborted
            clickedBtn.style.transition = `opacity ${MODE_SELECT_TO_LEVEL_FADE_MS}ms ease`;
            clickedBtn.classList.add('fade-out');

            const innerId = setTimeout(() => {
                if (!isTransitioningToLevel) return;  // Aborted
                clickedBtn.style.transition = '';
                titleScreen.classList.add('hidden');
                scheduleDrainAndLevel(createDrainCallbacks({
                    color: accentColor,
                    startVisible: !!accentColor
                }));
            }, MODE_SELECT_TO_LEVEL_FADE_MS);
            timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel.push(innerId);
        }, MODE_BUTTON_FADE_DELAY_MS);
        timeoutIDsWeMayUseToCancelPendingTimeoutsForTransitioningFromModeSelectToLevel.push(outerId);
    } else {
        titleScreen.classList.add('hidden');
        scheduleDrainAndLevel(createDrainCallbacks());
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

// Startup: init grid dimensions, set cell size, preload sprites. After fonts load, add .ready
// and wire up title/mode click handlers.
initDefaultGridDimensions();
updateCellSize();
updateModeButtonHeight();
window.addEventListener('resize', () => {
    updateCellSize();
    updateModeButtonHeight();
});

[...ALL_SPRITES, ...(window.UNJUICABLE_SPRITES || [])].forEach((name) => {
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

// ESC: abort transition → return from level → return to title (priority order)
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (isTransitioningToLevel) abortTransitionToLevel();
    else if (isInLevel()) returnToModeSelect();
    else if (isOnModeSelect()) returnToTitle();
});

// Juice Box button: same priority as ESC
juiceboxButton.addEventListener('click', () => {
    if (isTransitioningToLevel) {
        abortTransitionToLevel();
    } else if (isInLevel()) {
        juiceboxButton.classList.add('hidden-during-transition');
        returnToModeSelect();
    } else if (isOnModeSelect()) {
        returnToTitle();
    }
});
