/*
 * Explore landing page – filter investigations by tag.
 * Tags come from each card's data-topics attribute (comma separated).
 */
(() => {
    'use strict';

    const filtersEl = document.getElementById('activityFilters');
    const statusEl = document.getElementById('activityStatus');
    const listEl = document.getElementById('activityGrid');
    if (!filtersEl || !statusEl || !listEl) return;

    const label = (tag) => tag.charAt(0).toUpperCase() + tag.slice(1);

    const items = Array.from(listEl.children).map((item) => {
        const card = item.querySelector('[data-topics]');
        const tags = card
            ? card.dataset.topics.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
            : [];
        return { item, tags };
    });

    const tags = [...new Set(items.flatMap((entry) => entry.tags))].sort();
    let activeTag = 'all';

    function updateStatus() {
        const visible = items.filter((entry) => !entry.item.hidden).length;
        const noun = visible === 1 ? 'investigation' : 'investigations';
        statusEl.textContent = activeTag === 'all'
            ? `${visible} ${noun}`
            : `${visible} ${noun} tagged ${label(activeTag)}`;
    }

    function applyFilter(tag) {
        activeTag = tag;
        items.forEach((entry) => {
            entry.item.hidden = tag !== 'all' && !entry.tags.includes(tag);
        });
        filtersEl.querySelectorAll('button').forEach((btn) => {
            btn.setAttribute('aria-pressed', String(btn.dataset.tag === tag));
        });
        updateStatus();
    }

    if (tags.length > 1) {
        [['all', 'All'], ...tags.map((tag) => [tag, label(tag)])].forEach(([value, text]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filter-btn';
            btn.textContent = text;
            btn.dataset.tag = value;
            btn.setAttribute('aria-pressed', 'false');
            btn.addEventListener('click', () => applyFilter(value));
            filtersEl.appendChild(btn);
        });
        filtersEl.hidden = false;
    }

    applyFilter('all');
})();
