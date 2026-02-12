/*
 * ============================================================
 *  JUICE BOX — Grid & Cell Management
 * ============================================================
 *  Builds the sprite grid DOM, handles cell clicks and touch input.
 *  All modes use this shared grid. Win logic is delegated to the active mode
 *  via checkWin(cell) and onWin(). Each mode implements its own win condition.
 *
 *  CHECKWIN RETURN CONVENTION:
 *  - false: wrong sprite → play Mouth Pop (incorrect feedback).
 *  - undefined: correct click but not yet won (e.g. first of several targets) → no feedback, no onWin.
 *  - true or object: level won → call onWin with the result.
 *
 *  Dependencies: level.js (spriteSrc), audio.js (playOneshot), utils.js (none; grid is stateless).
 * ============================================================
 */

/**
 * Finds which grid cell (if any) is under the user's finger during a touch event.
 * Works for touchstart/touchmove (touches[0]) and touchend (changedTouches[0]).
 *
 * @param {HTMLElement} gridEl     The grid container (to verify the cell belongs to it).
 * @param {TouchEvent} touchEvent A touchstart, touchmove, or touchend event.
 * @returns {Element|null}        The .cell under the touch, or null.
 */
function getCellUnderTouch(gridEl, touchEvent) {
    const touch = touchEvent.touches?.[0] ?? touchEvent.changedTouches?.[0];
    if (!touch) return null;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const cell = el?.closest('.cell');
    return cell && gridEl.contains(cell) && !cell.classList.contains('fade-out') && !cell.classList.contains('removed') ? cell : null;
}

/**
 * Attaches pointer handlers to the grid (once per page load). Handlers read the
 * current level's checkWin/onWin from gridEl.__levelHandlers, which is updated
 * each time buildGrid runs. This lets touch work for any mode without re-binding.
 *
 * @param {HTMLElement} gridEl The grid container.
 */
function setupTouchHandlers(gridEl) {
    let touchStartCell = null;

    const updateTrackedCell = (e) => {
        const cell = getCellUnderTouch(gridEl, e);
        if (cell) touchStartCell = cell;
    };

    gridEl.addEventListener('touchstart', (e) => {
        const h = gridEl.__levelHandlers;
        if (!h || h.shouldIgnoreInput()) return;
        e.preventDefault();
        updateTrackedCell(e);
        if (touchStartCell) touchStartCell.classList.add('incorrect-tap');
    }, { passive: false });

    gridEl.addEventListener('touchmove', (e) => {
        const h = gridEl.__levelHandlers;
        if (!h || h.shouldIgnoreInput()) return;
        e.preventDefault();
        const prev = touchStartCell;
        updateTrackedCell(e);
        if (prev && prev !== touchStartCell) prev.classList.remove('incorrect-tap');
        if (touchStartCell) touchStartCell.classList.add('incorrect-tap');
    }, { passive: false });

    gridEl.addEventListener('touchend', (e) => {
        const h = gridEl.__levelHandlers;
        if (!h || h.shouldIgnoreInput()) return;
        const finalCell = getCellUnderTouch(gridEl, e) || touchStartCell;
        if (touchStartCell) touchStartCell.classList.remove('incorrect-tap');
        if (finalCell) {
            const result = h.checkWin(finalCell);
            if (result === false) {
                playOneshot('audio/Mouth Pop.mp3');
            } else if (result) {
                h.onWin(result === true ? {} : result);
            }
        }
        touchStartCell = null;
    }, { passive: true });

    gridEl.addEventListener('touchcancel', () => {
        if (touchStartCell) touchStartCell.classList.remove('incorrect-tap');
        touchStartCell = null;
    }, { passive: true });

    gridEl.addEventListener('mousedown', (e) => {
        const h = gridEl.__levelHandlers;
        if (!h || h.shouldIgnoreInput()) return;
        const cell = e.target.closest('.cell');
        if (cell && gridEl.contains(cell) && !cell.classList.contains('fade-out') && !cell.classList.contains('removed')) {
            cell.classList.add('incorrect-tap');
            gridEl.__pressedCell = cell;
        }
    });

    document.addEventListener('mouseup', () => {
        if (gridEl.__pressedCell) {
            gridEl.__pressedCell.classList.remove('incorrect-tap');
            gridEl.__pressedCell = null;
        }
    });
}

/**
 * Adds .fade-out to all cells to trigger the CSS opacity transition.
 * Used by app.js for win and return-to-mode-select transitions.
 *
 * @param {HTMLElement} gridEl The grid container.
 */
function fadeOutCells(gridEl) {
    gridEl.querySelectorAll('.cell').forEach((cell) => {
        cell.classList.add('fade-out');
    });
}

/**
 * Clears the grid and builds a new level of sprite cells. Each mode calls this
 * with its own checkWin and the shared onWin/shouldIgnoreInput from app.js.
 *
 * @param {HTMLElement} gridEl            The grid container (#grid).
 * @param {string[]} items                Sprite names in display order (from the mode's level generator).
 * @param {Object} opts
 * @param {Function} opts.checkWin        (cell) => false|undefined|true|object — see CHECKWIN RETURN CONVENTION above.
 * @param {Function} opts.onWin            () => void — called when checkWin returns true. From app.js.
 * @param {Function} opts.shouldIgnoreInput () => boolean — true during transitions. From app.js.
 */
function buildGrid(gridEl, items, { checkWin, onWin, shouldIgnoreInput }) {
    gridEl.innerHTML = '';
    gridEl.__levelHandlers = { checkWin, onWin, shouldIgnoreInput };

    items.forEach((sprite) => {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.sprite = sprite;

        const img = document.createElement('img');
        img.src = spriteSrc(sprite);
        img.alt = sprite;
        img.draggable = false;
        randomlyApplyHorizontalMirroringOrNotToSprite(img);
        cell.appendChild(img);

        const delay = Math.random() * GRID_BOUNCE_STAGGER_MAX_MS + GRID_BOUNCE_STAGGER_MIN_MS;  // Stagger for bounce-in
        setTimeout(() => {
            cell.classList.add('appear');
        }, delay);

        cell.addEventListener('click', () => {
            if (shouldIgnoreInput()) return;
            const result = checkWin(cell);
            if (result === false) {
                playOneshot('audio/Mouth Pop.mp3');
            } else if (result) {
                onWin(result === true ? {} : result);
            }
        });

        gridEl.appendChild(cell);
    });

    if (!gridEl.dataset.touchHandlersSetup) {
        setupTouchHandlers(gridEl);
        gridEl.dataset.touchHandlersSetup = 'true';
    }
}
