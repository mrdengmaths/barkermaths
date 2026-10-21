(() => {
    const videos = (Array.isArray(window.BARKER_VIDEOS) ? window.BARKER_VIDEOS : [])
        .slice()
        .sort((a, b) =>
            (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0) ||
            (a.order ?? 9999) - (b.order ?? 9999) ||
            String(a.title).localeCompare(String(b.title))
        );

    const filtersEl = document.getElementById('videoFilters');
    const gridEl = document.getElementById('videoGrid');
    const statusEl = document.getElementById('videoStatus');
    const emptyEl = document.getElementById('videoEmpty');

    const viewer = document.getElementById('viewer');
    const viewerVideo = document.getElementById('viewerVideo');
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerBadge = document.getElementById('viewerBadge');
    const viewerDesc = document.getElementById('viewerDesc');
    const viewerError = document.getElementById('viewerError');
    const viewerClose = document.getElementById('viewerClose');

    const svgNS = 'http://www.w3.org/2000/svg';
    let lastTrigger = null;

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };

    const yearLabel = (video) => `Year ${video.year}`;

    const formatDuration = (value) => {
        if (value === undefined || value === null || value === '') return '';
        if (typeof value === 'number') {
            const total = Math.round(value);
            return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
        }
        return String(value);
    };

    const playIcon = () => {
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', 'M8 5.5v13a1 1 0 0 0 1.52.85l10.4-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5z');
        svg.appendChild(path);
        return svg;
    };

    const buildCard = (video) => {
        const item = el('li', 'video-item');
        item.dataset.year = String(video.year);

        const card = el('article', 'video-card');

        const thumb = el('div', 'video-thumb');
        if (video.poster) {
            const img = el('img', 'video-thumb__img');
            img.src = video.poster;
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            thumb.appendChild(img);
        } else {
            thumb.classList.add('video-thumb--placeholder');
            thumb.appendChild(el('span', 'video-thumb__topic', video.topic));
        }
        const play = el('span', 'video-thumb__play');
        play.appendChild(playIcon());
        thumb.appendChild(play);
        const duration = formatDuration(video.duration);
        if (duration) thumb.appendChild(el('span', 'video-thumb__duration', duration));

        const body = el('div', 'video-body');
        const meta = el('div', 'video-meta');
        meta.appendChild(el('span', 'year-badge', yearLabel(video)));
        meta.appendChild(el('span', 'video-topic', video.topic));
        const heading = el('h3', 'video-title');
        const button = el('button', 'video-open', video.title);
        button.type = 'button';
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-label', `Play video: ${video.title} (${yearLabel(video)})`);
        button.addEventListener('click', () => openViewer(video, button));
        heading.appendChild(button);
        body.append(meta, heading, el('p', 'video-desc', video.description));

        card.append(thumb, body);
        item.appendChild(card);
        return item;
    };

    const items = videos.map((video) => {
        const item = buildCard(video);
        gridEl.appendChild(item);
        return item;
    });

    // Filters
    const years = [...new Set(videos.map((v) => v.year))]
        .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
    let activeYear = 'all';

    const updateStatus = () => {
        const visible = items.filter((item) => !item.hidden).length;
        const noun = visible === 1 ? 'video' : 'videos';
        statusEl.textContent = activeYear === 'all'
            ? `${visible} ${noun}`
            : `${visible} ${noun} for Year ${activeYear}`;
    };

    const applyFilter = (year) => {
        activeYear = year;
        items.forEach((item) => {
            item.hidden = year !== 'all' && item.dataset.year !== String(year);
        });
        filtersEl.querySelectorAll('button').forEach((btn) => {
            btn.setAttribute('aria-pressed', String(btn.dataset.year === String(year)));
        });
        updateStatus();
    };

    if (years.length > 1) {
        [['all', 'All'], ...years.map((y) => [String(y), `Year ${y}`])].forEach(([value, label]) => {
            const btn = el('button', 'filter-btn', label);
            btn.type = 'button';
            btn.dataset.year = value;
            btn.setAttribute('aria-pressed', 'false');
            btn.addEventListener('click', () => applyFilter(value));
            filtersEl.appendChild(btn);
        });
        filtersEl.hidden = false;
    }

    if (!videos.length) {
        emptyEl.hidden = false;
        statusEl.hidden = true;
    } else {
        applyFilter('all');
    }

    // Viewer: the MP4 is only requested when a student opens it.
    function openViewer(video, trigger) {
        const src = video.video;
        if (typeof viewer.showModal !== 'function') {
            window.location.href = src;
            return;
        }
        lastTrigger = trigger;
        viewerTitle.textContent = video.title;
        viewerBadge.textContent = yearLabel(video);
        viewerDesc.textContent = video.description;
        viewerError.hidden = true;
        viewerVideo.hidden = false;
        if (video.poster) viewerVideo.poster = video.poster; else viewerVideo.removeAttribute('poster');
        viewerVideo.src = src;
        viewerVideo.load();
        document.documentElement.classList.add('viewer-open');
        viewer.showModal();
        viewerVideo.focus({ preventScroll: true });
    }

    viewerVideo.addEventListener('error', () => {
        if (!viewerVideo.getAttribute('src')) return;
        viewerVideo.hidden = true;
        viewerError.hidden = false;
    });

    viewer.addEventListener('close', () => {
        viewerVideo.pause();
        viewerVideo.removeAttribute('src');
        viewerVideo.removeAttribute('poster');
        viewerVideo.load();
        document.documentElement.classList.remove('viewer-open');
        if (lastTrigger) lastTrigger.focus();
    });

    viewerClose.addEventListener('click', () => viewer.close());

    // Explicit Escape handling so it also works while the video itself has focus.
    viewer.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.fullscreenElement) {
            event.preventDefault();
            viewer.close();
        }
    });

    // Clicking the dimmed area outside the panel closes the viewer.
    viewer.addEventListener('click', (event) => {
        if (event.target === viewer) viewer.close();
    });
})();
