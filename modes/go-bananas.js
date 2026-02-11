/*
 * ============================================================
 *  JUICE BOX — Go Bananas
 * ============================================================
 *  Mode: all sprites are random (any number of duplicates). There is
 *  always at least one banana. Click/tap each banana to make it disappear.
 *  When all bananas are gone, the level is won.
 *
 *  For this mode, maxCells equals the full grid (GRID_COLUMNS × GRID_ROWS).
 * ============================================================
 */

(function () {
    const MAX_CELLS = GRID_COLUMNS * GRID_ROWS;

    /**
 * Builds a random set of sprite names for one level. Each cell gets a random
 * sprite; duplicates are allowed. Ensures at least one banana.
 *
 * @returns {{ items: string[] }}
 */
function generateLevelForTheModeCalledGoBananas() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
    const items = [];

    for (let i = 0; i < totalCells; i++) {
        items.push(ALL_SPRITES[Math.floor(Math.random() * ALL_SPRITES.length)]);
    }

    if (!items.some((s) => s === 'banana')) {
        items[Math.floor(Math.random() * items.length)] = 'banana';
    }

    // Half the time, replace one random non-banana with a banana (unless all are bananas)
    if (Math.random() < 0.5) {
        const nonBananaIndices = items
            .map((s, i) => (s === 'banana' ? -1 : i))
            .filter((i) => i >= 0);
        if (nonBananaIndices.length > 0) {
            const idx = nonBananaIndices[Math.floor(Math.random() * nonBananaIndices.length)];
            items[idx] = 'banana';
        }
    }

    return { items };
}

// One of these plays randomly when a banana is picked; playRandomExcludingLast avoids repeats.
// Uses shared LAST_SPLIT_SOUND_REF so we don't repeat even when switching to/from Peach Party.
const BANANA_SPLIT_SOUNDS = [
    'audio/Banana Split (1).mp3',
    'audio/Banana Split (2).mp3',
    'audio/Banana Split (3).mp3'
];

// Extra ms after the last banana fades, before the drain/next-level transition.
const POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS = 200;

const MODES = window.MODES || {};
MODES['go-bananas'] = {
    start(gridEl, opts) {
        const { items } = generateLevelForTheModeCalledGoBananas();

        // Called when a cell is clicked. Returns true only when the last banana is picked.
        const checkWin = (cell) => {
            if (cell.dataset.sprite !== 'banana') return false;
            playRandomExcludingLast(BANANA_SPLIT_SOUNDS, LAST_SPLIT_SOUND_REF);
            cell.classList.add('removed');

            const remaining = gridEl.querySelectorAll('.cell[data-sprite="banana"]:not(.removed)');
            return remaining.length === 0;
        };

        // Wraps opts.onWin (app.js winLevel) so we play the success jingle and wait for the last
        // banana to finish fading before starting the drain/next level. The real onWin runs after
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
