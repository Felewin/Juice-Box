/*
 * ============================================================
 *  JUICE BOX — Audio Functions
 * ============================================================
 *  Handles all audio playback: one-shots, loops, and overlapping
 *  effects. All functions create fresh Audio objects to allow
 *  simultaneous playback without cutting each other off.
 * ============================================================
 */

/**
 * Create a new Audio object and load its metadata.
 * Returns a promise that resolves when metadata is loaded.
 *
 * @param {string} src  Path to the audio file
 * @returns {Promise<HTMLAudioElement>}  Promise resolving to the Audio object with loaded metadata
 */
function loadAudioMetadata(src) {
    return new Promise((resolve) => {
        const audio = new Audio(src);
        audio.addEventListener('loadedmetadata', () => resolve(audio));
        audio.load();  // Trigger metadata load
    });
}

/**
 * Play an audio file once from start to finish ("one-shot").
 * Creates a fresh Audio object each call so overlapping plays
 * don't cut each other off. Fire-and-forget — no need to await.
 *
 * @param {string} src  Path to the audio file (e.g. "audio/my-sound.mp3")
 */
function playOneshot(src) {
    const audio = new Audio(src);
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
