/*
 * ============================================================
 *  JUICE BOX — Subtle Tea
 * ============================================================
 *  Mode: one teapot (macguffin) is hidden among filler sprites.
 *  Click the teapot to win.
 *
 *  Macguffin: teapot from sprites/unjuicable/
 *  Fillers: apple-red, peach, beet, mango, strawberry (random).
 * ============================================================
 */

(function () {
    const MACGUFFIN = 'unjuicable/teapot';
    const FILLER_SPRITES = ['apple-red', 'peach', 'beet', 'mango', 'strawberry'];

    const MAX_CELLS = GRID_COLUMNS * GRID_ROWS;

    // Ensure teapot is preloaded (merge with any existing unjuicable list).
    window.UNJUICABLE_SPRITES = [...new Set([...(window.UNJUICABLE_SPRITES || []), MACGUFFIN])];

    /**
     * Builds a level: one teapot in a random cell, rest filled with random filler sprites.
     *
     * @returns {{ items: string[], macguffin: string }}
     */
    function generateLevelForTheModeCalledSubtleTea() {
        const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
        const items = fillWithRandom(totalCells, FILLER_SPRITES);
        const teapotIndex = Math.floor(Math.random() * totalCells);
        items[teapotIndex] = MACGUFFIN;
        return { items, macguffin: MACGUFFIN };
    }

    const POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS = 100;

    const MODES = window.MODES || {};
    MODES['subtle-tea'] = {
        /**
         * @param {HTMLElement} gridEl The #grid element.
         * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }. Spread into buildGrid.
         */
        start(gridEl, opts) {
            const { items, macguffin } = generateLevelForTheModeCalledSubtleTea();

            const checkWin = (cell) => {
                if (cell.dataset.sprite !== macguffin) return false;
                playOneshot('audio/Tea Liquid Fillup.mp3');
                playOneshot('audio/Success Jingle Plucking.mp3');
                return { macguffin, postClickedSpriteFadingPreTransitioningFadeMs: POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS };
            };
            startModeLevel(gridEl, opts, MAX_CELLS, { items }, checkWin);
        }
    };
    window.MODES = MODES;
})();
