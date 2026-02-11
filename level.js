/*
 * ============================================================
 *  JUICE BOX — Sprite Catalog & Grid Utilities
 * ============================================================
 *  Shared sprite list, path helper, and generic grid utilities.
 *  Level generation logic (how to fill the grid) lives in each mode.
 *
 *  MODE CONTRACT: Each mode must call computeGridDimensions(maxCells) with its
 *  mode-specific max (derived from how many sprite instances it uses). This
 *  ensures every mode validates its dimensions against its own limits.
 * ============================================================
 */

// Every filename in the sprites/ folder (without the .png extension).
// There are 20 total.
const ALL_SPRITES = [
    'apple-green', 'apple-red', 'avocado', 'banana', 'carrot',
    'cherries', 'coconut', 'cucumber', 'grapes', 'greens',
    'kiwi', 'lemon', 'mango', 'melon', 'peach',
    'pear', 'pineapple', 'strawberry', 'tangerine',
    'watermelon'
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
const GRID_ROWS = 7;

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
 * Computes grid dimensions for a mode and exposes them for app.js. Each mode
 * must call this with its mode-specific maxCells when it loads. The reduction
 * is generic; the limit is mode-specific.
 *
 * @param {number} maxCells  Maximum cells this mode can use (mode-specific)
 * @returns {{ actualColumns: number, actualRows: number }}
 */
function computeGridDimensions(maxCells) {
    const { actualColumns, actualRows } = reduceDimensions(GRID_COLUMNS, GRID_ROWS, maxCells);
    window.ACTUAL_GRID_COLUMNS = actualColumns;
    window.ACTUAL_GRID_ROWS = actualRows;
    return { actualColumns, actualRows };
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
