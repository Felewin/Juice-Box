/*
 * ============================================================
 *  JUICE BOX — Audio Functions
 * ============================================================
 *  Handles all audio playback: one-shots, loops, overlapping
 *  effects, and mode background music.
 *
 *  Mode background music: stopAllModeBackgroundMusic(), startModeBackgroundMusic().
 *  Config (which mode uses which file) lives in modes.js as MODE_BACKGROUND_MUSIC.
 *
 *  playSplitSound(): Plays a random "split" sound; used by Go Bananas, Peach Party,
 *  Pick A Pair, and Apple Of My Eye. Uses LAST_SPLIT_SOUND_REF internally
 *  so we never repeat the same sound twice in a row, even when switching modes or levels.
 * ============================================================
 */

window.LAST_SPLIT_SOUND_REF = window.LAST_SPLIT_SOUND_REF || { last: null };
window.LAST_RUSTLING_LEAVES_REF = window.LAST_RUSTLING_LEAVES_REF || { last: null };

const SPLIT_SOUNDS = [
    'audio/Banana Split (1).mp3',
    'audio/Banana Split (2).mp3',
    'audio/Banana Split (3).mp3'
];

const RUSTLING_LEAVES_SOUNDS = [
    'audio/Rustling Leaves (1).mp3',
    'audio/Rustling Leaves (2).mp3',
    'audio/Rustling Leaves (3).mp3'
];

/**
 * Play a random "split" sound (banana/peach/apple). Uses LAST_SPLIT_SOUND_REF so
 * we never repeat the same sound twice in a row, even when switching modes or levels.
 */
function playSplitSound() {
    playRandomExcludingLast(SPLIT_SOUNDS, LAST_SPLIT_SOUND_REF);
}

/**
 * Play a random rustling leaves sound. Uses LAST_RUSTLING_LEAVES_REF so we never
 * repeat the same sound twice in a row (same antirepetition logic as Banana Split).
 * Used when clicking a successful leaves-falling macguffin in Pick A Pair or Subtle Tea.
 */
function playRustlingLeavesSound() {
    playRandomExcludingLast(RUSTLING_LEAVES_SOUNDS, LAST_RUSTLING_LEAVES_REF);
}

/**
 * Create a new Audio object and load its metadata.
 * Returns a promise that resolves when metadata is loaded.
 *
 * @param {string} src  Path to the audio file
 * @returns {Promise<HTMLAudioElement>}  Promise resolving to the Audio object with loaded metadata
 */
function loadAudioMetadata(src) {
    return new Promise((resolve) => {
        const audio = new Audio(withCacheBust(src));
        audio.addEventListener('loadedmetadata', () => resolve(audio));
        audio.load();  // Trigger metadata load
    });
}

/**
 * Fade out an Audio element over a duration, then pause and reset.
 *
 * @param {HTMLAudioElement} audio       The Audio to fade
 * @param {number} durationMs           Fade duration in milliseconds
 */
function fadeOutAudio(audio, durationMs) {
    if (!audio) return;
    const startVolume = audio.volume;
    const startTime = performance.now();
    const stop = () => { audio.pause(); audio.currentTime = 0; audio.volume = 1; };
    function tick(now) {
        const elapsed = now - startTime;
        const pct = Math.min(1, elapsed / durationMs);
        audio.volume = startVolume * (1 - pct);
        if (pct < 1) requestAnimationFrame(tick);
        else stop();
    }
    requestAnimationFrame(tick);
    setTimeout(stop, durationMs + 100);  // Backup: ensure pause even if rAF throttled (e.g. tab in background)
}

/**
 * Registry of playing mode background music. Key = modeId, value = Audio element.
 * Cleared when stopping (no fade) or when fade completes and next mode starts.
 */
const modeBgAudio = {};

/**
 * Stops all mode background music. Call when entering mode select or before starting a new mode.
 *
 * @param {number} [fadeMs] If provided, fade out over this many ms; otherwise stop immediately.
 * Refs stay in modeBgAudio when fading so re-entering can stop them; cleanup on next stop.
 */
function stopAllModeBackgroundMusic(fadeMs) {
    for (const modeId of Object.keys(modeBgAudio)) {
        const audio = modeBgAudio[modeId];
        if (audio) {
            if (fadeMs) fadeOutAudio(audio, fadeMs);
            else { audio.pause(); audio.currentTime = 0; delete modeBgAudio[modeId]; }
        }
    }
}

/**
 * Starts this mode's background music. Stops all other modes' music first.
 * Call from app when entering first level of a mode that has background music.
 *
 * @param {string} modeId  Mode identifier (for registry; used when stopping)
 * @param {string} src     Path to the audio file (from MODE_BACKGROUND_MUSIC in modes.js)
 */
function startModeBackgroundMusic(modeId, src) {
    if (!src) return;
    stopAllModeBackgroundMusic();  // Stop any other mode's music (or prior instance)
    const audio = playLoopInfinite(src);
    modeBgAudio[modeId] = audio;
}

/**
 * Play an audio file on infinite loop. Returns the Audio object so the caller
 * can stop it with audio.pause() and audio.currentTime = 0.
 *
 * @param {string} src  Path to the audio file
 * @returns {HTMLAudioElement}  The playing Audio object
 */
function playLoopInfinite(src) {
    const audio = new Audio(withCacheBust(src));
    audio.loop = true;
    audio.play();
    return audio;
}

/**
 * Play an audio file once from start to finish ("one-shot").
 * Creates a fresh Audio object each call so overlapping plays
 * don't cut each other off. Fire-and-forget — no need to await.
 *
 * @param {string} src  Path to the audio file (e.g. "audio/my-sound.mp3")
 */
function playOneshot(src) {
    const audio = new Audio(withCacheBust(src));
    audio.play();
}

/**
 * Play an audio file a specific number of times back-to-back.
 * Each time the clip ends it restarts, counting down until all
 * repetitions are done. Like playOneshot, each call creates its
 * own Audio object so it won't interfere with other sounds.
 *
 * @param {string} src    Path to the audio file
 * @param {number} times  How many total plays (e.g. 3 = play, replay, replay)
 */
function playLooped(src, times) {
    const audio = new Audio(src);
    let remaining = times;
    audio.addEventListener('ended', () => {
        remaining--;
        if (remaining > 0) {
            audio.currentTime = 0;
            audio.play();
        }
    });
    audio.play();
}

/**
 * Play a random audio file from an array of sources, excluding the last played
 * one (to avoid repeating the same sound twice in a row).
 *
 * @param {string[]} srcs              Paths to audio files
 * @param {{ last: string|null }} ref  Mutable ref; will be updated with the chosen src
 */
function playRandomExcludingLast(srcs, ref) {
    let choices = srcs;
    if (ref.last != null && srcs.length > 1) {
        choices = srcs.filter((s) => s !== ref.last);
    }
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    ref.last = chosen;
    playOneshot(chosen);
}

/**
 * Play an audio file multiple times with overlapping starts.
 * Each subsequent play begins at a random percentage through
 * the previous play (within a specified range), creating a
 * layered/overlapping effect with natural variation.
 *
 * @param {string} src            Path to the audio file
 * @param {number} times          How many total plays
 * @param {number} minOverlapPct  Minimum overlap percentage (0.0 to 1.0)
 * @param {number} maxOverlapPct  Maximum overlap percentage (0.0 to 1.0)
 *                                Each play uses a random value between min and max.
 *                                Example: 3 plays with 0.25-0.35 range on a 1s clip:
 *                                - Play 1 at 0ms
 *                                - Play 2 at random(250-350ms) after play 1
 *                                - Play 3 at random(250-350ms) after play 2
 */
function playOverlapping(src, times, minOverlapPct, maxOverlapPct) {
    // Load the audio to get its duration
    loadAudioMetadata(src).then((audio) => {
        const duration = audio.duration * 1000; // Convert to milliseconds
        let cumulativeDelay = 0;

        // Schedule each play with a random overlap interval
        for (let i = 0; i < times; i++) {
            if (i === 0) {
                // First play starts immediately
                playOneshot(src);
            } else {
                // Each subsequent play uses a random overlap percentage
                const randomOverlap = Math.random() * (maxOverlapPct - minOverlapPct) + minOverlapPct;
                const interval = duration * randomOverlap;
                cumulativeDelay += interval;

                setTimeout(() => {
                    playOneshot(src);
                }, cumulativeDelay);
            }
        }
    });
}
