/*
 * ============================================================
 *  JUICE BOX — Scene Transitions
 * ============================================================
 *  The liquid drain overlay: random color fills the screen, fades in,
 *  then drains downward to reveal the game. Duration synced to audio.
 *
 *  Dependencies: utils.js (doubleRAF), audio.js (loadAudioMetadata, playOneshot).
 * ============================================================
 */

/**
 * Plays the liquid drain transition. Used when going from mode screen to a
 * level, or between levels after a win. Callbacks let the app update UI state
 * (e.g. hide menu button during the drain).
 *
 * @param {HTMLElement} liquidOverlay         The #liquid-overlay element.
 * @param {Object} callbacks
 * @param {Function} callbacks.onTransitionStart Called when drain begins (e.g. set isSceneTransitioning).
 * @param {Function} callbacks.onTransitionEnd   Called when overlay is hidden.
 */
function showLiquidDrain(liquidOverlay, { onTransitionStart, onTransitionEnd }) {
    onTransitionStart();

    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);
    const lightness = 40 + Math.floor(Math.random() * 20);
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    liquidOverlay.style.backgroundColor = color;
    liquidOverlay.classList.remove('hidden', 'draining', 'visible');

    doubleRAF(() => {
        liquidOverlay.classList.add('visible');

        setTimeout(() => {
            loadAudioMetadata('audio/Juicebox Straw.mp3').then((audio) => {
                const durationMs = audio.duration * 1000;
                const durationSec = audio.duration;

                playOneshot('audio/Juicebox Straw.mp3');
                liquidOverlay.style.animationDuration = `${durationSec}s`;

                doubleRAF(() => {
                    liquidOverlay.classList.add('draining');

                    setTimeout(() => {
                        liquidOverlay.classList.add('hidden');
                        onTransitionEnd();
                    }, durationMs);
                });
            });
        }, 300);
    });
}
