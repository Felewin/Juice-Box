/*
 * ============================================================
 *  JUICE BOX — Sprite Catalog
 * ============================================================
 *  Shared sprite list and path helper. Level generation logic lives
 *  in each mode (e.g. modes/discover-the-duplicate.js).
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
