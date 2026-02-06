/*
 * ============================================================
 *  JUICE BOX — Main Game Logic
 * ============================================================
 *  Core gameplay loop:
 *
 *  1. generateLevel() picks 20 of the 21 available fruit/veggie
 *     sprites, then duplicates one of them — the "macguffin."
 *     This gives us exactly 21 items (to fill a 3×7 grid) where
 *     one sprite appears twice and the rest appear once each.
 *
 *  2. startLevel() clears the grid, creates a DOM cell for each
 *     of the 21 items, and animates them in with staggered
 *     random delays.
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
 * - Creates a DOM element for each of the 21 sprites
 * - Staggers their entrance animations with random delays
 * - Attaches click handlers that check for the macguffin
 */
function startLevel() {
    isTransitioning = false;  // Re-enable clicks
    grid.innerHTML = '';      // Remove all cells from the previous level

    const { items, macguffin } = generateLevel();

    // TEMPORARY: Using overlapping scatter plops instead of individual mouth pops
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
        // TEMPORARY: Individual mouth pop sound disabled — using looped scatter plops instead
        const delay = Math.random() * 600 + 50;
        setTimeout(() => {
            cell.classList.add('appear');
            // playOneshot('audio/Mouth Pop.mp3');  // TEMPORARILY DISABLED
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
}

/**
 * Called when the player correctly identifies the macguffin.
 * - Locks out further clicks via isTransitioning
 * - Fades all cells out simultaneously (CSS handles the animation)
 * - After the fade finishes (plus a small buffer), starts the next level
 */
function winLevel() {
    isTransitioning = true;

    // TEMPORARILY DISABLED: Play the success jingle when the player finds the match
    // playOneshot('audio/Success Jingle Plucking.mp3');

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

// ---- Initialization ----

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
