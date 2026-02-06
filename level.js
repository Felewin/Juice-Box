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
 * Check if two positions in a 3×7 grid are adjacent (horizontally, vertically, or diagonally).
 * Grid positions are 0-20, arranged as 3 columns × 7 rows.
 *
 * @param {number} pos1  First position index (0-20)
 * @param {number} pos2  Second position index (0-20)
 * @returns {boolean}    True if positions are adjacent
 */
function areAdjacent(pos1, pos2) {
    const GRID_COLS = 3;
    const row1 = Math.floor(pos1 / GRID_COLS);
    const col1 = pos1 % GRID_COLS;
    const row2 = Math.floor(pos2 / GRID_COLS);
    const col2 = pos2 % GRID_COLS;

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
 * Builds a randomized set of 21 sprite names for one level.
 * Ensures the two instances of the macguffin are never placed
 * adjacent to each other (horizontally, vertically, or diagonally).
 *
 * @returns {{ items: string[], macguffin: string }}
 *   - items:     21 sprite names in shuffled order (for grid placement)
 *   - macguffin:  the name of the one sprite that appears twice
 */
function generateLevel() {
    // Shuffle all 20 sprites and use all of them (we have exactly 20 total)
    const chosen = shuffle(ALL_SPRITES);

    // Randomly pick one of the 20 to be the macguffin — the sprite
    // the player needs to find. It will appear twice in the grid.
    const macguffin = chosen[Math.floor(Math.random() * chosen.length)];

    // Combine the 20 unique sprites + one extra copy of the macguffin
    // (= 21 items total), then shuffle so the duplicates aren't
    // predictably placed.
    let items = shuffle([...chosen, macguffin]);

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
