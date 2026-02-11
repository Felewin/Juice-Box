/*
 * ============================================================
 *  JUICE BOX — Apple Of My Eye
 * ============================================================
 *  Mode: Find the single apple (red or green) in the grid.
 *  Each level, one apple type is chosen at random (apple-red or apple-green);
 *  exactly one instance of that apple appears. The rest of the cells are
 *  filled with random sprites (duplicates allowed).
 * ============================================================
 */

(function () {
    const MAX_CELLS = GRID_COLUMNS * GRID_ROWS;

    const APPLE_SPRITES = ['apple-red', 'apple-green'];
    const NON_APPLE_SPRITES = ALL_SPRITES.filter(
        (s) => s !== 'apple-red' && s !== 'apple-green'
    );

/**
 * Builds a random set of sprite names for one level.
 * Exactly one apple (red or green, chosen randomly) in a random position;
 * all other cells get random non-apple sprites (duplicates allowed).
 *
 * @returns {{ items: string[], apple: string }}
 */
function generateLevelForTheModeCalledAppleOfMyEye() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;

    const apple = APPLE_SPRITES[Math.floor(Math.random() * APPLE_SPRITES.length)];
    const items = [];

    for (let i = 0; i < totalCells; i++) {
        items.push(
            NON_APPLE_SPRITES[
                Math.floor(Math.random() * NON_APPLE_SPRITES.length)
            ]
        );
    }

    const appleIndex = Math.floor(Math.random() * items.length);
    items[appleIndex] = apple;

    return { items, apple };
}

const POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS = 100;

const MODES = window.MODES || {};
MODES['apple-of-my-eye'] = {
    /**
     * @param {HTMLElement} gridEl The #grid element.
     * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }. Spread into buildGrid.
     */
    start(gridEl, opts) {
        const { items, apple } = generateLevelForTheModeCalledAppleOfMyEye();

        const checkWin = (cell) => {
            if (cell.dataset.sprite !== apple) return false;
            playOneshot('audio/Success Jingle Plucking.mp3');
            return { macguffin: apple, postClickedSpriteFadingPreTransitioningFadeMs: POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS };
        };

        startModeLevel(gridEl, opts, MAX_CELLS, { items }, checkWin);
    }
};
    window.MODES = MODES;
})();
