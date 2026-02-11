/*
 * ============================================================
 *  JUICE BOX — Sprite Catalog & Grid Utilities
 * ============================================================
 *  Shared sprite list, path helper, and generic grid utilities.
 *  Level generation logic (how to fill the grid) lives in each mode.
 *
 *  MODE CONTRACT: Each mode must be wrapped in an IIFE so MAX_CELLS is
 *  file-scoped. In start(), call startModeLevel(gridEl, opts, MAX_CELLS, { items }, checkWin).
 *  Dimensions are set when switching to that mode, not at script load.
 * ============================================================
 */

// Every filename in the sprites/ folder (without the .png extension).
// There are 25 total.
const ALL_SPRITES = [
    'apple-green', 'apple-red', 'avocado', 'banana', 'beet', 'blueberries',
    'carrot', 'cherries', 'coconut', 'cucumber', 'ginger', 'grapes', 'greens',
    'kiwi', 'lemon', 'lime', 'mango', 'melon', 'olives', 'peach',
    'pear', 'pineapple', 'strawberry', 'tangerine', 'watermelon'
];

// Build the full image path for a sprite name.
// Single source of truth so the path pattern isn't repeated.
const spriteSrc = (name) => `sprites/${name}.png`;

// ---- Grid dimensions ----
//
// Generic defaults for all modes. The desired grid size is the same for every
// mode; the mode-specific part is maxCells (how many cells the mode can use,
// based on its sprite rules). Automatic reduction kicks in if desiredCols ×
// desiredRows would exceed maxCells.
//
// REDUCTION STRATEGY (mode-generic):
// If the product exceeds maxCells, we reduce the larger dimension first (to
// maintain a more square-like aspect ratio), then reduce further if needed.

// Desired grid dimensions (may be reduced if they would exceed a mode's maxCells)
const GRID_COLUMNS = 3;
const GRID_ROWS = 8;

/**
 * Reduces desired dimensions to fit within maxCells. Generic logic used by any
 * mode. If desiredCols × desiredRows exceeds maxCells, the larger dimension is
 * reduced repeatedly until the product fits.
 *
 * @param {number} desiredCols  Desired columns
 * @param {number} desiredRows  Desired rows
 * @param {number} maxCells     Maximum cells allowed (mode-specific)
 * @returns {{ actualColumns: number, actualRows: number }}
 */
function reduceDimensions(desiredCols, desiredRows, maxCells) {
    let actualColumns = desiredCols;
    let actualRows = desiredRows;
    let totalCells = actualColumns * actualRows;

    if (totalCells > maxCells) {
        // Reduce the larger dimension first to maintain aspect ratio
        // Keep reducing until we're within the limit
        while (totalCells > maxCells) {
            if (actualColumns >= actualRows) {
                actualColumns--;
            } else {
                actualRows--;
            }
            totalCells = actualColumns * actualRows;
        }
    }

    // Safety check (should always pass after reduction)
    if (actualColumns * actualRows > maxCells) {
        console.warn(`reduceDimensions: result (${actualColumns}×${actualRows}) exceeds maxCells (${maxCells}). This should never happen!`);
    }

    return { actualColumns, actualRows };
}

/**
 * Computes grid dimensions for a mode and exposes them. Each mode must call
 * this at the start of its start() method when the user switches to that mode.
 *
 * @param {number} maxCells  Maximum cells this mode can use (mode-specific)
 * @returns {{ actualColumns: number, actualRows: number }}
 */
function computeGridDimensions(maxCells) {
    const { actualColumns, actualRows } = reduceDimensions(GRID_COLUMNS, GRID_ROWS, maxCells);
    window.ACTUAL_GRID_COLUMNS = actualColumns;
    window.ACTUAL_GRID_ROWS = actualRows;
    document.documentElement.style.setProperty('--grid-columns', actualColumns);
    document.documentElement.style.setProperty('--grid-rows', actualRows);
    return { actualColumns, actualRows };
}

/**
 * Runs the common mode setup: dimensions, cell size, audio, grid build.
 * Each mode calls this with its MAX_CELLS, level data (with .items), and checkWin.
 *
 * @param {HTMLElement} gridEl
 * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }
 * @param {number} maxCells
 * @param {{ items: string[] }} levelData From the mode's generateLevel()
 * @param {(cell: HTMLElement) => boolean} checkWin
 */
function startModeLevel(gridEl, opts, maxCells, levelData, checkWin) {
    computeGridDimensions(maxCells);
    updateCellSize();
    playOverlapping('audio/Scatter Plops.mp3', 3, 0.25, 0.35);
    buildGrid(gridEl, levelData.items, { ...opts, checkWin });
}

/**
 * Sets default grid dimensions for app init (before any mode is selected).
 * Uses full desired grid as default.
 */
function initDefaultGridDimensions() {
    computeGridDimensions(GRID_COLUMNS * GRID_ROWS);
}

/**
 * Check if two positions in the grid are adjacent (horizontally, vertically, or diagonally).
 * Grid positions are 0 to (numColumns × numRows - 1), arranged as numColumns columns × numRows rows.
 *
 * @param {number} pos1       First position index
 * @param {number} pos2       Second position index
 * @param {number} numColumns Number of columns in the grid (from ACTUAL_GRID_COLUMNS)
 * @returns {boolean}         True if positions are adjacent
 */
function areAdjacent(pos1, pos2, numColumns) {
    const row1 = Math.floor(pos1 / numColumns);
    const col1 = pos1 % numColumns;
    const row2 = Math.floor(pos2 / numColumns);
    const col2 = pos2 % numColumns;

    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);

    // Horizontal adjacency: same row, columns differ by 1
    const horizontallyAdjacent = rowDiff === 0 && colDiff === 1;
    // Vertical adjacency: same column, rows differ by 1
    const verticallyAdjacent = colDiff === 0 && rowDiff === 1;
    // Diagonal adjacency: both row and column differ by 1
    const diagonallyAdjacent = rowDiff === 1 && colDiff === 1;

    return horizontallyAdjacent || verticallyAdjacent || diagonallyAdjacent;
}
