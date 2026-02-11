/*
 * ============================================================
 *  JUICE BOX — Peach Party
 * ============================================================
 *  Mode: All sprites are apple-red, tangerine, or mango (random, duplicates allowed).
 *  There is always at least one peach. Click/tap each peach to make it disappear.
 *  When all peaches are gone, the level is won. Plays the banana split sound when
 *  picking a peach; uses shared LAST_SPLIT_SOUND_REF with Go Bananas to avoid
 *  repeating the same sound twice in a row across modes.
 * ============================================================
 */

(function () {
    const MAX_CELLS = GRID_COLUMNS * GRID_ROWS;

    const FILLER_SPRITES = ['apple-red', 'tangerine', 'mango'];
    const TARGET = 'peach';

/**
 * Builds a random set of sprite names for one level. Each cell gets a random
 * filler sprite (apple-red, tangerine, mango); duplicates are allowed.
 * Ensures at least one peach; half the time adds another.
 *
 * @returns {{ items: string[] }}
 */
function generateLevelForTheModeCalledPeachParty() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
    const items = [];

    for (let i = 0; i < totalCells; i++) {
        items.push(
            FILLER_SPRITES[
                Math.floor(Math.random() * FILLER_SPRITES.length)
            ]
        );
    }

    if (!items.some((s) => s === TARGET)) {
        items[Math.floor(Math.random() * items.length)] = TARGET;
    }

    // Half the time, replace one random non-peach with a peach (unless all are peaches)
    if (Math.random() < 0.5) {
        const nonPeachIndices = items
            .map((s, i) => (s === TARGET ? -1 : i))
            .filter((i) => i >= 0);
        if (nonPeachIndices.length > 0) {
            const idx = nonPeachIndices[Math.floor(Math.random() * nonPeachIndices.length)];
            items[idx] = TARGET;
        }
    }

    return { items };
}

// Same sounds as Go Bananas; uses shared LAST_SPLIT_SOUND_REF to avoid repeats across modes.
const BANANA_SPLIT_SOUNDS = [
    'audio/Banana Split (1).mp3',
    'audio/Banana Split (2).mp3',
    'audio/Banana Split (3).mp3'
];

// Extra ms after the last peach fades, before the drain/next-level transition.
const POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS = 200;

const MODES = window.MODES || {};
MODES['peach-party'] = {
    /**
     * @param {HTMLElement} gridEl The #grid element.
     * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }. Spread into buildGrid.
     */
    start(gridEl, opts) {
        const { items } = generateLevelForTheModeCalledPeachParty();

        // Called when a cell is clicked. Returns true only when the last peach is picked.
        const checkWin = (cell) => {
            if (cell.dataset.sprite !== TARGET) return false;
            playRandomExcludingLast(BANANA_SPLIT_SOUNDS, LAST_SPLIT_SOUND_REF);
            cell.classList.add('removed');

            const remaining = gridEl.querySelectorAll('.cell[data-sprite="' + TARGET + '"]:not(.removed)');
            return remaining.length === 0;
        };

        // Wraps opts.onWin (app.js winLevel) so we play the success jingle and wait for the last
        // peach to finish fading before starting the drain/next level. The real onWin runs after
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
