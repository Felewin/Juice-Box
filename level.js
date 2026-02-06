/*
 * ============================================================
 *  JUICE BOX — Level Generation
 * ============================================================
 *  Handles level generation, grid utilities, and sprite management.
 *  Ensures the macguffin (duplicate sprite) is never placed
 *  adjacent to itself in the grid.
 * ============================================================
 */

// ---- Sprite catalog ----
// Every filename in the sprites/ folder (without the .png extension).
// There are 20 total. Each level, we use all 20 and duplicate one randomly.
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
// SPRITE LIMITATION EXPLANATION:
// We have exactly 20 unique sprite PNGs available (see ALL_SPRITES array above).
// The maximum number of cells we can have is 21 (20 unique sprites + 1 duplicate).
// However, if the grid has fewer than 21 cells, we use a random subset of sprites:
//   - If totalCells >= 21: Use all 20 unique sprites + 1 duplicate = 21 items
//   - If totalCells < 21: Use (totalCells - 1) unique sprites + 1 duplicate = totalCells items
// Therefore, the grid can never have more than 21 cells.
//
// DESIRED vs ACTUAL DIMENSIONS:
// GRID_COLUMNS and GRID_ROWS represent the desired grid dimensions.
// However, if GRID_COLUMNS × GRID_ROWS would exceed 21 cells, we dynamically
// reduce the dimensions to ensure we never exceed the sprite limit.
//
// REDUCTION STRATEGY:
// If the product exceeds 21, we reduce the larger dimension first (to maintain
// a more square-like aspect ratio), then reduce further if needed. This ensures
// the grid always fits within our 21-sprite constraint while staying as close
// as possible to the desired dimensions.

// Desired grid dimensions (may be reduced if they would exceed 21 cells)
const GRID_COLUMNS = 3;
const GRID_ROWS = 7;

// Calculate the maximum number of cells we can have (limited by sprite count)
const MAX_CELLS = ALL_SPRITES.length + 1;  // 20 unique sprites + 1 duplicate = 21

// Calculate actual grid dimensions, ensuring we never exceed MAX_CELLS
// Start with desired dimensions
let actualColumns = GRID_COLUMNS;
let actualRows = GRID_ROWS;
let totalCells = actualColumns * actualRows;

// If the desired dimensions would exceed our sprite limit, reduce them
if (totalCells > MAX_CELLS) {
    // Reduce the larger dimension first to maintain aspect ratio
    // Keep reducing until we're within the limit
    while (totalCells > MAX_CELLS) {
        if (actualColumns >= actualRows) {
            // Reduce columns if they're larger or equal
            actualColumns--;
        } else {
            // Reduce rows if they're larger
            actualRows--;
        }
        totalCells = actualColumns * actualRows;
    }
}

// Export the actual dimensions that will be used (ensures totalCells <= MAX_CELLS)
// These are the dimensions that will actually be used for grid layout and level generation
const ACTUAL_GRID_COLUMNS = actualColumns;
const ACTUAL_GRID_ROWS = actualRows;

// Verify we're within the limit (should always be true after reduction logic)
if (ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS > MAX_CELLS) {
    console.warn(`Grid dimensions (${ACTUAL_GRID_COLUMNS}×${ACTUAL_GRID_ROWS}=${ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS}) exceed sprite limit (${MAX_CELLS}). This should never happen!`);
}

/**
 * Fisher-Yates shuffle — returns a new randomly-ordered copy of `array`.
 * Does NOT mutate the original.
 */
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Check if two positions in the grid are adjacent (horizontally, vertically, or diagonally).
 * Grid positions are 0 to (ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS - 1), 
 * arranged as ACTUAL_GRID_COLUMNS columns × ACTUAL_GRID_ROWS rows.
 * Uses ACTUAL_GRID_COLUMNS (not GRID_COLUMNS) to match the actual grid layout.
 *
 * @param {number} pos1  First position index
 * @param {number} pos2  Second position index
 * @returns {boolean}    True if positions are adjacent
 */
function areAdjacent(pos1, pos2) {
    // Use ACTUAL_GRID_COLUMNS to calculate row/column positions
    // This ensures adjacency checks match the actual grid dimensions
    const row1 = Math.floor(pos1 / ACTUAL_GRID_COLUMNS);
    const col1 = pos1 % ACTUAL_GRID_COLUMNS;
    const row2 = Math.floor(pos2 / ACTUAL_GRID_COLUMNS);
    const col2 = pos2 % ACTUAL_GRID_COLUMNS;

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

/**
 * Builds a randomized set of sprite names for one level.
 * The number of items equals ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS,
 * which is guaranteed to be <= 21 (the sprite limit: 20 unique + 1 duplicate).
 * 
 * IMPORTANT: Uses ACTUAL_GRID_COLUMNS and ACTUAL_GRID_ROWS (not the desired
 * GRID_COLUMNS/GRID_ROWS) to ensure we never exceed the available sprite count.
 * 
 * SPRITE SELECTION STRATEGY:
 * - If totalCells >= 21: Use all 20 unique sprites + 1 duplicate = 21 items
 * - If totalCells < 21: Use a random subset of sprites (enough to fill the cells)
 *   In this case, we need (totalCells - 1) unique sprites + 1 duplicate = totalCells items
 *   For example, if totalCells = 10, we pick 9 random unique sprites + 1 duplicate = 10 items
 * 
 * Ensures the two instances of the macguffin are never placed
 * adjacent to each other (horizontally, vertically, or diagonally).
 *
 * @returns {{ items: string[], macguffin: string }}
 *   - items:     Array of sprite names in shuffled order (for grid placement)
 *   - macguffin:  the name of the one sprite that appears twice
 */
function generateLevel() {
    // Use ACTUAL dimensions to ensure we never exceed sprite limit
    // ACTUAL_GRID_COLUMNS × ACTUAL_GRID_ROWS is guaranteed to be <= MAX_CELLS (21)
    const totalCells = ACTUAL_GRID_COLUMNS * ACTUAL_GRID_ROWS;
    
    // Safety check: if somehow totalCells exceeds MAX_CELLS, log a warning
    // (This should never happen due to the reduction logic, but better safe than sorry)
    if (totalCells > MAX_CELLS) {
        console.error(`generateLevel: totalCells (${totalCells}) exceeds MAX_CELLS (${MAX_CELLS}). This should never happen!`);
    }
    
    let chosen;  // The subset of sprites we'll use for this level
    let macguffin;  // The sprite that will appear twice
    
    if (totalCells >= MAX_CELLS) {
        // We have enough cells for all 20 unique sprites + 1 duplicate
        // Shuffle all sprites and use all of them
        chosen = shuffle(ALL_SPRITES);
        
        // Randomly pick one of the sprites to be the macguffin
        macguffin = chosen[Math.floor(Math.random() * chosen.length)];
        
        // Combine all unique sprites + one extra copy of the macguffin
        // This gives us exactly 21 items (20 unique + 1 duplicate)
        chosen = [...chosen, macguffin];
    } else {
        // We don't have enough cells for all 20 sprites
        // Use a random subset: we need (totalCells - 1) unique sprites + 1 duplicate
        // For example, if totalCells = 10, we need 9 unique + 1 duplicate = 10 items
        const numUniqueSpritesNeeded = totalCells - 1;
        
        // Shuffle all sprites and take a random subset
        const shuffledAll = shuffle(ALL_SPRITES);
        chosen = shuffledAll.slice(0, numUniqueSpritesNeeded);
        
        // Randomly pick one of the chosen sprites to be the macguffin (the duplicate)
        macguffin = chosen[Math.floor(Math.random() * chosen.length)];
        
        // Add the duplicate macguffin to the chosen set
        // This gives us exactly totalCells items (numUniqueSpritesNeeded unique + 1 duplicate)
        chosen = [...chosen, macguffin];
    }
    
    // Shuffle the final set so the macguffin duplicate isn't predictably placed
    let items = shuffle(chosen);
    
    // Final verification: ensure we have exactly totalCells items and macguffin appears twice
    if (items.length !== totalCells) {
        console.warn(`generateLevel: Expected ${totalCells} items but got ${items.length}. This may indicate a logic error.`);
    }
    
    const finalMacguffinCount = items.filter(s => s === macguffin).length;
    if (finalMacguffinCount !== 2) {
        console.warn(`generateLevel: macguffin should appear twice but appears ${finalMacguffinCount} times. This may indicate a logic error.`);
    }

    // Find the two positions where the macguffin appears
    const macguffinIndices = [];
    items.forEach((sprite, index) => {
        if (sprite === macguffin) {
            macguffinIndices.push(index);
        }
    });

    // If the two macguffins are adjacent, swap one with a non-adjacent position
    if (areAdjacent(macguffinIndices[0], macguffinIndices[1])) {
        // Find all positions that are NOT adjacent to the first macguffin
        const validSwapPositions = [];
        for (let i = 0; i < items.length; i++) {
            if (i !== macguffinIndices[0] && 
                i !== macguffinIndices[1] && 
                !areAdjacent(macguffinIndices[0], i)) {
                validSwapPositions.push(i);
            }
        }

        // If we found valid positions, swap the second macguffin with a random valid one
        if (validSwapPositions.length > 0) {
            const swapIndex = validSwapPositions[Math.floor(Math.random() * validSwapPositions.length)];
            [items[macguffinIndices[1]], items[swapIndex]] = [items[swapIndex], items[macguffinIndices[1]]];
        }
    }

    return { items, macguffin };
}
