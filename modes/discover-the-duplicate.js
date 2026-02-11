/*
 * ============================================================
 *  JUICE BOX — Discover the Duplicate
 * ============================================================
 *  Mode: one sprite appears twice in the grid; the player finds and
 *  clicks the duplicate (macguffin) to win.
 *
 *  Level generation: one of each sprite + one duplicate. Grid dimensions
 *  and generation logic are mode-specific (other modes will differ).
 *
 *  HOW TO ADD A NEW MODE (for future programmers):
 *  1. Create a new file in modes/ (e.g. modes/mynewmode.js).
 *  2. Add your mode to window.MODES:
 *       const MODES = window.MODES || {};
 *       MODES.mynewmode = {
 *         start(gridEl, opts) {
 *           // opts contains: onWin, shouldIgnoreInput (from app.js)
 *           // 1. Get level data (from your own generator)
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

const GRID_COLUMNS = 3;
const GRID_ROWS = 7;
const MAX_CELLS = ALL_SPRITES.length + 1;

let actualColumns = GRID_COLUMNS;
let actualRows = GRID_ROWS;
let totalCells = actualColumns * actualRows;

if (totalCells > MAX_CELLS) {
    while (totalCells > MAX_CELLS) {
        if (actualColumns >= actualRows) {
            actualColumns--;
        } else {
            actualRows--;
        }
        totalCells = actualColumns * actualRows;
    }
}

const ACTUAL_GRID_COLUMNS = actualColumns;
const ACTUAL_GRID_ROWS = actualRows;

window.ACTUAL_GRID_COLUMNS = ACTUAL_GRID_COLUMNS;
window.ACTUAL_GRID_ROWS = ACTUAL_GRID_ROWS;

function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function areAdjacent(pos1, pos2) {
    const row1 = Math.floor(pos1 / ACTUAL_GRID_COLUMNS);
    const col1 = pos1 % ACTUAL_GRID_COLUMNS;
    const row2 = Math.floor(pos2 / ACTUAL_GRID_COLUMNS);
    const col2 = pos2 % ACTUAL_GRID_COLUMNS;
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    const horizontallyAdjacent = rowDiff === 0 && colDiff === 1;
    const verticallyAdjacent = colDiff === 0 && rowDiff === 1;
    const diagonallyAdjacent = rowDiff === 1 && colDiff === 1;
    return horizontallyAdjacent || verticallyAdjacent || diagonallyAdjacent;
}

function generateDiscoverLevel() {
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
    let chosen;
    let macguffin;

    if (totalCells >= MAX_CELLS) {
        chosen = shuffle(ALL_SPRITES);
        macguffin = chosen[Math.floor(Math.random() * chosen.length)];
        chosen = [...chosen, macguffin];
    } else {
        const numUniqueSpritesNeeded = totalCells - 1;
        const shuffledAll = shuffle(ALL_SPRITES);
        chosen = shuffledAll.slice(0, numUniqueSpritesNeeded);
        macguffin = chosen[Math.floor(Math.random() * chosen.length)];
        chosen = [...chosen, macguffin];
    }

    let items = shuffle(chosen);

    const macguffinIndices = [];
    items.forEach((sprite, index) => {
        if (sprite === macguffin) macguffinIndices.push(index);
    });

    if (areAdjacent(macguffinIndices[0], macguffinIndices[1])) {
        const validSwapPositions = [];
        for (let i = 0; i < items.length; i++) {
            if (i !== macguffinIndices[0] && i !== macguffinIndices[1] &&
                !areAdjacent(macguffinIndices[0], i)) {
                validSwapPositions.push(i);
            }
        }
        if (validSwapPositions.length > 0) {
            const swapIndex = validSwapPositions[Math.floor(Math.random() * validSwapPositions.length)];
            [items[macguffinIndices[1]], items[swapIndex]] = [items[swapIndex], items[macguffinIndices[1]]];
        }
    }

    return { items, macguffin };
}

const MODES = window.MODES || {};
MODES['discover-the-duplicate'] = {
    start(gridEl, opts) {
        const { items, macguffin } = generateDiscoverLevel();
        const checkWin = (cell) => cell.dataset.sprite === macguffin;
        playOverlapping('audio/Scatter Plops.mp3', 3, 0.25, 0.35);
        buildGrid(gridEl, items, { ...opts, checkWin });
    }
};
window.MODES = MODES;
