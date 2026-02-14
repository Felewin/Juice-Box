/*
 * ============================================================
 *  JUICE BOX — Pick A Pair
 * ============================================================
 *  Mode: one sprite appears twice in the grid; the player finds and
 *  clicks the duplicate (macguffin) to win.
 *
 *  Level generation flow:
 *  1. Pick sprites: all unique + one duplicate, or a subset if the grid is small.
 *  2. Shuffle the chosen sprites into display order.
 *  3. Avoid adjacent duplicates: retry shuffles or swap one macguffin with a
 *     non-adjacent cell; accept adjacent only when impossible (very small grids).
 *
 *  Cherries excluded so players don't assume from the mode icon that they must hunt for cherries.
 *  maxCells = SPRITES_FOR_PICK_A_PAIR.length + 1.
 * ============================================================
 */

(function () {
    // Exclude cherries so players don't assume from the mode icon that they must hunt for cherries.
    // Exclude leaves-falling (used in Subtle Tea with its own sound).
    const SPRITES_FOR_PICK_A_PAIR = ALL_SPRITES.filter((s) => s !== 'cherries' && s !== 'leaves-falling');

    // For this mode, the max cells is all unique sprites + 1 duplicate.
    const MAX_CELLS = SPRITES_FOR_PICK_A_PAIR.length + 1;

    /**
 * Builds a randomized set of sprite names for one level.
 *
 * Output length equals ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS (guaranteed <= MAX_CELLS).
 *
 * Sprite selection (Step 1):
 * - totalCells >= MAX_CELLS: Use all unique sprites + one duplicate of a random sprite.
 * - totalCells < MAX_CELLS: Use (totalCells - 1) unique sprites + one duplicate = totalCells items.
 *
 * Adjacency (Steps 2–3): The two macguffin instances should not be adjacent
 * (horizontal, vertical, or diagonal). We shuffle, then: if adjacent, swap one
 * macguffin with a non-adjacent cell; if no valid swap exists, retry with a new
 * shuffle (up to 50 times). On very small grids where separation is impossible,
 * we accept adjacent as fallback.
 *
 * @returns {{ items: string[], macguffin: string }}
 *   - items:     Sprite names in display order (one sprite appears twice).
 *   - macguffin: The sprite name that appears twice.
 */
function generateLevelForTheModeCalledPickAPair() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;

    // This mode needs a duplicate, so at least 2 cells are required. With 1 cell,
    // (totalCells - 1) unique sprites = 0, which would break sprite selection.
    if (totalCells < 2) {
        throw new Error(`Pick A Pair requires at least 2 cells; got ${totalCells}. Check GRID_COLUMNS and GRID_ROWS in level.js.`);
    }

    // Sanity check: computeGridDimensions should cap the grid at MAX_CELLS.
    if (totalCells > MAX_CELLS) {
        console.error(`generateLevelForTheModeCalledPickAPair: totalCells (${totalCells}) exceeds MAX_CELLS (${MAX_CELLS}). This should never happen!`);
    }

    // --- Step 1: Pick which sprites fill the grid ---
    // chosen = the sprite names we'll place (one appears twice, others once each)
    let chosen;
    let macguffin;  // The sprite that appears twice

    if (totalCells >= MAX_CELLS) {
        // Full grid: use every sprite once, plus one duplicate of a random sprite
        chosen = shuffle(SPRITES_FOR_PICK_A_PAIR);
        macguffin = chosen[Math.floor(Math.random() * chosen.length)];
        chosen = [...chosen, macguffin];
    } else {
        // Smaller grid: use (totalCells - 1) unique sprites + 1 duplicate = totalCells items
        const numUniqueSpritesNeeded = totalCells - 1;
        const shuffledAll = shuffle(SPRITES_FOR_PICK_A_PAIR);
        chosen = shuffledAll.slice(0, numUniqueSpritesNeeded);
        macguffin = chosen[Math.floor(Math.random() * chosen.length)];
        chosen = [...chosen, macguffin];
    }

    // --- Step 2 & 3: Shuffle into display order, then avoid adjacent duplicates ---
    // We want the two macguffins separated (not horizontally, vertically, or diagonally
    // adjacent). Strategy: (a) shuffle; (b) if adjacent, try swapping one macguffin
    // with a cell that isn't adjacent to the other; (c) if no valid swap exists,
    // retry with a new shuffle—a different random arrangement may place them
    // non-adjacent or allow a swap; (d) after max attempts, accept adjacent
    // (fallback for grids where separation is impossible).
    let items = shuffle(chosen);
    let macguffinIndices = [];
    const cols = ACTUAL_GRID_COLUMNS;
    const maxAttempts = 50;

    // Helper: find the two grid indices where the macguffin appears
    const collectMacguffinIndices = () => {
        macguffinIndices = [];
        items.forEach((sprite, index) => {
            if (sprite === macguffin) macguffinIndices.push(index);
        });
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        collectMacguffinIndices();

        if (!areAdjacent(macguffinIndices[0], macguffinIndices[1], cols)) break;

        // Find positions we can swap the second macguffin into: must be a non-macguffin
        // cell that is not adjacent to the first macguffin (so after swap, the two
        // macguffins remain separated).
        const validSwapPositions = [];
        for (let i = 0; i < items.length; i++) {
            if (i !== macguffinIndices[0] && i !== macguffinIndices[1] &&
                !areAdjacent(macguffinIndices[0], i, cols)) {
                validSwapPositions.push(i);
            }
        }
        if (validSwapPositions.length > 0) {
            const swapIndex = validSwapPositions[Math.floor(Math.random() * validSwapPositions.length)];
            [items[macguffinIndices[1]], items[swapIndex]] = [items[swapIndex], items[macguffinIndices[1]]];
            break;
        }
        if (attempt < maxAttempts - 1) items = shuffle(chosen);
    }

    // --- Final sanity checks ---
    // Verify item count matches grid size and macguffin appears exactly twice
    if (items.length !== totalCells) {
        console.warn(`generateLevelForTheModeCalledPickAPair: Expected ${totalCells} items but got ${items.length}. This may indicate a logic error.`);
    }
    const finalMacguffinCount = items.filter(s => s === macguffin).length;
    if (finalMacguffinCount !== 2) {
        console.warn(`generateLevelForTheModeCalledPickAPair: macguffin should appear twice but appears ${finalMacguffinCount} times. This may indicate a logic error.`);
    }

    return { items, macguffin };
}

// Extra ms after the macguffins finish fading, before the drain/next-level transition.
const POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS = 100;

const MODES = window.MODES || {};
MODES['pick-a-pair'] = {
    /**
     * @param {HTMLElement} gridEl The #grid element.
     * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }. Spread into buildGrid.
     */
    start(gridEl, opts) {
        const { items, macguffin } = generateLevelForTheModeCalledPickAPair();

        // Clicking either macguffin wins; macguffins fade later than the rest.
        const checkWin = (cell) => {
            if (cell.dataset.sprite !== macguffin) return false;
            (macguffin === 'leaves-falling' ? playRustlingLeavesSound : playSplitSound)();
            playOneshot('audio/Success Jingle Plucking.mp3');
            return { macguffin, postClickedSpriteFadingPreTransitioningFadeMs: POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS };
        };
        startModeLevel(gridEl, opts, MAX_CELLS, { items }, checkWin);
    }
};
    window.MODES = MODES;
})();
