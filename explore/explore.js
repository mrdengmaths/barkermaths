/*
 * Explore – shared behaviour for activity pages.
 *
 * Markup conventions:
 *   <button data-reveal="panel-id" data-show-label="Show solution">   toggles #panel-id inline
 *   <button data-toggle-class="show-extra" data-target="svg-id">       toggles a class on #svg-id
 *   <article class="question" data-answer="c">                          multiple-choice question
 *       radio inputs (value a-d), .q-check button, .feedback paragraph
 *   svg.diagram                                                        text scales up on small screens
 */
(() => {
    'use strict';

    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    /* ---------- Show / hide solutions ---------- */
    function setReveal(button, open) {
        const panel = document.getElementById(button.dataset.reveal);
        if (!panel) return;

        if (!button.dataset.showLabel) button.dataset.showLabel = button.textContent.trim();
        if (!button.dataset.hideLabel) button.dataset.hideLabel = button.dataset.showLabel.replace(/^Show/, 'Hide');

        panel.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        button.textContent = open ? button.dataset.hideLabel : button.dataset.showLabel;

        // Lets a diagram show extra detail (e.g. the dashed heights) alongside a solution.
        const scope = button.closest('[data-scope]');
        if (scope) scope.classList.toggle('show-extra', open);
    }

    function initReveals() {
        $$('[data-reveal]').forEach((button) => {
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-controls', button.dataset.reveal);
            button.addEventListener('click', () => {
                setReveal(button, button.getAttribute('aria-expanded') !== 'true');
            });
        });
    }

    /* ---------- Toggle a class on a diagram ---------- */
    function initToggles() {
        $$('[data-toggle-class]').forEach((button) => {
            const target = document.getElementById(button.dataset.target);
            if (!target) return;
            button.dataset.showLabel = button.textContent.trim();
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', () => {
                const on = target.classList.toggle(button.dataset.toggleClass);
                button.setAttribute('aria-pressed', String(on));
                button.textContent = on ? button.dataset.hideLabel : button.dataset.showLabel;
            });
        });
    }

    /* ---------- Multiple-choice questions ---------- */
    function initQuestions() {
        $$('.question[data-answer]').forEach((question) => {
            const feedback = $$('.feedback', question)[0];
            const check = $$('.q-check', question)[0];
            if (!feedback || !check) return;

            const radios = $$('input[type="radio"]', question);
            radios.forEach((radio) => radio.addEventListener('change', () => {
                feedback.textContent = '';
                feedback.className = 'feedback';
            }));

            check.addEventListener('click', () => {
                const chosen = radios.find((radio) => radio.checked);
                feedback.className = 'feedback';

                if (!chosen) {
                    feedback.textContent = 'Choose an answer first.';
                } else if (chosen.value === question.dataset.answer) {
                    feedback.classList.add('ok');
                    feedback.textContent = '✓ Correct.';
                } else {
                    feedback.classList.add('try');
                    feedback.textContent = 'Not quite. Have another look.';
                }
            });
        });
    }

    /* ---------- Keep SVG text readable when diagrams shrink ---------- */
    function fitSvgText(svg) {
        const viewBox = svg.viewBox && svg.viewBox.baseVal;
        const width = svg.getBoundingClientRect().width;
        if (!viewBox || !viewBox.width || !width) return;
        const scale = width / viewBox.width;
        // Aim for roughly 11px on screen for a 16-unit label, without letting labels get crowded.
        const k = Math.min(1.8, Math.max(1, 11 / (16 * scale)));
        svg.style.setProperty('--k', k.toFixed(3));
    }

    function initSvgText() {
        const svgs = $$('svg.diagram');
        const refit = () => svgs.forEach(fitSvgText);
        refit();
        if ('ResizeObserver' in window) {
            const observer = new ResizeObserver(refit);
            svgs.forEach((svg) => observer.observe(svg));
        } else {
            window.addEventListener('resize', refit);
        }
    }

    function init() {
        initReveals();
        initToggles();
        initQuestions();
        initSvgText();
    }

    window.Explore = { fitSvgText };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
