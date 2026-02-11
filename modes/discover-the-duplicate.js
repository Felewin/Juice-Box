/*
 * ============================================================
 *  JUICE BOX — Discover the Duplicate
 * ============================================================
 *  Mode: one sprite appears twice in the grid; the player finds and
 *  clicks the duplicate (macguffin) to win.
 *
 *  HOW TO ADD A NEW MODE (for future programmers):
 *  1. Create a new file in modes/ (e.g. modes/mynewmode.js).
 *  2. Add your mode to window.MODES:
 *       const MODES = window.MODES || {};
 *       MODES.mynewmode = {
 *         start(gridEl, opts) {
 *           // opts contains: onWin, shouldIgnoreInput (from app.js)
 *           // 1. Get level data (from generateLevel, or your own generator)
 *           // 2. Define checkWin(cell) => boolean — your win condition
 *           // 3. Optionally play sounds
 *           // 4. Call buildGrid(gridEl, items, { ...opts, checkWin })
 *         }
 *       };
 *       window.MODES = MODES;
 *  3. Add a mode button in index.html: <button class="mode-btn" data-mode="mynewmode">My New Mode</button>
 *  4. Add <script src="modes/mynewmode.js"></script> before app.js in index.html.
 *
 *  Win conditions vary by mode: some check cell.dataset.sprite, others might check
 *  order, pairs, or custom data attributes. buildGrid only needs checkWin and onWin.
 * ============================================================
 */

const MODES = window.MODES || {};
MODES['discover-the-duplicate'] = {
    /**
     * @param {HTMLElement} gridEl The #grid element.
     * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }. Spread into buildGrid.
     */
    start(gridEl, opts) {
        const { items, macguffin } = generateLevel();
        const checkWin = (cell) => cell.dataset.sprite === macguffin;
        playOverlapping('audio/Scatter Plops.mp3', 3, 0.25, 0.35);
        buildGrid(gridEl, items, { ...opts, checkWin });
    }
};
window.MODES = MODES;
