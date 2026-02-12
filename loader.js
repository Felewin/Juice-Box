/*
 * ============================================================
 *  JUICE BOX — Asset Loader (Cache-Busted)
 * ============================================================
 *  Loads all CSS and JS with ?v=CACHE_BUST so assets are fresh after each
 *  deploy. CACHE_BUST comes from version.js (git commit hash, set at deploy).
 *
 *  Flow: version.js defines CACHE_BUST → loader.js runs → injects <link>
 *  and <script> tags with ?v=CACHE_BUST → scripts run in order via onload
 *  chaining → when done, cache-busts static images (favicon, mode icons).
 *
 *  Add new modes: push path to SCRIPTS before app.js.
 * ============================================================
 */

(function () {
    /* Fallback when version.js missing (local without build) */
    var v = typeof CACHE_BUST !== 'undefined' ? CACHE_BUST : Date.now();
    var q = function (path) {
        return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + v;
    };

    /* ---- 1. Inject CSS with cache bust so stylesheets refetch on deploy ---- */
    ['style.css', 'liquid.css'].forEach(function (href) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = q(href);
        document.head.appendChild(link);
    });

    /* ---- 2. Load scripts sequentially; onload chains to preserve order ---- */
    var SCRIPTS = [
        'timing.js',
        'level.js',
        'audio.js',
        'utils.js',
        'flying-sprites.js',
        'transitions.js',
        'grid.js',
        'modes.js',
        'modes/go-bananas.js',
        'modes/apple-of-my-eye.js',
        'modes/perfect-pearing.js',
        'modes/peach-party.js',
        'modes/subtle-tea.js',
        'modes/pairy-picking.js',
        'app.js'
    ];

    function loadScript(i) {
        if (i >= SCRIPTS.length) {
            /* All scripts loaded. Add ?v= to static img/link in HTML (favicon, mode icons). */
            if (typeof withCacheBust === 'function') {
                document.querySelectorAll('link[rel="icon"]').forEach(function (el) {
                    el.href = withCacheBust('favicon.png');
                });
                document.querySelectorAll('.mode-btn-icon, #juicebox-button img').forEach(function (img) {
                    var src = img.getAttribute('src');
                    if (src) img.src = withCacheBust(src);
                });
            }
            return;
        }
        var s = document.createElement('script');
        s.src = q(SCRIPTS[i]);
        s.onload = function () { loadScript(i + 1); };
        s.onerror = function () { console.error('Failed to load ' + SCRIPTS[i]); loadScript(i + 1); };
        /* Append to head; body may not exist yet when loader runs from <head> */
        (document.head || document.documentElement).appendChild(s);
    }

    loadScript(0);
})();
