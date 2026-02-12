/*
 * ============================================================
 *  JUICE BOX — Subtle Tea
 * ============================================================
 *  Mode with three submodes in sequence: leaves → teapot → teacup → repeat.
 *
 *  1. Leaves submode: find the leaves-falling among produce fillers.
 *     Fillers: greens, cherries, apple-green, lime, pineapple, strawberry,
 *     pear-green, watermelon, ginger, carrot, grapes, mango, peach, tangerine,
 *     melon, pear-gold, cucumber. Plays usual split sound.
 *
 *  2. Teapot submode: find the teapot among fruit fillers.
 *     Fillers: apple-red, peach, beet, mango, strawberry.
 *
 *  3. Teacup submode: find the teacup among drink/cup fillers.
 *     Fillers: coffee, cup-with-straw, glass-of-milk, leaves-falling (random).
 *     Always exactly 1 teapot as filler.
 *
 *  Always starts with leaves when entering the mode; cycles each level.
 *  Leaving and re-entering resets to leaves first.
 * ============================================================
 */

(function () {
    const LEAVES_MACGUFFIN = 'leaves-falling';
    const TEAPOT_MACGUFFIN = 'unjuicable/teapot';
    const TEACUP_MACGUFFIN = 'unjuicable/teacup';

    const LEAVES_FILLERS = ['greens', 'cherries', 'apple-green', 'lime', 'pineapple', 'strawberry', 'pear-green', 'watermelon', 'ginger', 'carrot', 'grapes', 'mango', 'peach', 'tangerine', 'melon', 'pear-gold', 'cucumber'];
    const TEAPOT_FILLERS = ['apple-red', 'peach', 'beet', 'mango', 'strawberry'];
    const TEACUP_FILLERS = ['unjuicable/coffee', 'unjuicable/cup-with-straw', 'unjuicable/glass-of-milk', 'leaves-falling'];

    const MAX_CELLS = GRID_COLUMNS * GRID_ROWS;

    // Ensure unjuicable sprites are preloaded.
    window.UNJUICABLE_SPRITES = [...new Set([
        ...(window.UNJUICABLE_SPRITES || []),
        TEAPOT_MACGUFFIN,
        TEACUP_MACGUFFIN,
        'unjuicable/coffee',
        'unjuicable/cup-with-straw',
        'unjuicable/glass-of-milk'
    ])];

    /**
     * Leaves submode: one leaves-falling (macguffin) in a random cell, rest filled with produce.
     *
     * @returns {{ items: string[], macguffin: string }}
     */
    function generateLeavesLevel() {
        const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
        const items = fillWithRandom(totalCells, LEAVES_FILLERS);
        const leavesIndex = Math.floor(Math.random() * totalCells);
        items[leavesIndex] = LEAVES_MACGUFFIN;
        return { items, macguffin: LEAVES_MACGUFFIN };
    }

    /**
     * Teapot submode: one teapot (macguffin) in a random cell, rest filled with fruit.
     *
     * @returns {{ items: string[], macguffin: string }}
     */
    function generateTeapotLevel() {
        const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
        const items = fillWithRandom(totalCells, TEAPOT_FILLERS);
        const teapotIndex = Math.floor(Math.random() * totalCells);
        items[teapotIndex] = TEAPOT_MACGUFFIN;
        return { items, macguffin: TEAPOT_MACGUFFIN };
    }

    /**
     * Teacup submode: one teacup (macguffin), always 1 teapot, rest filled with
     * random drink/cup fillers (coffee, cup-with-straw, glass-of-milk, leaves-falling).
     *
     * @returns {{ items: string[], macguffin: string }}
     */
    function generateTeacupLevel() {
        const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
        if (totalCells < 2) {
            throw new Error(`Subtle Tea teacup submode requires at least 2 cells; got ${totalCells}.`);
        }
        const items = fillWithRandom(totalCells - 2, TEACUP_FILLERS);
        items.push(TEACUP_MACGUFFIN);
        items.push(TEAPOT_MACGUFFIN);
        return { items: shuffle(items), macguffin: TEACUP_MACGUFFIN };
    }

    const POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS = 100;

    const SUBMODE_ORDER = ['leaves', 'teapot', 'teacup'];
    let lastSubmode = 'teacup'; // So first level uses leaves (next after teacup)

    function getNextSubmode() {
        const idx = SUBMODE_ORDER.indexOf(lastSubmode);
        return SUBMODE_ORDER[(idx + 1) % SUBMODE_ORDER.length];
    }

    const MODES = window.MODES || {};
    MODES['subtle-tea'] = {
        /**
         * @param {HTMLElement} gridEl The #grid element.
         * @param {Object} opts From app.js: { onWin, shouldIgnoreInput, isFirstLevelOfSession }.
         */
        start(gridEl, opts) {
            const isFirstLevel = opts.isFirstLevelOfSession === true;
            const submode = isFirstLevel ? 'leaves' : getNextSubmode();
            lastSubmode = submode;

            const { items, macguffin } = submode === 'leaves' ? generateLeavesLevel()
                : submode === 'teapot' ? generateTeapotLevel()
                : generateTeacupLevel();

            const checkWin = (cell) => {
                if (cell.dataset.sprite !== macguffin) return false;
                if (submode === 'leaves') playRustlingLeavesSound();
                else playOneshot(submode === 'teapot' ? 'audio/Tea Liquid Fillup.mp3' : 'audio/Teacup Slurping Sip.mp3');
                playOneshot('audio/Success Jingle Plucking.mp3');
                return { macguffin, postClickedSpriteFadingPreTransitioningFadeMs: POST_CLICKEDSPRITE_FADING_PRETRANSITIONING_FADE_MS };
            };
            startModeLevel(gridEl, opts, MAX_CELLS, { items }, checkWin);
        }
    };
    window.MODES = MODES;
})();
