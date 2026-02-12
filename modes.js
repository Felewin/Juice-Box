/*
 * ============================================================
 *  JUICE BOX — Mode Config & Mode Select UI
 * ============================================================
 *  Configuration (accent colors) and layout (mode button height) for the
 *  mode select screen. Game modes themselves live in modes/*.js.
 * ============================================================
 */

// Accent color from each mode's icon (used for liquid overlay during mode→level transition).
const MODE_ACCENT_COLORS = {
    'go-bananas': '#FF9900',      // banana (amber/orange)
    'apple-of-my-eye': '#C0392B', // apple red (darker)
    'perfect-pearody': '#7DCE82', // pear green
    'peach-party': '#E8A87C',     // peach (darker)
    'pairy-picking': '#C0392B',   // cherry red
    'subtle-tea': '#D94B2E'       // reddish-orange
};

/**
 * Sets mode button height via --mode-btn-height. Each button gets 1/(n+2) of
 * viewport height (n = number of buttons); the +2 reserves space above and below.
 * Called on init and resize.
 */
function updateModeButtonHeight() {
    const modeScreen = document.getElementById('mode-screen');
    if (!modeScreen) return;
    const btns = modeScreen.querySelectorAll('.mode-btn');
    const n = btns.length;
    const height = n > 0 ? `calc(100vh / ${n + 2})` : 'auto';
    document.documentElement.style.setProperty('--mode-btn-height', height);
}
