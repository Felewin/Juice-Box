/*
 * ============================================================
 *  JUICE BOX — Discover the Duplicate
 * ============================================================
 *  Mode: one sprite appears twice in the grid; the player finds and
 *  clicks the duplicate (macguffin) to win.
 *
 *  Level generation: one of each sprite + one duplicate. The grid
 *  dimensions use the reduction in level.js; for this mode, maxCells
 *  is 20 unique + 1 duplicate = 21.
 * ============================================================
 */

(function () {
    // For this mode, the max cells is 20 unique sprites + 1 duplicate = 21.
    const MAX_CELLS = ALL_SPRITES.length + 1;

    /**
 * Builds a randomized set of sprite names for one level.
 * The number of items equals ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS,
 * which is guaranteed to be <= MAX_CELLS (21 for this mode).
 *
 * SPRITE SELECTION STRATEGY:
 * - If totalCells >= 21: Use all 20 unique sprites + 1 duplicate = 21 items
 * - If totalCells < 21: Use a random subset of sprites (enough to fill the cells)
 *   In this case, we need (totalCells - 1) unique sprites + 1 duplicate = totalCells items
 *   For example, if totalCells = 10, we pick 9 random unique sprites + 1 duplicate = 10 items
 *
 * Ensures the two instances of the macguffin are never placed
 * adjacent to each other (horizontally, vertically, or diagonally).
 *
 * @returns {{ items: string[], macguffin: string }}
 *   - items:     Array of sprite names in shuffled order (for grid placement)
 *   - macguffin:  the name of the one sprite that appears twice
 */
function generateLevelForTheModeCalledDiscoverTheDuplicate() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;

    // Safety check (should never happen after computeGridDimensions)
    if (totalCells > MAX_CELLS) {
        console.error(`generateLevelForTheModeCalledDiscoverTheDuplicate: totalCells (${totalCells}) exceeds MAX_CELLS (${MAX_CELLS}). This should never happen!`);
    }

    let chosen;   // The subset of sprites we'll use for this level
    let macguffin;  // The sprite that will appear twice

    if (totalCells >= MAX_CELLS) {
        // We have enough cells for all 20 unique sprites + 1 duplicate
        chosen = shuffle(ALL_SPRITES);
        macguffin = chosen[Math.floor(Math.random() * chosen.length)];
        chosen = [...chosen, macguffin];
    } else {
        // Use a random subset: (totalCells - 1) unique + 1 duplicate
        const numUniqueSpritesNeeded = totalCells - 1;
        const shuffledAll = shuffle(ALL_SPRITES);
        chosen = shuffledAll.slice(0, numUniqueSpritesNeeded);
        macguffin = chosen[Math.floor(Math.random() * chosen.length)];
        chosen = [...chosen, macguffin];
    }

    // Shuffle the final set so the macguffin duplicate isn't predictably placed
    let items = shuffle(chosen);

    // Final verification
    if (items.length !== totalCells) {
        console.warn(`generateLevelForTheModeCalledDiscoverTheDuplicate: Expected ${totalCells} items but got ${items.length}. This may indicate a logic error.`);
    }
    const finalMacguffinCount = items.filter(s => s === macguffin).length;
    if (finalMacguffinCount !== 2) {
        console.warn(`generateLevelForTheModeCalledDiscoverTheDuplicate: macguffin should appear twice but appears ${finalMacguffinCount} times. This may indicate a logic error.`);
    }

    // Find the two positions where the macguffin appears
    const macguffinIndices = [];
    items.forEach((sprite, index) => {
        if (sprite === macguffin) macguffinIndices.push(index);
    });

    // If the two macguffins are adjacent, swap one with a non-adjacent position
    if (areAdjacent(macguffinIndices[0], macguffinIndices[1], ACTUAL_GRID_COLUMNS)) {
        const validSwapPositions = [];
        for (let i = 0; i < items.length; i++) {
            if (i !== macguffinIndices[0] && i !== macguffinIndices[1] &&
                !areAdjacent(macguffinIndices[0], i, ACTUAL_GRID_COLUMNS)) {
                validSwapPositions.push(i);
            }
        }
        if (validSwapPositions.length > 0) {
            const swapIndex = validSwapPositions[Math.floor(Math.random() * validSwapPositions.length)];
            [items[macguffinIndices[1]], items[swapIndex]] = [items[swapIndex], items[macguffinIndices[1]]];
        }
    }

    return { items, macguffin };
}

const MODES = window.MODES || {};
MODES['discover-the-duplicate'] = {
    /**
     * @param {HTMLElement} gridEl The #grid element.
     * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }. Spread into buildGrid.
     */
    start(gridEl, opts) {
        const { items, macguffin } = generateLevelForTheModeCalledDiscoverTheDuplicate();
        const checkWin = (cell) => {
            if (cell.dataset.sprite !== macguffin) return false;
            cell.classList.add('removed');
            return true;
        };
        startModeLevel(gridEl, opts, MAX_CELLS, { items }, checkWin);
    }
};
    window.MODES = MODES;
})();
