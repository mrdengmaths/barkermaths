/* Triangles in Proportions – slider that changes the base of triangle Y. */
(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const slider = $('prop-slider');
    if (!slider) return;

    // 1 cm = 28 SVG units. Triangle X (base 4 cm, height 5 cm) is fixed.
    const SCALE = 28;
    const LINE_Y = 180;
    const TOP_Y = 40;
    const Y_LEFT = 300;
    const X_BASE_CM = 4;
    const HEIGHT_CM = 5;

    const el = {
        tri: $('prop-y-tri'),
        base: $('prop-y-base'),
        label: $('prop-y-label'),
        baseLabel: $('prop-y-blabel'),
        out: $('prop-slider-out'),
        yb: $('prop-yb'),
        ya: $('prop-ya'),
        ratio: $('prop-ratio')
    };

    const trim = (n) => String(Math.round(n * 100) / 100);

    function update() {
        const b = Number(slider.value);
        const width = b * SCALE;
        const apexX = Y_LEFT + 0.3 * width;

        el.tri.setAttribute('points', `${Y_LEFT},${LINE_Y} ${Y_LEFT + width},${LINE_Y} ${apexX},${TOP_Y}`);
        el.base.setAttribute('x2', Y_LEFT + width);
        el.label.setAttribute('x', (Y_LEFT + Y_LEFT + width + apexX) / 3);
        el.baseLabel.setAttribute('x', Y_LEFT + width / 2);
        el.baseLabel.textContent = `${b} cm`;

        // Areas come from the drawn coordinates, not from the formula.
        const areaX = 0.5 * (X_BASE_CM * SCALE) * ((LINE_Y - TOP_Y)) / (SCALE * SCALE);
        const areaY = 0.5 * width * (LINE_Y - TOP_Y) / (SCALE * SCALE);
        const n = areaY / areaX;

        el.out.textContent = `${b} cm`;
        el.yb.textContent = `${b} cm`;
        el.ya.textContent = `${trim(areaY)} cm²`;
        el.ratio.textContent = n === 1
            ? 'The bases are equal, so the areas are equal.'
            : `The base of Y is ${trim(n)} times the base of X, so the area of Y is ${trim(n)} times the area of X.`;
    }

    slider.addEventListener('input', update);
    update();
})();
