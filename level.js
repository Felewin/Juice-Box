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
const ALL_SPRITES = [
    'apple-gold', 'apple-green', 'apple-red', 'avocado', 'banana', 'beet', 'blueberries',
    'carrot', 'cherries', 'coconut', 'cucumber', 'ginger', 'grapes', 'greens',
    'kiwi', 'leaves-falling', 'lemon', 'lime', 'mango', 'melon', 'peach',
    'pear-gold', 'pear-green', 'pineapple', 'strawberry', 'tangerine', 'watermelon'
];

// Build the full image path for a sprite name.
// Single source of truth so the path pattern isn't repeated.
const spriteSrc = (name) => `sprites/${name}.png`;

// ---- Level generation helpers ----

/**
 * Returns an array of `count` sprite names, each chosen at random from `sourceSprites`.
 * Duplicates are allowed.
 *
 * @param {number} count Number of cells to fill.
 * @param {string[]} sourceSprites Sprite names to choose from (e.g. FILLER_SPRITES or ALL_SPRITES).
 * @returns {string[]}
 */
function fillWithRandom(count, sourceSprites) {
    const items = [];
    for (let i = 0; i < count; i++) {
        items.push(sourceSprites[Math.floor(Math.random() * sourceSprites.length)]);
    }
    return items;
}

/**
 * Adds extra targets to an items array via repeated 50% chances.
 * Items must already have at least one target. Each run has 50% chance to
 * replace one random non-target cell with the target (0–extraRuns extra).
 *
 * @param {string[]} items Sprite names in display order (from level generator).
 * @param {string} target Sprite name to add.
 * @param {number} [extraRuns=3] Number of 50% chances.
 */
function addExtraTargetsByChance(items, target, extraRuns = 3) {
    for (let i = 0; i < extraRuns; i++) {
        if (Math.random() < 0.5) {
            const nonTargetIndices = items
                .map((s, idx) => (s === target ? -1 : idx))
                .filter((idx) => idx >= 0);
            if (nonTargetIndices.length > 0) {
                const idx = nonTargetIndices[Math.floor(Math.random() * nonTargetIndices.length)];
                items[idx] = target;
            }
        }
    }
}

/**
 * Ensures at least one instance of the target sprite in the items array.
 * If none exist, replaces a random cell with the target. Mutates items in place.
 * Use before addExtraTargetsByChance so the mode has the required minimum.
 *
 * @param {string[]} items Sprite names in display order (from level generator).
 * @param {string} target Sprite name that must appear at least once.
 */
function ensureTargetPresent(items, target) {
    if (!items.some((s) => s === target)) {
        items[Math.floor(Math.random() * items.length)] = target;
    }
}

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

// Desired grid dimensions. reduceDimensions() may shrink them when a mode's maxCells
// is lower (called via computeGridDimensions). SINGLE SOURCE: change these two; all
// grid layout, comments, and mode logic follow.
const GRID_COLUMNS = 4;
const GRID_ROWS = 6;

document.documentElement.style.setProperty('--grid-columns', GRID_COLUMNS);
document.documentElement.style.setProperty('--grid-rows', GRID_ROWS);

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
 * Recalculates sprite cell size from viewport. Called on load and resize.
 * Uses ACTUAL_GRID_COLUMNS/ROWS. Each mode sets these when it loads or when it starts.
 */
function updateCellSize() {
    const widthBasedSize = window.innerWidth / (ACTUAL_GRID_COLUMNS + 2);
    const heightBasedSize = window.innerHeight / (ACTUAL_GRID_ROWS + 2);
    const cellSize = Math.min(widthBasedSize, heightBasedSize);
    document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
}

/**
 * Returns the current cell size in pixels (parsed from --cell-size).
 * Used by flying-sprites and any other code that needs the sprite dimensions.
 */
function getCellSize() {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--cell-size').trim();
    return val ? parseFloat(val) || 60 : 60;
}

/**
 * Shared checkWin logic for "click-to-remove" modes (Go Bananas, Peach Party, Perfect Pearing).
 * Returns false if wrong sprite, undefined if correct but more targets remain, true if last target.
 *
 * @param {HTMLElement} gridEl The grid container.
 * @param {HTMLElement} cell The clicked cell.
 * @param {string|string[]} target Sprite name(s) to collect. Use array for multiple (e.g. Pearody: ['pear-green', 'pear-gold']).
 * @returns {false|undefined|true}
 */
function checkWinClickToRemove(gridEl, cell, target) {
    const targets = Array.isArray(target) ? target : [target];
    if (!targets.includes(cell.dataset.sprite)) return false;
    playSplitSound();
    cell.classList.add('removed');
    const remaining = Array.from(gridEl.querySelectorAll('.cell:not(.removed)')).filter((c) =>
        targets.includes(c.dataset.sprite)
    );
    return remaining.length === 0 ? true : undefined;
}

/**
 * Wraps opts.onWin for click-to-remove modes. Plays the success jingle immediately,
 * then calls the real onWin after FADE_MS + postFadeMs so the last target has time
 * to finish fading before the drain/next-level transition.
 *
 * @param {Object} opts From app.js: { onWin, shouldIgnoreInput }
 * @param {number} postFadeMs Extra ms after the last target fades, before starting drain.
 * @returns {function} Wrapped onWin callback.
 */
function wrapOnWinWithJingleAndDelay(opts, postFadeMs) {
    return (result) => {
        playOneshot('audio/Success Jingle Plucking.mp3');
        setTimeout(() => opts.onWin(result), FADE_MS + postFadeMs);
    };
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
