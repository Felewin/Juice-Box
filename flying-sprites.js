/*
 * ============================================================
 *  JUICE BOX — Flying Sprites (Title Screen)
 * ============================================================
 *  Sprites from the sprites folder (root only, no subfolders) randomly
 *  appear off-screen and fly across the title screen in random directions,
 *  rotating at random speeds. Visible only on the title screen; when the user
 *  advances to mode select, CSS fades the container so sprites continue to
 *  animate but are invisible on the mode select screen. Makes the title screen
 *  feel alive and fun.
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

    const flying = [];
    let lastSpawnTime = 0;
    let nextSpawnDelay = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);

    function randomAngle() {
        return Math.random() * Math.PI * 2;
    }

    const FLYING_SPRITES = ALL_SPRITES.filter((s) => s !== 'leaves-falling');

    function randomSprite() {
        return FLYING_SPRITES[Math.floor(Math.random() * FLYING_SPRITES.length)];
    }

    /**
     * Spawn a sprite at a random edge, moving across the screen.
     * Returns { el, x, y, vx, vy, rotation, rotationSpeed, size }
     */
    function spawnSprite() {
        const el = document.createElement('img');
        el.src = spriteSrc(randomSprite());
        el.alt = '';
        el.draggable = false;
        el.style.position = 'absolute';
        el.style.objectFit = 'contain';
        el.style.willChange = 'transform';

        const size = getCellSize();  // from level.js
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

        container.appendChild(el);

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
