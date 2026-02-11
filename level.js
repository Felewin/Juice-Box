/*
 * ============================================================
 *  JUICE BOX — Sprite Catalog
 * ============================================================
 *  Shared sprite list and path helper. Level generation logic lives
 *  in each mode (e.g. modes/discover-the-duplicate.js).
 * ============================================================
 */

const ALL_SPRITES = [
    'apple-green', 'apple-red', 'avocado', 'banana', 'carrot',
    'cherries', 'coconut', 'cucumber', 'grapes', 'greens',
    'kiwi', 'lemon', 'mango', 'melon', 'peach',
    'pear', 'pineapple', 'strawberry', 'tangerine',
    'watermelon'
];

const spriteSrc = (name) => `sprites/${name}.png`;
