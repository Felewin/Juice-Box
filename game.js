/*
 * ============================================================
 *  JUICE BOX — Game Logic
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

// ---- Sprite catalog ----
// Every filename in the sprites/ folder (without the .png extension).
// There are 20 total. Each level, we use all 20 and duplicate one randomly.
const ALL_SPRITES = [
    'apple-green', 'apple-red', 'avocado', 'banana', 'carrot',
    'cherries', 'coconut', 'cucumber', 'grapes', 'greens',
    'kiwi', 'lemon', 'mango', 'melon', 'peach',
    'pear', 'pineapple', 'strawberry', 'tangerine',
    'watermelon'
];

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

// Build the full image path for a sprite name.
// Single source of truth so the path pattern isn't repeated.
const spriteSrc = (name) => `sprites/${name}.png`;

/**
 * Play an audio file once from start to finish ("one-shot").
 * Creates a fresh Audio object each call so overlapping plays
 * don't cut each other off. Fire-and-forget — no need to await.
 *
 * @param {string} src  Path to the audio file (e.g. "audio/my-sound.mp3")
 */
function playOneshot(src) {
    const audio = new Audio(src);
    audio.play();
}

/**
 * Play an audio file a specific number of times back-to-back.
 * Each time the clip ends it restarts, counting down until all
 * repetitions are done. Like playOneshot, each call creates its
 * own Audio object so it won't interfere with other sounds.
 *
 * @param {string} src    Path to the audio file
 * @param {number} times  How many total plays (e.g. 3 = play, replay, replay)
 */
function playLooped(src, times) {
    const audio = new Audio(src);
    let remaining = times;
    audio.addEventListener('ended', () => {
        remaining--;
        if (remaining > 0) {
            audio.currentTime = 0;
            audio.play();
        }
    });
    audio.play();
}

/**
 * Play an audio file multiple times with overlapping starts.
 * Each subsequent play begins at a random percentage through
 * the previous play (within a specified range), creating a
 * layered/overlapping effect with natural variation.
 *
 * @param {string} src            Path to the audio file
 * @param {number} times          How many total plays
 * @param {number} minOverlapPct  Minimum overlap percentage (0.0 to 1.0)
 * @param {number} maxOverlapPct  Maximum overlap percentage (0.0 to 1.0)
 *                                Each play uses a random value between min and max.
 *                                Example: 3 plays with 0.25-0.35 range on a 1s clip:
 *                                - Play 1 at 0ms
 *                                - Play 2 at random(250-350ms) after play 1
 *                                - Play 3 at random(250-350ms) after play 2
 */
function playOverlapping(src, times, minOverlapPct, maxOverlapPct) {
    // Load the audio to get its duration
    const audio = new Audio(src);
    audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration * 1000; // Convert to milliseconds
        let cumulativeDelay = 0;

        // Schedule each play with a random overlap interval
        for (let i = 0; i < times; i++) {
            if (i === 0) {
                // First play starts immediately
                const playAudio = new Audio(src);
                playAudio.play();
            } else {
                // Each subsequent play uses a random overlap percentage
                const randomOverlap = Math.random() * (maxOverlapPct - minOverlapPct) + minOverlapPct;
                const interval = duration * randomOverlap;
                cumulativeDelay += interval;

                setTimeout(() => {
                    const playAudio = new Audio(src);
                    playAudio.play();
                }, cumulativeDelay);
            }
        }
    });
    // Trigger metadata load
    audio.load();
}

/**
 * Fisher-Yates shuffle — returns a new randomly-ordered copy of `array`.
 * Does NOT mutate the original.
 */
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ---- Level generation ----

/**
 * Check if two positions in a 3×7 grid are adjacent (horizontally, vertically, or diagonally).
 * Grid positions are 0-20, arranged as 3 columns × 7 rows.
 *
 * @param {number} pos1  First position index (0-20)
 * @param {number} pos2  Second position index (0-20)
 * @returns {boolean}    True if positions are adjacent
 */
function areAdjacent(pos1, pos2) {
    const GRID_COLS = 3;
    const row1 = Math.floor(pos1 / GRID_COLS);
    const col1 = pos1 % GRID_COLS;
    const row2 = Math.floor(pos2 / GRID_COLS);
    const col2 = pos2 % GRID_COLS;

    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);

    // Horizontal adjacency: same row, columns differ by 1
    const horizontallyAdjacent = rowDiff === 0 && colDiff === 1;
    // Vertical adjacency: same column, rows differ by 1
    const verticallyAdjacent = colDiff === 0 && rowDiff === 1;
    // Diagonal adjacency: both row and column differ by 1
    const diagonallyAdjacent = rowDiff === 1 && colDiff === 1;

    return horizontallyAdjacent || verticallyAdjacent || diagonallyAdjacent;
}

/**
 * Builds a randomized set of 21 sprite names for one level.
 * Ensures the two instances of the macguffin are never placed
 * adjacent to each other (horizontally or vertically).
 *
 * @returns {{ items: string[], macguffin: string }}
 *   - items:     21 sprite names in shuffled order (for grid placement)
 *   - macguffin:  the name of the one sprite that appears twice
 */
function generateLevel() {
    // Shuffle all 20 sprites and use all of them (we have exactly 20 total)
    const shuffled = shuffle(ALL_SPRITES);
    const chosen = shuffled;  // Use all sprites

    // Randomly pick one of the 20 to be the macguffin — the sprite
    // the player needs to find. It will appear twice in the grid.
    const macguffin = chosen[Math.floor(Math.random() * chosen.length)];

    // Combine the 20 unique sprites + one extra copy of the macguffin
    // (= 21 items total), then shuffle so the duplicates aren't
    // predictably placed.
    let items = shuffle([...chosen, macguffin]);

    // Find the two positions where the macguffin appears
    const macguffinIndices = [];
    items.forEach((sprite, index) => {
        if (sprite === macguffin) {
            macguffinIndices.push(index);
        }
    });

    // If the two macguffins are adjacent, swap one with a non-adjacent position
    if (areAdjacent(macguffinIndices[0], macguffinIndices[1])) {
        // Find all positions that are NOT adjacent to the first macguffin
        const validSwapPositions = [];
        for (let i = 0; i < items.length; i++) {
            if (i !== macguffinIndices[0] && 
                i !== macguffinIndices[1] && 
                !areAdjacent(macguffinIndices[0], i)) {
                validSwapPositions.push(i);
            }
        }

        // If we found valid positions, swap the second macguffin with a random valid one
        if (validSwapPositions.length > 0) {
            const swapIndex = validSwapPositions[Math.floor(Math.random() * validSwapPositions.length)];
            [items[macguffinIndices[1]], items[swapIndex]] = [items[swapIndex], items[macguffinIndices[1]]];
        }
    }

    return { items, macguffin };
}

// ---- Level lifecycle ----

/**
 * Shows a random-colored liquid overlay that fills the screen, then drains
 * downward to reveal the game underneath. Used when transitioning from
 * the title screen to the first level. The drain animation duration matches
 * the length of the Juicebox Straw.mp3 audio file.
 */
function showLiquidDrain() {
    // Generate a random vibrant juice color (hue 0-360, high saturation, medium lightness)
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);  // 70-100%
    const lightness = 40 + Math.floor(Math.random() * 20);   // 40-60%
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    liquidOverlay.style.backgroundColor = color;
    liquidOverlay.classList.remove('hidden', 'draining');  // Reset state

    // Load the audio file to get its duration, then sync the animation
    const audio = new Audio('audio/Juicebox Straw.mp3');
    audio.addEventListener('loadedmetadata', () => {
        const durationMs = audio.duration * 1000;  // Convert to milliseconds
        const durationSec = audio.duration;  // Keep in seconds for CSS

        // Set the CSS animation duration to match the audio length
        // The keyframe animation has three segments matching the audio timing
        liquidOverlay.style.animationDuration = `${durationSec}s`;

        // Trigger the drain animation after a tiny delay to ensure the browser
        // has painted the full liquid state first
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                liquidOverlay.classList.add('draining');

                // Remove the overlay completely after the animation finishes
                setTimeout(() => {
                    liquidOverlay.classList.add('hidden');
                }, durationMs);
            });
        });
    });
    audio.load();  // Trigger metadata load
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

    // Wait for the CSS fade to finish, then build a brand new level.
    // The +100ms buffer ensures the transition is fully complete
    // before we tear down the DOM.
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
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            titleScreen.classList.add('ready');

            titleScreen.addEventListener('click', () => {
                titleScreen.classList.add('hidden');

                // Play the straw sound and show the liquid drain effect
                playOneshot('audio/Juicebox Straw.mp3');
                showLiquidDrain();

                // Start the level after a brief delay so the liquid starts filling
                setTimeout(() => {
                    startLevel();
                }, 50);
            }, { once: true });  // Only fire once — the title screen doesn't come back
        });
    });
});
