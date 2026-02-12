/*
 * ============================================================
 *  JUICE BOX — Perfect Pearing
 * ============================================================
 *  Mode: All sprites are apple-green, apple-gold, lime, lemon, or melon
 *  (random, duplicates allowed). Exactly two pears appear. Click/tap each
 *  pear to make it disappear. When both pears are gone, the level is won.
 *  Plays the split sound when picking a pear; uses shared playSplitSound() to
 *  avoid repeating the same sound twice in a row across modes.
 *
 *  For this mode, maxCells equals the full grid (GRID_COLUMNS × GRID_ROWS).
 * ============================================================
 */

(function () {
    const MAX_CELLS = GRID_COLUMNS * GRID_ROWS;

    const FILLER_SPRITES = ['apple-green', 'apple-gold', 'lime', 'lemon', 'melon'];
    const PEAR_SPRITES = ['pear-green', 'pear-gold'];

/**
 * Builds a random set of sprite names for one level. Each cell gets a random
 * filler sprite; duplicates are allowed. Exactly two pears are placed, each
 * randomly pear-green or pear-gold (so we may have both green, both gold, or one of each).
 *
 * @returns {{ items: string[] }}
 */
function generateLevelForTheModeCalledPerfectPearing() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
    const items = fillWithRandom(totalCells, FILLER_SPRITES);

    // Place exactly two pears in random positions; each is randomly green or gold
    const idx1 = Math.floor(Math.random() * items.length);
    items[idx1] = PEAR_SPRITES[Math.floor(Math.random() * PEAR_SPRITES.length)];
    let idx2;
    do {
        idx2 = Math.floor(Math.random() * items.length);
    } while (idx2 === idx1);
    items[idx2] = PEAR_SPRITES[Math.floor(Math.random() * PEAR_SPRITES.length)];

    return { items };
}

// Extra ms after the last pear fades, before the drain/next-level transition.
const POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS = 200;

const MODES = window.MODES || {};
MODES['perfect-pearing'] = {
    /**
     * @param {HTMLElement} gridEl The #grid element.
     * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }. Spread into buildGrid.
     */
    start(gridEl, opts) {
        const { items } = generateLevelForTheModeCalledPerfectPearing();

        const checkWin = (cell) => checkWinClickToRemove(gridEl, cell, PEAR_SPRITES);

        startModeLevel(gridEl, {
            ...opts,
            onWin: wrapOnWinWithJingleAndDelay(opts, POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS)
        }, MAX_CELLS, { items }, checkWin);
    }
};
    window.MODES = MODES;
})();
