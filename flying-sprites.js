/*
 * ============================================================
 *  JUICE BOX — Flying Sprites (Title Screen)
 * ============================================================
 *  Sprites from the sprites folder (root only, no subfolders) randomly
 *  appear off-screen and fly across the title screen in random directions,
 *  rotating at random speeds.
 *
 *  Sizes: Each sprite is scaled randomly between 0.5× and 2× the base cell size.
 *
 *  Layering: Two containers — background (z-index 0) and foreground (z-index 2).
 *  Sprites larger than 1.75× base size go in the foreground so they fly in front
 *  of the title text; smaller sprites stay behind.
 *
 *  Visible only on the title screen; when the user advances to mode select, CSS
 *  fades both containers so sprites continue to animate but are invisible.
 * ============================================================
 */

(function () {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;

    const NUM_FLYING = 20;
    const SPEED_MIN = 60;
    const SPEED_MAX = 300;
    const ROTATION_SPEED_MIN = -180;
    const ROTATION_SPEED_MAX = 180;
    const SPAWN_INTERVAL_MIN = 600;
    const SPAWN_INTERVAL_MAX = 1200;

    /* Background layer: small/medium sprites fly behind the title (z-index 0) */
    const container = document.createElement('div');
    container.id = 'flying-sprites-container';
    container.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
    `;
    menuContainer.insertBefore(container, menuContainer.firstChild);

    /* Foreground layer: large sprites (>1.75× base) fly in front of the title (z-index 2).
       Inserted after #title so DOM order matches visual stack; #title has z-index 1. */
    const foregroundContainer = document.createElement('div');
    foregroundContainer.id = 'flying-sprites-foreground';
    foregroundContainer.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 2;
        overflow: hidden;
    `;
    const titleEl = document.getElementById('title');
    menuContainer.insertBefore(foregroundContainer, titleEl ? titleEl.nextElementSibling : null);

    const flying = [];
    let lastSpawnTime = 0;
    let nextSpawnDelay = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);

    function randomAngle() {
        return Math.random() * Math.PI * 2;
    }

    /* All sprites except leaves-falling and blueberries, plus juicebox, beachball, teapot, thong-sandal.
       Beachball and thong-sandal appear once (half as common); juicebox appears 4× (twice as common). */
    const baseSprites = [
        ...ALL_SPRITES.filter((s) => s !== 'leaves-falling' && s !== 'blueberries'),
        'juicebox', 'unjuicable/teapot'
    ];
    const FLYING_SPRITES = [...baseSprites, ...baseSprites, 'unjuicable/beachball', 'unjuicable/thong-sandal', 'juicebox', 'juicebox'];

    function randomSprite() {
        return FLYING_SPRITES[Math.floor(Math.random() * FLYING_SPRITES.length)];
    }

    /**
     * Spawn a sprite at a random edge, moving across the screen. Size is random
     * (0.5×–2× base); sprites >1.75× go to foreground layer (in front of title).
     * Returns { el, x, y, vx, vy, rotation, rotationSpeed, scaleX, size }
     */
    function spawnSprite() {
        const el = document.createElement('img');
        const spriteName = randomSprite();
        el.src = spriteName === 'juicebox' ? withCacheBust('favicon.png') : spriteSrc(spriteName);
        el.alt = '';
        el.draggable = false;
        el.style.position = 'absolute';
        el.style.objectFit = 'contain';
        el.style.willChange = 'transform';

        const baseSize = getCellSize();  /* from level.js */
        let size = baseSize * (0.5 + Math.random() * 1.5);  /* random 0.5× to 2× */
        if (spriteName === 'unjuicable/beachball') size *= 4;
        el.style.width = size + 'px';
        el.style.height = size + 'px';

        const angle = randomAngle();
        const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const rotationSpeed = (ROTATION_SPEED_MAX - ROTATION_SPEED_MIN) * Math.random() + ROTATION_SPEED_MIN;

        const padding = size + 20;
        const w = window.innerWidth;
        const h = window.innerHeight;

        let x, y;
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
            x = -padding;
            y = Math.random() * (h + 2 * padding) - padding;
        } else if (edge === 1) {
            x = w + padding;
            y = Math.random() * (h + 2 * padding) - padding;
        } else if (edge === 2) {
            x = Math.random() * (w + 2 * padding) - padding;
            y = -padding;
        } else {
            x = Math.random() * (w + 2 * padding) - padding;
            y = h + padding;
        }

        el.style.left = x + 'px';
        el.style.top = y + 'px';
        const scaleX = randomlyApplyHorizontalMirroringOrNotToSprite(el);
        el.style.transform = `translate(-50%, -50%) scaleX(${scaleX}) rotate(0deg)`;

        /* Large sprites (>1.75× base size) fly in front of the title; smaller ones stay behind */
        const targetContainer = size > baseSize * 1.75 ? foregroundContainer : container;
        targetContainer.appendChild(el);

        return {
            el,
            x,
            y,
            vx,
            vy,
            rotation: 0,
            rotationSpeed,
            scaleX,
            size
        };
    }

    function removeSprite(sprite) {
        sprite.el.remove();
        const idx = flying.indexOf(sprite);
        if (idx !== -1) flying.splice(idx, 1);
    }

    function isOffScreen(sprite) {
        const margin = sprite.size + 50;
        return (
            sprite.x < -margin ||
            sprite.x > window.innerWidth + margin ||
            sprite.y < -margin ||
            sprite.y > window.innerHeight + margin
        );
    }

    let rafId = null;
    let lastTime = 0;

    function animate(time) {
        const dt = lastTime ? (time - lastTime) / 1000 : 0;
        lastTime = time;

        for (let i = flying.length - 1; i >= 0; i--) {
            const s = flying[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.rotation += s.rotationSpeed * dt;

            s.el.style.left = s.x + 'px';
            s.el.style.top = s.y + 'px';
            s.el.style.transform = `translate(-50%, -50%) scaleX(${s.scaleX}) rotate(${s.rotation}deg)`;

            if (isOffScreen(s)) {
                removeSprite(s);
            }
        }

        if (time - lastSpawnTime >= nextSpawnDelay) {
            lastSpawnTime = time;
            nextSpawnDelay = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
            while (flying.length < NUM_FLYING) {
                flying.push(spawnSprite());
            }
        }

        rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame((time) => {
        lastTime = time;
        lastSpawnTime = time;
        for (let i = 0; i < NUM_FLYING; i++) {
            flying.push(spawnSprite());
        }
        rafId = requestAnimationFrame(animate);
    });

    window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        } else {
            lastTime = 0;
            rafId = requestAnimationFrame(animate);
        }
    });
})();
