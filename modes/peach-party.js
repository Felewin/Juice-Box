/*
 * ============================================================
 *  JUICE BOX — Peach Party
 * ============================================================
 *  Mode: All sprites are apple-red, tangerine, or mango (random, duplicates allowed).
 *  There is always at least one peach. Click/tap each peach to make it disappear.
 *  When all peaches are gone, the level is won. Plays the banana split sound when
 *  picking a peach; uses shared playSplitSound() to avoid repeating the same
 *  sound twice in a row across modes.
 *
 *  For this mode, maxCells equals the full grid (GRID_COLUMNS × GRID_ROWS).
 * ============================================================
 */

(function () {
    const MAX_CELLS = GRID_COLUMNS * GRID_ROWS;

    const FILLER_SPRITES = ['apple-red', 'tangerine', 'mango'];
    const TARGET = 'peach';

/**
 * Builds a random set of sprite names for one level. Each cell gets a random
 * filler sprite (apple-red, tangerine, mango); duplicates are allowed.
 * Ensures at least one peach; up to 3 extra via 50% chance each.
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

    // 50% chance for +1 peach, then another 50% for +1, then another 50% for +1 (0–3 extra)
    for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.5) {
            const nonPeachIndices = items
                .map((s, idx) => (s === TARGET ? -1 : idx))
                .filter((idx) => idx >= 0);
            if (nonPeachIndices.length > 0) {
                const idx = nonPeachIndices[Math.floor(Math.random() * nonPeachIndices.length)];
                items[idx] = TARGET;
            }
        }
    }

    return { items };
}

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

        const checkWin = (cell) => checkWinClickToRemove(gridEl, cell, TARGET);

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
