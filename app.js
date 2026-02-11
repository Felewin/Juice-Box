/*
 * ============================================================
 *  JUICE BOX — App Orchestration
 * ============================================================
 *
 * SCREEN FLOW:
 *   Title screen → (click) → Mode screen → (click mode) → Level
 *   Level → (win) → Level (level-to-level via liquid drain)
 *   Level → (ESC/menu) → Title screen
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
 *  Two transition types: (1) win → next level (drain, then startLevel), (2) ESC/menu
 *  → title screen (cancel drain, clear grid). ESC works during both so the player can
 *  abort a win transition. isTransitioning blocks cell input during either type;
 *  isReturningToMenu is true only during (2), allowing returnToMenu to run during (1)
 *  but blocking ESC spam once we're already returning. When starting a new drain,
 *  any existing drain is cancelled instantly.
 * ============================================================
 */

window.MODES = window.MODES || {};

const titleScreen = document.getElementById('title-screen');
const titleHeading = document.getElementById('title');
const modeScreen = document.getElementById('mode-screen');
const liquidOverlay = document.getElementById('liquid-overlay');
const grid = document.getElementById('grid');
const menuButton = document.getElementById('menu-button');

let isTransitioning = false;      // True during win→level or menu→title; blocks cell input.
let isSceneTransitioning = false; // True while drain overlay is visible; hides menu button.
let isReturningToMenu = false;    // True only during menu→title; blocks returnToMenu re-entry.
let currentMode = null;  // Set when a mode button is clicked; used by startLevel to dispatch.
let startLevelTimeoutId = null;  // Cleared when returnToMenu or when starting a new drain.

function updateMenuButtonVisibility() {
    if (!menuButton) return;
    if (isSceneTransitioning || !titleScreen.classList.contains('hidden')) {
        menuButton.classList.add('hidden-during-drain');
    } else {
        menuButton.classList.remove('hidden-during-drain');
    }
}

/**
 * Called when the player wins a level. Fades cells, plays liquid drain, then
 * starts the next level via startLevel() (which dispatches to the current mode).
 */
function winLevel() {
    isTransitioning = true;
    fadeOutCells(grid);
    showLiquidDrain(liquidOverlay, {
        onTransitionStart: () => {
            isSceneTransitioning = true;
            updateMenuButtonVisibility();
        },
        onTransitionEnd: () => {
            isSceneTransitioning = false;
            updateMenuButtonVisibility();
        }
    });
    if (startLevelTimeoutId) clearTimeout(startLevelTimeoutId);
    startLevelTimeoutId = setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
}

/**
 * Returns the player to the title/mode screen. Fades cells, clears the grid,
 * and resets the UI so the next click reveals the mode screen.
 * Cancels any drain (fades it out) and any scheduled startLevel. Guarded by
 * isReturningToMenu so ESC spam is ignored.
 */
function returnToMenu() {
    if (isReturningToMenu) return;
    isReturningToMenu = true;
    isTransitioning = true;

    cancelLiquidDrain(liquidOverlay, {
        fadeOut: true,
        onCancelled: () => {
            isSceneTransitioning = false;
            updateMenuButtonVisibility();
        }
    });

    if (startLevelTimeoutId) {
        clearTimeout(startLevelTimeoutId);
        startLevelTimeoutId = null;
    }

    fadeOutCells(grid);

    setTimeout(() => {
        grid.innerHTML = '';
        titleScreen.classList.remove('hidden');
        titleHeading.classList.remove('faded');
        modeScreen.classList.add('hidden');
        modeScreen.setAttribute('aria-hidden', 'true');
        updateMenuButtonVisibility();
        isTransitioning = false;
        isReturningToMenu = false;
    }, LEVEL_TRANSITION_DELAY);
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

/**
 * Called when the player clicks a mode button. Sets currentMode, hides the
 * title/mode screen, plays the liquid drain, then schedules startLevel.
 *
 * @param {string} modeId The data-mode value from the clicked button (e.g. 'discover-the-duplicate').
 */
function startGameFromMode(modeId) {
    currentMode = modeId;
    titleScreen.classList.add('hidden');
    showLiquidDrain(liquidOverlay, {
        onTransitionStart: () => {
            isSceneTransitioning = true;
            updateMenuButtonVisibility();
        },
        onTransitionEnd: () => {
            isSceneTransitioning = false;
            updateMenuButtonVisibility();
        }
    });
    if (startLevelTimeoutId) clearTimeout(startLevelTimeoutId);
    startLevelTimeoutId = setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
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
        const modeId = btn.dataset.mode || Object.keys(MODES)[0] || 'discover-the-duplicate';  // Fallback: first registered mode
        startGameFromMode(modeId);
    });
}

/**
 * True when the player has left the title screen (mode selected or gameplay).
 * Used to show/hide the menu button and to allow ESC/menu to return.
 * Includes transitions (drain, win) so ESC works immediately to abort.
 */
function isInLevel() {
    return titleScreen.classList.contains('hidden');
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

initDefaultGridDimensions();
updateCellSize();
window.addEventListener('resize', updateCellSize);

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
    if (e.key === 'Escape' && isInLevel()) returnToMenu();
});

menuButton.addEventListener('click', () => {
    if (isInLevel()) {
        menuButton.classList.add('hidden-during-drain');
        returnToMenu();
    }
});
