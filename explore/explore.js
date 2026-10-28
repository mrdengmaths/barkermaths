/*
 * Explore – shared behaviour for investigation pages.
 *
 * Markup conventions (see /explore/same-base-same-height/index.html):
 *   <button data-reveal="panel-id" data-show-label="Show solution">  toggles #panel-id inline
 *   <div data-hints> <button data-hint-btn> + .hint-panel elements       reveals hints one at a time
 *   <button data-mode="student|teacher">                                 Student / Teacher view
 *   .teacher-only                                                         visible in Teacher view only
 *   #teacher-notes (<details>)                                            opened in Teacher view
 *   .steps-nav a[href="#id"]                                              highlights the current step
 *   svg.diagram                                                           text scales up on small screens
 */
(() => {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
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

        const scope = button.closest('[data-scope]');
        if (scope) scope.classList.toggle('solution-open', open);

        document.dispatchEvent(new CustomEvent('explore:reveal', { detail: { button, panel, open } }));
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

    /* ---------- Hints: "Hint" -> "Show another hint" -> "Hide hints" ---------- */
    function applyHintEffect(hint, on) {
        const targetId = hint.dataset.addClassTarget;
        const className = hint.dataset.addClass;
        const target = targetId ? document.getElementById(targetId) : null;
        if (target && className) target.classList.toggle(className, on);
    }

    function initHintGroup(group) {
        const button = $('[data-hint-btn]', group);
        const hints = $$('.hint-panel', group);
        if (!button || !hints.length) return;

        let shown = 0;
        button.setAttribute('aria-expanded', 'false');

        const updateLabel = () => {
            if (shown === 0) button.textContent = 'Hint';
            else if (shown < hints.length) button.textContent = 'Show another hint';
            else button.textContent = hints.length > 1 ? 'Hide hints' : 'Hide hint';
        };

        const reset = () => {
            hints.forEach((hint) => { hint.hidden = true; applyHintEffect(hint, false); });
            shown = 0;
            button.setAttribute('aria-expanded', 'false');
            updateLabel();
        };

        group.exploreResetHints = reset;

        button.addEventListener('click', () => {
            if (shown >= hints.length) {
                reset();
                return;
            }
            hints[shown].hidden = false;
            applyHintEffect(hints[shown], true);
            shown += 1;
            button.setAttribute('aria-expanded', 'true');
            updateLabel();
        });

        updateLabel();
    }

    /* ---------- Student / Teacher view ---------- */
    let teacherOpenedSolutions = false;

    function setAllSolutions(open) {
        $$('[data-reveal]').forEach((button) => setReveal(button, open));
        teacherOpenedSolutions = open;
        const toggle = $('[data-toggle-solutions]');
        if (toggle) toggle.textContent = open ? 'Hide all solutions' : 'Show all solutions';
    }

    function setMode(mode, updateUrl) {
        const teacher = mode === 'teacher';
        document.body.classList.toggle('is-teacher', teacher);
        $$('[data-mode]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
        });

        const notes = document.getElementById('teacher-notes');
        if (notes) notes.open = teacher;

        if (!teacher && teacherOpenedSolutions) setAllSolutions(false);

        if (updateUrl) {
            try {
                const url = new URL(window.location.href);
                if (teacher) url.searchParams.set('teacher', 'true');
                else url.searchParams.delete('teacher');
                window.history.replaceState(null, '', url);
            } catch (error) {
                // Ignore: history API unavailable (e.g. some file:// contexts).
            }
        }
    }

    function initMode() {
        const params = new URLSearchParams(window.location.search);
        const flag = params.get('teacher');
        const startTeacher = params.has('teacher') && flag !== 'false' && flag !== '0';

        $$('[data-mode]').forEach((button) => {
            button.addEventListener('click', () => setMode(button.dataset.mode, true));
        });

        const toggle = $('[data-toggle-solutions]');
        if (toggle) toggle.addEventListener('click', () => setAllSolutions(!teacherOpenedSolutions));

        setMode(startTeacher ? 'teacher' : 'student', false);
    }

    /* ---------- Step navigation highlight ---------- */
    function initStepsNav() {
        const links = $$('.steps-nav a[href^="#"]');
        if (!links.length || !('IntersectionObserver' in window)) return;

        const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                links.forEach((link) => link.removeAttribute('aria-current'));
                const link = byId.get(entry.target.id);
                if (link) link.setAttribute('aria-current', 'step');
            });
        }, { rootMargin: '-30% 0px -60% 0px' });

        byId.forEach((link, id) => {
            const section = document.getElementById(id);
            if (section) observer.observe(section);
        });
    }

    /* ---------- Keep SVG text readable when diagrams shrink ---------- */
    function fitSvgText(svg) {
        const viewBox = svg.viewBox && svg.viewBox.baseVal;
        const width = svg.getBoundingClientRect().width;
        if (!viewBox || !viewBox.width || !width) return;
        const scale = width / viewBox.width;
        // Aim for roughly 11px on screen for a 16-unit label, without letting labels grow too crowded.
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
        $$('[data-hints]').forEach(initHintGroup);
        initMode();
        initStepsNav();
        initSvgText();
    }

    window.Explore = { fitSvgText, setMode };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
