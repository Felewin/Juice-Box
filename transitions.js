/*
 * ============================================================
 *  JUICE BOX — Scene Transitions
 * ============================================================
 *  The liquid drain overlay: random color fills the screen, fades in,
 *  then drains downward to reveal the game. Duration synced to audio.
 *
 *  When starting a new drain, any existing drain is cancelled instantly.
 *  When the player presses ESC (returnToMenu), the drain is cancelled with
 *  fadeOut so it fades away rather than vanishing.
 *
 *  Dependencies: utils.js (doubleRAF), audio.js (loadAudioMetadata, playOneshot).
 * ============================================================
 */

const DRAIN_AUDIO_SRC = 'audio/Juicebox Straw.mp3';
const DRAIN_FADE_MS = 300;  // Matches liquid overlay opacity transition in liquid.css

/**
 * Cancels any in-progress drain: stops timers, pauses audio, hides overlay.
 * Call before starting a new drain (to avoid overlap) or when aborting (e.g. ESC).
 *
 * @param {HTMLElement} liquidOverlay The #liquid-overlay element.
 * @param {Object} [opts]
 * @param {Function} [opts.onCancelled] Called after cleanup (e.g. reset isSceneTransitioning).
 * @param {boolean} [opts.fadeOut] If true, fade overlay out over DRAIN_FADE_MS before hiding (e.g. ESC).
 */
function cancelLiquidDrain(liquidOverlay, { onCancelled, fadeOut } = {}) {
    const cancel = liquidOverlay.__drainCancel;
    if (cancel) {
        liquidOverlay.__drainCancel = null;
        cancel(fadeOut, onCancelled);
    } else if (onCancelled) {
        onCancelled();
    }
}

function resetOverlayToHidden(liquidOverlay) {
    liquidOverlay.classList.remove('visible', 'draining');
    liquidOverlay.classList.add('hidden');
}

/**
 * Plays the liquid drain transition. Used when going from mode screen to a
 * level, or between levels after a win. Callbacks let the app update UI state
 * (e.g. hide menu button during the drain).
 *
 * If a drain is already running, it is cancelled first (no overlap). The new
 * drain then starts clean.
 *
 * @param {HTMLElement} liquidOverlay         The #liquid-overlay element.
 * @param {Object} callbacks
 * @param {Function} callbacks.onTransitionStart Called when drain begins (e.g. set isSceneTransitioning).
 * @param {Function} callbacks.onTransitionEnd   Called when overlay is hidden.
 */
function showLiquidDrain(liquidOverlay, { onTransitionStart, onTransitionEnd }) {
    cancelLiquidDrain(liquidOverlay);

    onTransitionStart();

    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);
    const lightness = 40 + Math.floor(Math.random() * 20);
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    liquidOverlay.style.backgroundColor = color;
    liquidOverlay.classList.remove('hidden', 'draining', 'visible');

    const timeouts = [];
    let cancelled = false;

    const cancel = (fadeOut, onCancelled) => {
        cancelled = true;
        timeouts.forEach((id) => clearTimeout(id));
        timeouts.length = 0;
        if (liquidOverlay.__drainAudio) {
            liquidOverlay.__drainAudio.pause();
            liquidOverlay.__drainAudio.currentTime = 0;
            liquidOverlay.__drainAudio = null;
        }
        if (fadeOut && liquidOverlay.classList.contains('visible')) {
            liquidOverlay.classList.remove('draining', 'visible');
            const fadeTimeout = setTimeout(() => {
                liquidOverlay.classList.add('hidden');
                onCancelled?.();
            }, DRAIN_FADE_MS);
            timeouts.push(fadeTimeout);
        } else {
            resetOverlayToHidden(liquidOverlay);
            onCancelled?.();
        }
    };

    liquidOverlay.__drainCancel = cancel;

    doubleRAF(() => {
        if (cancelled) return;
        liquidOverlay.classList.add('visible');

        const t1 = setTimeout(() => {
            if (cancelled) return;
            loadAudioMetadata(DRAIN_AUDIO_SRC).then((audio) => {
                if (cancelled) return;
                const durationMs = audio.duration * 1000;
                const durationSec = audio.duration;

                const drainAudio = new Audio(DRAIN_AUDIO_SRC);
                liquidOverlay.__drainAudio = drainAudio;
                drainAudio.play();

                liquidOverlay.style.animationDuration = `${durationSec}s`;

                doubleRAF(() => {
                    if (cancelled) return;
                    liquidOverlay.classList.add('draining');

                    const t2 = setTimeout(() => {
                        liquidOverlay.__drainCancel = null;
                        liquidOverlay.__drainAudio = null;
                        liquidOverlay.classList.add('hidden');
                        onTransitionEnd();
                    }, durationMs);
                    timeouts.push(t2);
                });
            });
        }, 300);
        timeouts.push(t1);
    });
}
