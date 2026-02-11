/*
 * ============================================================
 *  JUICE BOX — Main Game Logic
 * ============================================================
 *
 * SCREEN FLOW (we never go directly from title to level):
 *   Title screen → (click) → Mode screen → (click mode) → Level
 *   Level → (win) → Level (level-to-level via liquid drain)
 *   Level → (ESC/menu) → Title screen
 *
 * CORE GAMEPLAY LOOP:
 *  1. generateLevel() (level.js) picks fruit/veggie sprites and duplicates
 *     one — the "macguffin." One sprite appears twice, the rest once each.
 *
 *  2. startLevel() clears the grid, creates a DOM cell per item, animates them
 *     in with staggered delays.
 *
 *  3. Player finds and clicks the duplicate. Correct click → winLevel();
 *     wrong click → nothing.
 *
 *  4. winLevel() fades cells out, plays liquid drain, starts the next level.
 * ============================================================
 */

// audio.js and level.js are loaded before this script, so their functions are available globally

// ---- Shared constants ----

// Grid dimensions are defined in level.js (loaded before this script)
// ACTUAL_GRID_COLUMNS and ACTUAL_GRID_ROWS are available globally from level.js
// These are the actual dimensions used (may be reduced from desired GRID_COLUMNS/GRID_ROWS
// if they would exceed 21 cells, which is the sprite limit: 20 unique + 1 duplicate)

// Read the fade-out duration from the CSS custom property so it stays
// in sync with the stylesheet. parseInt("400ms") → 400.
const FADE_MS = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--fade-duration'));

// Delay before starting a level (fade-out + buffer). Used for mode screen→level and level→level.
const LEVEL_TRANSITION_DELAY = FADE_MS + 100;

// ---- DOM references & state ----

const titleScreen = document.getElementById('title-screen');
const titleHeading = document.getElementById('title');
const modeScreen = document.getElementById('mode-screen');
const liquidOverlay = document.getElementById('liquid-overlay');
const grid = document.getElementById('grid');
const menuButton = document.getElementById('menu-button');

// When true, the grid is in the middle of a fade-out transition and
// clicks should be ignored so the player can't "double-win."
let isTransitioning = false;

// When true, we're transitioning between scenes (mode screen→level or level→level)
// The menu button should be hidden during these transitions
let isSceneTransitioning = false;

// Current level's macguffin (the sprite that appears twice)
// Updated each level, used by touch handlers
let currentMacguffin = null;

// ---- Helpers ----

/**
 * Double requestAnimationFrame — waits for the browser to finish painting the current
 * frame before running the callback. This is useful when you need to apply a CSS
 * change (e.g. add a class) and then immediately trigger a transition; without
 * double-rAF, the browser might batch the paint and the transition would not be
 * visible. One rAF runs before the next paint; two ensures we've painted once.
 *
 * @param {Function} callback  Function to run after the browser has painted
 */
function doubleRAF(callback) {
    requestAnimationFrame(() => {
        requestAnimationFrame(callback);
    });
}

// ---- Level lifecycle ----

/**
 * Plays the liquid drain transition: a random-colored overlay fills the screen,
 * fades in, then drains downward to reveal the game. Used when going from the
 * mode screen to a level, or when transitioning between levels after a win.
 * The drain animation duration is synced to the Juicebox Straw.mp3 audio length.
 *
 * Sequence: reset overlay → fade in → load audio → play audio + start drain →
 * hide overlay when done. During this time, isSceneTransitioning is true so the
 * menu button stays hidden.
 */
function showLiquidDrain() {
    // Mark that we're transitioning between scenes
    isSceneTransitioning = true;
    updateMenuButtonVisibility();
    
    // Generate a random vibrant juice color (hue 0-360, high saturation, medium lightness)
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);  // 70-100%
    const lightness = 40 + Math.floor(Math.random() * 20);   // 40-60%
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    liquidOverlay.style.backgroundColor = color;
    liquidOverlay.classList.remove('hidden', 'draining', 'visible');  // Reset state

    // Fade in the liquid first
    doubleRAF(() => {
        liquidOverlay.classList.add('visible');

        // After fade-in completes, start draining and play audio
        setTimeout(() => {
            // Load the audio file to get its duration, then sync the animation
            loadAudioMetadata('audio/Juicebox Straw.mp3').then((audio) => {
                const durationMs = audio.duration * 1000;  // Convert to milliseconds
                const durationSec = audio.duration;  // Keep in seconds for CSS

                // Play the audio
                playOneshot('audio/Juicebox Straw.mp3');

                // Set the CSS animation duration to match the audio length
                // The keyframe animation has three segments matching the audio timing
                liquidOverlay.style.animationDuration = `${durationSec}s`;

                // Start the drain animation
                doubleRAF(() => {
                    liquidOverlay.classList.add('draining');

                    // Remove the overlay completely after the animation finishes
                    setTimeout(() => {
                        liquidOverlay.classList.add('hidden');
                        // Scene transition is complete
                        isSceneTransitioning = false;
                        updateMenuButtonVisibility();
                    }, durationMs);
                });
            });
        }, 300);  // Wait for fade-in to complete (matches CSS transition duration)
    });
}

/**
 * Sets up and displays a new level:
 * - Clears any previous cells from the grid
 * - Generates a fresh random layout via generateLevel()
 * - Creates a DOM element for each sprite
 * - Staggers their entrance animations with random delays
 * - Attaches click handlers that check for the macguffin
 */
function startLevel() {
    isTransitioning = false;  // Re-enable clicks
    grid.innerHTML = '';      // Remove all cells from the previous level

    const { items, macguffin } = generateLevel();
    currentMacguffin = macguffin;  // Store for touch handlers

    // Play the scatter/plop sound 3 times, each starting 25-35% through the previous one (randomized)
    playOverlapping('audio/Scatter Plops.mp3', 3, 0.25, 0.35);

    items.forEach((sprite) => {
        // Create the cell container
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.sprite = sprite;  // Store the sprite name for click-checking

        // Create the sprite image inside the cell
        const img = document.createElement('img');
        img.src = spriteSrc(sprite);
        img.alt = sprite;
        img.draggable = false;  // Prevent drag-and-drop of the image
        cell.appendChild(img);

        // Stagger entrance: each cell waits a random 50–650ms before
        // the CSS .appear class triggers its bounceIn animation.
        // Using overlapping scatter plops for sprite entrance sounds
        const delay = Math.random() * 600 + 50;
        setTimeout(() => {
            cell.classList.add('appear');
            // Individual mouth pop sound not used — using overlapping scatter plops instead
        }, delay);

        // Click handler: if this cell's sprite matches the macguffin,
        // the player found the duplicate — they win the level!
        // Clicking a non-macguffin cell does nothing (no penalty).
        cell.addEventListener('click', () => {
            if (isTransitioning) return;       // Ignore clicks during fade-out
            if (cell.dataset.sprite === macguffin) {
                winLevel();
            }
        });

        grid.appendChild(cell);
    });
    
    // Set up touch drag handling at the grid level for better tracking
    // Note: Event listeners are added once and persist across levels since
    // we're using grid.innerHTML = '' which doesn't remove event listeners
    // on the grid itself. If we need to remove/re-add, we'd need to track
    // the handlers, but for now this works since we check isTransitioning.
    if (!grid.dataset.touchHandlersSetup) {
        setupTouchDragHandling();
        grid.dataset.touchHandlersSetup = 'true';
    }
}

/**
 * Finds which grid cell (if any) is under the user's finger during a touch event.
 * Used by touch handlers to determine which cell was tapped or is being dragged over.
 * Returns null if no touch data, no cell at that position, or the cell is fading out
 * (we don't want to register hits on cells that are already disappearing).
 *
 * Handles both touchstart/touchmove (touches[0]) and touchend (changedTouches[0])
 * since touch-end events only have changedTouches.
 *
 * @param {TouchEvent} touchEvent  A touchstart, touchmove, or touchend event
 * @returns {Element|null}       The .cell element under the touch, or null
 */
function getCellUnderTouch(touchEvent) {
    const touch = touchEvent.touches?.[0] ?? touchEvent.changedTouches?.[0];
    if (!touch) return null;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const cell = el?.closest('.cell');
    return cell && !cell.classList.contains('fade-out') ? cell : null;
}

/**
 * Sets up touch handlers on the grid so mobile users can "tap" a cell by touching
 * and releasing, even if their finger drifts slightly. On touch devices, :hover
 * doesn't work reliably, so we track which cell the finger is over during touchstart
 * and touchmove. When touchend fires, we check if that cell (or the last cell the
 * finger was over) is the macguffin — if so, the player wins.
 *
 * We use getCellUnderTouch() to avoid duplicating the "find cell under finger" logic.
 * currentMacguffin is read from module scope (updated each level by startLevel).
 */
function setupTouchDragHandling() {
    let touchStartCell = null;

    const updateTrackedCell = (e) => {
        const cell = getCellUnderTouch(e);
        if (cell) touchStartCell = cell;
    };

    grid.addEventListener('touchstart', (e) => {
        if (isTransitioning) return;
        e.preventDefault();
        updateTrackedCell(e);
    }, { passive: false });

    grid.addEventListener('touchmove', (e) => {
        if (isTransitioning) return;
        e.preventDefault();
        updateTrackedCell(e);
    }, { passive: false });
    
    grid.addEventListener('touchend', (e) => {
        if (isTransitioning) return;
        const finalCell = getCellUnderTouch(e) || touchStartCell;
        if (finalCell && finalCell.dataset.sprite === currentMacguffin) {
            winLevel();
        }
        touchStartCell = null;
    }, { passive: true });
    
    grid.addEventListener('touchcancel', () => {
        touchStartCell = null;
    }, { passive: true });
}

/**
 * Fades out all grid cells by adding the .fade-out class. The CSS on .cell defines
 * an opacity transition, so this triggers a smooth fade. Used in two places: when
 * the player wins a level (winLevel) and when they return to the menu (returnToMenu).
 * Extracting this keeps the fade logic in one place.
 */
function fadeOutCells() {
    grid.querySelectorAll('.cell').forEach((cell) => {
        cell.classList.add('fade-out');
    });
}

/**
 * Called when the player correctly clicks the duplicate (macguffin) sprite.
 * 1. Sets isTransitioning so no more clicks register
 * 2. Fades out all cells (fadeOutCells)
 * 3. Plays the liquid drain transition (showLiquidDrain)
 * 4. Schedules startLevel after LEVEL_TRANSITION_DELAY so the new level appears
 *    as the liquid drains away (level-to-level transition)
 */
function winLevel() {
    isTransitioning = true;
    fadeOutCells();
    showLiquidDrain();
    setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
}

/**
 * Returns the player to the title/mode screen from an active level. Called when
 * they press ESC or click the menu button.
 *
 * 1. Fades out all cells (fadeOutCells)
 * 2. After LEVEL_TRANSITION_DELAY: clears the grid, shows the title screen again,
 *    resets to title view (title visible, mode screen hidden), and re-enables
 *    interaction. Next click on the title reveals the mode screen; choosing a
 *    mode starts a fresh level.
 */
function returnToMenu() {
    if (isTransitioning) return; // Don't allow multiple calls
    isTransitioning = true;
    fadeOutCells();

    setTimeout(() => {
        // Clear the grid
        grid.innerHTML = '';
        
        // Show the title screen again (this will hide the menu button via CSS)
        titleScreen.classList.remove('hidden');
        // Reset to title view: show title, hide mode screen
        titleHeading.classList.remove('faded');
        modeScreen.classList.add('hidden');
        modeScreen.setAttribute('aria-hidden', 'true');
        // Update button visibility since title screen is now visible
        updateMenuButtonVisibility();
        
        isTransitioning = false;
    }, LEVEL_TRANSITION_DELAY);
}

// ---- Sprite sizing ----

/**
 * Recalculates and sets the sprite cell size based on the current viewport.
 * We want sprites to fit on screen: we divide width by (columns + 2) and height
 * by (rows + 2), then use the smaller result. The +2 gives a margin of one
 * extra column/row on each side. This sets the CSS variable --cell-size that
 * the grid and sprites use. Called on load and on window resize.
 *
 * Uses ACTUAL_GRID_COLUMNS and ACTUAL_GRID_ROWS from level.js (not the desired
 * dimensions) so we never try to display more cells than we have sprites for.
 */
function updateCellSize() {
    // Calculate sprite size based on ACTUAL grid dimensions + margin (1 extra column/row on each side)
    // Using ACTUAL dimensions ensures the sizing matches the actual grid that will be displayed
    const widthBasedSize = window.innerWidth / (ACTUAL_GRID_COLUMNS + 2);
    const heightBasedSize = window.innerHeight / (ACTUAL_GRID_ROWS + 2);
    const cellSize = Math.min(widthBasedSize, heightBasedSize);
    
    document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
}

// ---- Initialization ----

// Set ACTUAL grid dimensions as CSS custom properties so CSS can use them
// These are the dimensions that will actually be used (may be reduced from desired
// dimensions if they would exceed 21 cells - see level.js for details)
document.documentElement.style.setProperty('--grid-columns', ACTUAL_GRID_COLUMNS);
document.documentElement.style.setProperty('--grid-rows', ACTUAL_GRID_ROWS);

// Update cell size on load and whenever the window is resized
updateCellSize();
window.addEventListener('resize', updateCellSize);

// Preload every sprite image into the browser cache so there's no
// visible pop-in or flicker when a sprite first appears in a level.
ALL_SPRITES.forEach((name) => {
    const img = new Image();
    img.src = spriteSrc(name);
});

/**
 * Shows or hides the menu button based on the current state. The button is visible
 * only when we're actively playing a level (title screen hidden, not transitioning).
 * It stays hidden when: the title/mode screen is visible, or during liquid drain
 * transitions (mode screen→level or level→level). This avoids the button popping
 * in during the drain animation.
 */
function updateMenuButtonVisibility() {
    if (!menuButton) return;
    
    if (isSceneTransitioning || !titleScreen.classList.contains('hidden')) {
        // Hide button during transitions or when title screen is visible
        menuButton.classList.add('hidden-during-drain');
    } else {
        // Show button when not transitioning and title screen is hidden
        menuButton.classList.remove('hidden-during-drain');
    }
}

/**
 * Starts the game when the player clicks a mode button. Hides the title/mode screen,
 * plays the liquid drain transition, and schedules startLevel after the transition
 * delay. This is the only way to begin gameplay — we never go directly from title
 * to level; the flow is always title → mode screen → level.
 */
function startGameFromMode() {
    titleScreen.classList.add('hidden');
    showLiquidDrain();
    setTimeout(startLevel, LEVEL_TRANSITION_DELAY);
}

/**
 * Handles clicks on the title screen. When the title is visible (mode screen is
 * hidden), a click fades out the "Juice Box" title and reveals the mode screen
 * with its two mode buttons. If the mode screen is already visible, this handler
 * does nothing — clicks on the mode buttons are handled by setupModeScreenHandlers.
 */
function setupTitleScreenClickHandler() {
    titleScreen.addEventListener('click', (e) => {
        if (!modeScreen.classList.contains('hidden')) return;
        titleHeading.classList.add('faded');
        modeScreen.classList.remove('hidden');
        modeScreen.setAttribute('aria-hidden', 'false');
    });
}

/**
 * Handles clicks on the mode screen buttons. Uses event delegation: we listen on
 * the mode screen container and check if the click target is a .mode-btn. If so,
 * we prevent the event from bubbling (so the title screen handler doesn't run)
 * and call startGameFromMode to begin the level. Both mode buttons currently
 * start the same level type; a second mode can be added later.
 */
function setupModeScreenHandlers() {
    modeScreen.addEventListener('click', (e) => {
        const btn = e.target.closest('.mode-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        startGameFromMode();
    });
}

// Wait for the title font (Cherry Bomb One) to load before revealing the title screen.
// This prevents FOUT — the user never sees a brief flash of the fallback font.
// Once ready, we show the title; first click reveals the mode screen; choosing
// a mode starts the level (never directly from title to level).
document.fonts.ready.then(() => {
    // Use double-rAF to guarantee the browser has painted the opacity: 0
    // state before we transition to opacity: 1 — ensures a visible fade-in.
    doubleRAF(() => {
        titleScreen.classList.add('ready');
        setupTitleScreenClickHandler();
        setupModeScreenHandlers();
    });
});

/**
 * Returns true when the player is actively in a level (playing), and it's safe to
 * show the menu button or handle ESC/menu clicks. We're "in level" when the title
 * screen is hidden (so we're past the title/mode screens) and we're not in the
 * middle of a fade-out transition (which would make double-triggers possible).
 *
 * @returns {boolean}  True if we're playing a level and can return to menu
 */
function isInLevel() {
    return titleScreen.classList.contains('hidden') && !isTransitioning;
}

// ESC key handler: return to menu when playing a level
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isInLevel()) returnToMenu();
});

// Menu button click handler: same as ESC — return to title/mode screen from a level
menuButton.addEventListener('click', () => {
    if (isInLevel()) {
        // Fade out the button immediately
        menuButton.classList.add('hidden-during-drain');
        
        // Then return to menu
        returnToMenu();
    }
});
