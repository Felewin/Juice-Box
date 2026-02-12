/*
 * ============================================================
 *  JUICE BOX — Perfect Pearody
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
    const TARGET = 'pear';

/**
 * Builds a random set of sprite names for one level. Each cell gets a random
 * filler sprite; duplicates are allowed. Exactly two pears are placed.
 *
 * @returns {{ items: string[] }}
 */
function generateLevelForTheModeCalledPerfectPearody() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
    const items = [];

    for (let i = 0; i < totalCells; i++) {
        items.push(
            FILLER_SPRITES[
                Math.floor(Math.random() * FILLER_SPRITES.length)
            ]
        );
    }

    // Place exactly two pears in random positions
    const idx1 = Math.floor(Math.random() * items.length);
    items[idx1] = TARGET;
    let idx2;
    do {
        idx2 = Math.floor(Math.random() * items.length);
    } while (idx2 === idx1);
    items[idx2] = TARGET;

    return { items };
}

// Extra ms after the last pear fades, before the drain/next-level transition.
const POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS = 200;

const MODES = window.MODES || {};
MODES['perfect-pearody'] = {
    /**
     * @param {HTMLElement} gridEl The #grid element.
     * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }. Spread into buildGrid.
     */
    start(gridEl, opts) {
        const { items } = generateLevelForTheModeCalledPerfectPearody();

        // Called when a cell is clicked. Returns true only when the last pear is picked.
        const checkWin = (cell) => {
            if (cell.dataset.sprite !== TARGET) return false;
            playSplitSound();
            cell.classList.add('removed');

            const remaining = gridEl.querySelectorAll('.cell[data-sprite="' + TARGET + '"]:not(.removed)');
            return remaining.length === 0 ? true : undefined;
        };

        // Wraps opts.onWin (app.js winLevel) so we play the success jingle and wait for the last
        // pear to finish fading before starting the drain/next level. The real onWin runs after
        // FADE_MS + POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS.
        const wrappedOnWin = (result) => {
            playOneshot('audio/Success Jingle Plucking.mp3');
            setTimeout(() => opts.onWin(result), FADE_MS + POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS);
        };

        startModeLevel(gridEl, { ...opts, onWin: wrappedOnWin }, MAX_CELLS, { items }, checkWin);
    }
};
    window.MODES = MODES;
})();
