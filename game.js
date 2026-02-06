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
const liquidOverlay = document.getElementById('liquid-overlay');
const grid = document.getElementById('grid');

// When true, the grid is in the middle of a fade-out transition and
// clicks should be ignored so the player can't "double-win."
let isTransitioning = false;

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
    let currentHoverCell = null;
    let isTouchActive = false;
    
    // Helper function to clear all hover states
    function clearAllHovers() {
        grid.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('hover');
        });
        currentHoverCell = null;
    }
    
    // Helper function to check if a point is within a cell's bounds
    function isPointInCell(x, y, cell) {
        if (!cell) return false;
        const rect = cell.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }
    
    // Helper function to find which cell (if any) contains the given point
    function findCellAtPoint(x, y) {
        // First try elementFromPoint
        const elementUnderTouch = document.elementFromPoint(x, y);
        let cellUnderTouch = elementUnderTouch?.closest('.cell');
        
        // Verify the point is actually within the cell's bounds
        // (elementFromPoint can sometimes return stale elements)
        if (cellUnderTouch && !isPointInCell(x, y, cellUnderTouch)) {
            cellUnderTouch = null;
        }
        
        // If elementFromPoint didn't work, check all cells manually
        if (!cellUnderTouch) {
            const allCells = grid.querySelectorAll('.cell');
            for (const cell of allCells) {
                if (!cell.classList.contains('fade-out') && isPointInCell(x, y, cell)) {
                    cellUnderTouch = cell;
                    break;
                }
            }
        }
        
        return cellUnderTouch && !cellUnderTouch.classList.contains('fade-out') ? cellUnderTouch : null;
    }
    
    grid.addEventListener('touchstart', (e) => {
        if (isTransitioning) return;
        isTouchActive = true;
        
        clearAllHovers();
        
        const touch = e.touches[0];
        const cellUnderTouch = findCellAtPoint(touch.clientX, touch.clientY);
        
        if (cellUnderTouch) {
            currentHoverCell = cellUnderTouch;
            cellUnderTouch.classList.add('hover');
        }
    }, { passive: true });
    
    grid.addEventListener('touchmove', (e) => {
        if (isTransitioning || !isTouchActive) return;
        e.preventDefault(); // Prevent scrolling while dragging
        
        const touch = e.touches[0];
        const cellUnderTouch = findCellAtPoint(touch.clientX, touch.clientY);
        
        // Clear all hovers first
        clearAllHovers();
        
        // If finger is over a cell, add hover to it
        if (cellUnderTouch) {
            currentHoverCell = cellUnderTouch;
            cellUnderTouch.classList.add('hover');
        }
        // If no cell found, currentHoverCell is already null from clearAllHovers()
    }, { passive: false });
    
    grid.addEventListener('touchend', (e) => {
        if (isTransitioning) return;
        isTouchActive = false;
        
        // Find which cell the touch ended over
        const touch = e.changedTouches[0];
        const cellUnderTouch = findCellAtPoint(touch.clientX, touch.clientY);
        
        // Always clear all hovers first
        clearAllHovers();
        
        // If touch ended over a cell, trigger click on that cell
        if (cellUnderTouch) {
            if (cellUnderTouch.dataset.sprite === currentMacguffin) {
                winLevel();
            }
        }
    }, { passive: true });
    
    grid.addEventListener('touchcancel', () => {
        isTouchActive = false;
        clearAllHovers();
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

// Wait for the title font to load before revealing the title screen.
// This prevents FOUT (Flash of Unstyled Text) — the user never sees
// the fallback system font. Once ready, clicking anywhere dismisses
// the title and starts the first level.
document.fonts.ready.then(() => {
    // Use double-rAF to guarantee the browser has painted the opacity: 0
    // state before we transition to opacity: 1 — ensures a visible fade-in.
    doubleRAF(() => {
        titleScreen.classList.add('ready');

        titleScreen.addEventListener('click', () => {
            titleScreen.classList.add('hidden');

            // Show the liquid drain effect (it will fade in, play audio, and drain)
            showLiquidDrain();

            // Start the level after the same delay as level-to-level transitions
            // This ensures consistent timing of sprite animations relative to the liquid drain
            setTimeout(() => {
                startLevel();
            }, FADE_MS + 100);  // Match the delay from winLevel()
        }, { once: true });  // Only fire once — the title screen doesn't come back
    });
});
