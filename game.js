/*
 * ============================================================
 *  JUICE BOX — Main Game Logic
 * ============================================================
 *  Core gameplay loop:
 *
 *  1. generateLevel() picks all available fruit/veggie sprites,
 *     then duplicates one of them — the "macguffin."
 *     This gives us exactly GRID_COLUMNS × GRID_ROWS items where
 *     one sprite appears twice and the rest appear once each.
 *
 *  2. startLevel() clears the grid, creates a DOM cell for each
 *     item, and animates them in with staggered random delays.
 *
 *  3. The player scans the grid and clicks whichever sprite they
 *     think appears twice. Clicking a correct (macguffin) cell
 *     triggers winLevel(); clicking any other cell does nothing.
 *
 *  4. winLevel() fades all cells out simultaneously, then after
 *     the fade finishes, loops back to step 1 with a fresh
 *     random board.
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

// When true, we're transitioning between scenes (title to level, or level to level)
// The menu button should be hidden during these transitions
let isSceneTransitioning = false;

// Current level's macguffin (the sprite that appears twice)
// Updated each level, used by touch handlers
let currentMacguffin = null;

// ---- Helpers ----

/**
 * Double requestAnimationFrame helper — ensures the browser has painted
 * the current state before applying a change, useful for CSS transitions/animations.
 *
 * @param {Function} callback  Function to call after double-rAF
 */
function doubleRAF(callback) {
    requestAnimationFrame(() => {
        requestAnimationFrame(callback);
    });
}

// ---- Level lifecycle ----

/**
 * Shows a random-colored liquid overlay that fills the screen, then drains
 * downward to reveal the game underneath. Used when transitioning from
 * the title screen to the first level, and between levels. The drain animation
 * duration matches the length of the Juicebox Straw.mp3 audio file.
 * 
 * Fades in the liquid first, then starts draining and plays audio.
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
 * Sets up touch event handlers on the grid to handle drag-to-select behavior.
 * Tracks which cell is under the finger during touch drag and updates hover state.
 * Only triggers click on the cell under the finger when touch ends.
 * Uses currentMacguffin from module scope.
 */
function setupTouchDragHandling() {
    // Simple touch handling: just detect which cell was tapped/released on
    // No hover state management - CSS :hover handles mouse hover naturally
    
    let touchStartCell = null;
    
    grid.addEventListener('touchstart', (e) => {
        if (isTransitioning) return;
        e.preventDefault(); // Prevent default touch behavior
        
        const touch = e.touches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const cellUnderTouch = elementUnderTouch?.closest('.cell');
        
        if (cellUnderTouch && !cellUnderTouch.classList.contains('fade-out')) {
            touchStartCell = cellUnderTouch;
        }
    }, { passive: false });
    
    grid.addEventListener('touchmove', (e) => {
        if (isTransitioning) return;
        e.preventDefault(); // Prevent scrolling while dragging
        
        // Track which cell the finger is currently over
        const touch = e.touches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const cellUnderTouch = elementUnderTouch?.closest('.cell');
        
        if (cellUnderTouch && !cellUnderTouch.classList.contains('fade-out')) {
            touchStartCell = cellUnderTouch;
        }
    }, { passive: false });
    
    grid.addEventListener('touchend', (e) => {
        if (isTransitioning) return;
        
        // Find which cell the touch ended over
        const touch = e.changedTouches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const cellUnderTouch = elementUnderTouch?.closest('.cell');
        
        // Use the cell the touch ended over, or fall back to the last tracked cell
        const finalCell = cellUnderTouch || touchStartCell;
        
        // If touch ended over a cell, trigger click on that cell
        if (finalCell && !finalCell.classList.contains('fade-out')) {
            if (finalCell.dataset.sprite === currentMacguffin) {
                winLevel();
            }
        }
        
        touchStartCell = null;
    }, { passive: true });
    
    grid.addEventListener('touchcancel', () => {
        touchStartCell = null;
    }, { passive: true });
}

/**
 * Called when the player correctly identifies the macguffin.
 * - Locks out further clicks via isTransitioning
 * - Fades all cells out simultaneously (CSS handles the animation)
 * - After the fade finishes (plus a small buffer), starts the next level
 */
function winLevel() {
    isTransitioning = true;

    const cells = grid.querySelectorAll('.cell');

    // Adding .fade-out triggers the opacity transition defined in
    // style.css on every cell at the same time.
    cells.forEach((cell) => {
        cell.classList.add('fade-out');
    });

    // Show the liquid drain animation (fades in, then drains)
    showLiquidDrain();

    // Start the next level immediately - don't wait for liquid animation
    // The liquid will fade in and drain while the new level loads
    setTimeout(startLevel, FADE_MS + 100);
}

/**
 * Returns to the title screen by fading out the current level.
 * Called when the player presses ESC or when returning to menu.
 * - Fades all cells out
 * - Shows the title screen again
 * - Next click on title screen will start a fresh level
 */
function returnToMenu() {
    if (isTransitioning) return; // Don't allow multiple calls
    
    isTransitioning = true;

    const cells = grid.querySelectorAll('.cell');

    // Fade out all cells
    cells.forEach((cell) => {
        cell.classList.add('fade-out');
    });

    // After fade completes, show title screen and clear the grid
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
    }, FADE_MS + 100);
}

// ---- Sprite sizing ----

/**
 * Updates the sprite cell size dynamically based on viewport dimensions.
 * Uses whichever is smaller: screen width / (columns + 2), or screen height / (rows + 2).
 * The +2 accounts for one extra column/row worth of margin on each side.
 * 
 * IMPORTANT: Uses ACTUAL_GRID_COLUMNS and ACTUAL_GRID_ROWS (not the desired
 * GRID_COLUMNS/GRID_ROWS) to ensure sprite sizing matches the actual grid layout.
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
 * Updates the menu button visibility based on scene transition state.
 * Button is hidden during scene transitions (title to level, level to level).
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

// Start the game (liquid drain + level). Used when a mode button is clicked.
function startGameFromMode() {
    titleScreen.classList.add('hidden');
    showLiquidDrain();
    setTimeout(() => {
        startLevel();
    }, FADE_MS + 100);
}

// Click on title screen: if we're showing the title, fade it out and show the mode screen.
// If we're already on the mode screen, this handler does nothing (mode buttons have their own handlers).
function setupTitleScreenClickHandler() {
    titleScreen.addEventListener('click', (e) => {
        if (!modeScreen.classList.contains('hidden')) return;
        titleHeading.classList.add('faded');
        modeScreen.classList.remove('hidden');
        modeScreen.setAttribute('aria-hidden', 'false');
    });
}

// Mode button click: start the game (same level type for both modes for now).
function setupModeScreenHandlers() {
    modeScreen.addEventListener('click', (e) => {
        const btn = e.target.closest('.mode-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        startGameFromMode();
    });
}

// Wait for the title font to load before revealing the title screen.
// This prevents FOUT (Flash of Unstyled Text) — the user never sees
// the fallback system font. Once ready, first click goes to mode screen;
// choosing a mode starts the level.
document.fonts.ready.then(() => {
    // Use double-rAF to guarantee the browser has painted the opacity: 0
    // state before we transition to opacity: 1 — ensures a visible fade-in.
    doubleRAF(() => {
        titleScreen.classList.add('ready');
        setupTitleScreenClickHandler();
        setupModeScreenHandlers();
    });
});

// ESC key handler: return to menu from any level
document.addEventListener('keydown', (e) => {
    // Only handle ESC if we're in a level (title screen is hidden)
    if (e.key === 'Escape' && titleScreen.classList.contains('hidden') && !isTransitioning) {
        returnToMenu();
    }
});

// Menu button click handler: same functionality as ESC
menuButton.addEventListener('click', () => {
    // Only work if we're in a level (title screen is hidden)
    if (titleScreen.classList.contains('hidden') && !isTransitioning) {
        // Fade out the button immediately
        menuButton.classList.add('hidden-during-drain');
        
        // Then return to menu
        returnToMenu();
    }
});
