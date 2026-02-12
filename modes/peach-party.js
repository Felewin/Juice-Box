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
 *  Each level includes 1 of each unjuicable sprite as decoration.
 * ============================================================
 */

(function () {
    const MAX_CELLS = GRID_COLUMNS * GRID_ROWS;

    const FILLER_SPRITES = ['apple-red', 'tangerine', 'mango'];
    const TARGET = 'peach';

    // Unjuicable sprites from sprites/unjuicable/ — included in every level as decoration (exactly 1 of each).
    const UNJUICABLE_SPRITES = ['unjuicable/beach-with-umbrella', 'unjuicable/beachball', 'unjuicable/bikini', 'unjuicable/thong-sandal', 'unjuicable/tropical-drink', 'unjuicable/water-wave'];
    window.UNJUICABLE_SPRITES = UNJUICABLE_SPRITES;

/**
 * Builds a random set of sprite names for one level. Each cell gets a random
 * filler sprite (apple-red, tangerine, mango); duplicates are allowed.
 * Ensures at least one peach; up to 3 extra via 50% chance each.
 * Includes 1 of each unjuicable sprite in every level.
 *
 * @returns {{ items: string[] }}
 */
function generateLevelForTheModeCalledPeachParty() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
    const items = fillWithRandom(totalCells, FILLER_SPRITES);

    ensureTargetPresent(items, TARGET);
    addExtraTargetsByChance(items, TARGET);

    // Place 1 of each unjuicable sprite in random non-target cells.
    const nonTargetIndices = items
        .map((s, idx) => (s === TARGET ? -1 : idx))
        .filter((idx) => idx >= 0);
    const shuffled = nonTargetIndices.sort(() => Math.random() - 0.5);
    UNJUICABLE_SPRITES.forEach((sprite, i) => {
        if (shuffled[i] !== undefined) {
            items[shuffled[i]] = sprite;
        }
    });

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

        startModeLevel(gridEl, {
            ...opts,
            onWin: wrapOnWinWithJingleAndDelay(opts, POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS)
        }, MAX_CELLS, { items }, checkWin);
    }
};
    window.MODES = MODES;
})();
