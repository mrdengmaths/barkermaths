/* Same Base, Same Height – the draggable triangle demo. */
(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const fmt = (n) => n.toFixed(1);
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const svg = $('drag-svg');
    if (!svg) return;

    // Geometry in SVG units. 1 cm = SCALE units. A is the left end of the base.
    const SCALE = 28;
    const AX = 268;
    const AY = 280;
    const BASE_CM = 8;
    const HEIGHT_CM = 5;
    const BX = AX + BASE_CM * SCALE;
    const CY = AY - HEIGHT_CM * SCALE;
    const FULL_LIMITS = { min: -8, max: 16, viewBox: '0 0 760 340' };
    // On narrow screens the view is cropped around the triangle so it can be drawn larger.
    const COMPACT_LIMITS = { min: -4.5, max: 12.5, viewBox: '110 80 540 260' };
    const START_CM = 6;
    const MAX_COPIES = 6;

    const el = {
        tri: $('drag-tri'),
        h: $('drag-hline'),
        ext: $('drag-ext'),
        ra: $('drag-ra'),
        hLabel: $('drag-h-label'),
        handle: $('drag-handle'),
        hit: $('drag-hit'),
        ring: $('drag-ring'),
        knob: $('drag-knob'),
        cLabel: $('drag-c-label'),
        nudgeL: $('drag-nudge-l'),
        nudgeR: $('drag-nudge-r'),
        ghosts: $('drag-ghosts'),
        ac: $('ro-ac'),
        bc: $('ro-bc'),
        type: $('ro-type'),
        area: $('ro-area')
    };

    let limits = FULL_LIMITS;
    let x = START_CM;
    let drag = null;

    const clampSnap = (cm) => Math.round(Math.min(limits.max, Math.max(limits.min, cm)) * 10) / 10;

    // 0 = right angle, 1 = acute, 2 = obtuse (from a dot product).
    const angleKind = (dot) => (Math.abs(dot) < 1e-9 ? 0 : dot > 0 ? 1 : 2);

    function describe(cm) {
        const ac = Math.hypot(cm, HEIGHT_CM);
        const bc = Math.hypot(cm - BASE_CM, HEIGHT_CM);
        const kinds = [
            { kind: angleKind(cm * BASE_CM), at: 'A' },
            { kind: angleKind((BASE_CM - cm) * BASE_CM), at: 'B' },
            { kind: angleKind(-cm * (BASE_CM - cm) + HEIGHT_CM * HEIGHT_CM), at: 'C' }
        ];
        const right = kinds.find((k) => k.kind === 0);
        const obtuse = kinds.find((k) => k.kind === 2);
        let type = 'Acute-angled';
        if (right) type = `Right-angled (at ${right.at})`;
        else if (obtuse) type = `Obtuse-angled (at ${obtuse.at})`;
        if (Math.abs(ac - bc) < 1e-9) type += ', isosceles';
        return { ac, bc, type };
    }

    // Area is measured from the drawn coordinates (shoelace formula), not hard-coded.
    function drawnAreaCm2(cx) {
        const twice = Math.abs((BX - AX) * (CY - AY) - (cx - AX) * (AY - AY));
        return twice / 2 / (SCALE * SCALE);
    }

    function render() {
        const cx = Math.round((AX + x * SCALE) * 100) / 100;
        el.tri.setAttribute('points', `${AX},${AY} ${BX},${AY} ${cx},${CY}`);
        el.h.setAttribute('x1', cx);
        el.h.setAttribute('x2', cx);

        // Dotted extension of the base when the foot of the height is outside AB.
        if (x < 0) {
            el.ext.setAttribute('x1', cx);
            el.ext.setAttribute('x2', AX);
        } else if (x > BASE_CM) {
            el.ext.setAttribute('x1', BX);
            el.ext.setAttribute('x2', cx);
        } else {
            el.ext.setAttribute('x1', cx);
            el.ext.setAttribute('x2', cx);
        }
        el.ext.setAttribute('y1', AY);
        el.ext.setAttribute('y2', AY);

        const dir = x < BASE_CM / 2 ? 1 : -1;
        el.ra.setAttribute('d', `M${cx} ${AY - 12} h${dir * 12} v12`);

        const labelLeft = cx > 130;
        el.hLabel.setAttribute('x', labelLeft ? cx - 10 : cx + 10);
        el.hLabel.style.textAnchor = labelLeft ? 'end' : 'start';

        el.handle.setAttribute('transform', `translate(${cx} ${CY})`);

        const { ac, bc, type } = describe(x);
        const area = drawnAreaCm2(cx);
        const areaText = fmt(area).replace(/\.0$/, '');
        el.ac.textContent = `${fmt(ac)} cm`;
        el.bc.textContent = `${fmt(bc)} cm`;
        el.type.textContent = type;
        el.area.textContent = `${areaText} cm²`;

        const side = x >= 0 ? `${fmt(x)} cm to the right of A` : `${fmt(-x)} cm to the left of A`;
        el.handle.setAttribute('aria-valuenow', fmt(x));
        el.handle.setAttribute('aria-valuetext', `${side}. Area stays ${areaText} square centimetres.`);
    }

    // Keep the grab target at least ~26px in radius on screen, even when the diagram shrinks.
    function layoutHandle() {
        const width = svg.getBoundingClientRect().width;
        if (!width) return;

        const wanted = width < 560 ? COMPACT_LIMITS : FULL_LIMITS;
        if (wanted !== limits) {
            limits = wanted;
            svg.setAttribute('viewBox', limits.viewBox);
            el.handle.setAttribute('aria-valuemin', limits.min);
            el.handle.setAttribute('aria-valuemax', limits.max);
            x = clampSnap(x);
            render();
            if (window.Explore) window.Explore.fitSvgText(svg);
        }

        const scale = width / svg.viewBox.baseVal.width;
        const knob = Math.max(14, 12 / scale);
        const hit = Math.max(30, 28 / scale);
        el.knob.setAttribute('r', knob);
        el.ring.setAttribute('r', knob + 8);
        el.hit.setAttribute('r', hit);
        el.cLabel.setAttribute('y', -(knob + 12));
        el.nudgeL.setAttribute('points', `${-(knob + 8)},0 ${-(knob + 20)},-8 ${-(knob + 20)},8`);
        el.nudgeR.setAttribute('points', `${knob + 8},0 ${knob + 20},-8 ${knob + 20},8`);
    }

    function setX(cm) {
        const next = clampSnap(cm);
        if (next === x) return;
        x = next;
        render();
        svg.classList.add('used');
    }

    function pointerToCm(event) {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const local = point.matrixTransform(svg.getScreenCTM().inverse());
        return (local.x - AX) / SCALE;
    }

    svg.addEventListener('pointerdown', (event) => {
        const target = event.target.closest('[data-drag]');
        if (!target) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();

        const pointerCm = pointerToCm(event);
        const grabbedHandle = target.dataset.drag === 'handle';
        drag = { id: event.pointerId, offset: grabbedHandle ? x - pointerCm : 0 };
        try { svg.setPointerCapture(event.pointerId); } catch (error) { /* pointer already gone */ }
        svg.classList.add('dragging');
        el.handle.focus({ preventScroll: true });
        setX(pointerCm + drag.offset);
    });

    svg.addEventListener('pointermove', (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        setX(pointerToCm(event) + drag.offset);
    });

    const endDrag = (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        drag = null;
        svg.classList.remove('dragging');
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('lostpointercapture', endDrag);
    svg.addEventListener('dragstart', (event) => event.preventDefault());

    // Keyboard control for the slider.
    el.handle.addEventListener('keydown', (event) => {
        const small = event.shiftKey ? 1 : 0.1;
        let next;
        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowDown': next = x - small; break;
            case 'ArrowRight':
            case 'ArrowUp': next = x + small; break;
            case 'PageDown': next = x - 1; break;
            case 'PageUp': next = x + 1; break;
            case 'Home': next = limits.min; break;
            case 'End': next = limits.max; break;
            default: return;
        }
        event.preventDefault();
        setX(next);
    });

    // "Leave a copy" keeps an outline of the current triangle for comparison.
    $('drag-copy').addEventListener('click', () => {
        const ghost = document.createElementNS(SVG_NS, 'polygon');
        ghost.setAttribute('class', 'tri tri-ghost');
        ghost.setAttribute('points', el.tri.getAttribute('points'));
        el.ghosts.appendChild(ghost);
        while (el.ghosts.children.length > MAX_COPIES) el.ghosts.removeChild(el.ghosts.firstChild);
        svg.classList.add('used');
    });

    $('drag-reset').addEventListener('click', () => {
        while (el.ghosts.firstChild) el.ghosts.removeChild(el.ghosts.firstChild);
        x = START_CM;
        render();
    });

    layoutHandle();
    if ('ResizeObserver' in window) new ResizeObserver(layoutHandle).observe(svg);
    else window.addEventListener('resize', layoutHandle);
    render();
})();
