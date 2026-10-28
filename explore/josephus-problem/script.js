/* Josephus problem – circle simulator, pattern table and shortcut readout. */
(() => {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const CX = 260;
    const CY = 260;
    const RING = 205;

    const $ = (id) => document.getElementById(id);

    const el = {
        people: $('jos-people'),
        count: $('jos-count'),
        countLabel: $('jos-count-label'),
        n: $('jos-n'),
        nOut: $('jos-n-out'),
        k: $('jos-k'),
        kOut: $('jos-k-out'),
        speed: $('jos-speed'),
        speedOut: $('jos-speed-out'),
        guess: $('jos-guess'),
        play: $('jos-play'),
        step: $('jos-step'),
        finish: $('jos-finish'),
        reset: $('jos-reset'),
        preset: $('jos-legend-preset'),
        status: $('jos-status'),
        outList: $('jos-out'),
        outEmpty: $('jos-out-empty'),
        shortcut: $('jos-shortcut-text'),
        rowN: $('jos-row-n'),
        rowJ: $('jos-row-j')
    };

    if (!el.people) return;

    /* ---------- Maths ---------- */

    // Position (1-based) of the survivor, using J(1) = 0 and J(m) = (J(m - 1) + k) mod m.
    function survivorOf(n, k) {
        let j = 0;
        for (let m = 2; m <= n; m++) j = (j + k) % m;
        return j + 1;
    }

    /* ---------- State ---------- */

    const state = {
        n: 10,
        k: 2,
        alive: [],
        aliveCount: 0,
        current: -1,
        count: 0,
        eliminated: [],
        done: false,
        playing: false,
        timer: null,
        nodes: []
    };

    function intervalMs() {
        return Math.round(1200 * Math.pow(0.7, Number(el.speed.value) - 1));
    }

    function speedLabel() {
        const s = Number(el.speed.value);
        if (s <= 3) return 'Slow';
        if (s <= 7) return 'Medium';
        return 'Fast';
    }

    /* ---------- Drawing ---------- */

    function svgEl(name, attrs) {
        const node = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach((key) => node.setAttribute(key, attrs[key]));
        return node;
    }

    function buildCircle() {
        const n = state.n;
        el.people.textContent = '';
        state.nodes = [];

        const spacing = 2 * RING * Math.sin(Math.PI / n);
        const r = Math.min(26, spacing * 0.42);
        const fontSize = Math.min(18, r * 0.95);

        for (let i = 0; i < n; i++) {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
            const x = CX + RING * Math.cos(angle);
            const y = CY + RING * Math.sin(angle);

            const group = svgEl('g', { class: 'person' });
            group.appendChild(svgEl('circle', { class: 'person-disc', cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1) }));

            const label = svgEl('text', {
                class: 'person-num',
                x: x.toFixed(1),
                y: (y + fontSize * 0.35).toFixed(1),
                'text-anchor': 'middle',
                'font-size': fontSize.toFixed(1)
            });
            label.textContent = String(i + 1);
            group.appendChild(label);

            const d = r * 0.6;
            group.appendChild(svgEl('path', {
                class: 'person-cross',
                d: `M${(x - d).toFixed(1)} ${(y - d).toFixed(1)}L${(x + d).toFixed(1)} ${(y + d).toFixed(1)}M${(x + d).toFixed(1)} ${(y - d).toFixed(1)}L${(x - d).toFixed(1)} ${(y + d).toFixed(1)}`
            }));

            const starR = RING + r + 14;
            const star = svgEl('text', {
                class: 'person-star',
                x: (CX + starR * Math.cos(angle)).toFixed(1),
                y: (CY + starR * Math.sin(angle) + 7).toFixed(1),
                'text-anchor': 'middle'
            });
            star.textContent = '★';
            group.appendChild(star);

            el.people.appendChild(group);
            state.nodes.push(group);
        }
    }

    function setCentre(big, small) {
        el.count.textContent = big;
        el.countLabel.textContent = small;
    }

    /* ---------- Simulation ---------- */

    function setStatus(html) {
        el.status.innerHTML = html;
    }

    function updateOutList() {
        el.outList.textContent = '';
        state.eliminated.forEach((person) => {
            const li = document.createElement('li');
            li.textContent = String(person);
            el.outList.appendChild(li);
        });
        el.outEmpty.hidden = state.eliminated.length > 0;
    }

    function updatePlayButton() {
        el.play.textContent = state.playing ? '⏸ Pause' : (state.done ? '↻ Play again' : '▶ Play');
    }

    function stop() {
        state.playing = false;
        if (state.timer !== null) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        updatePlayButton();
    }

    function reset() {
        stop();
        state.n = Number(el.n.value);
        state.k = Number(el.k.value);
        state.alive = new Array(state.n).fill(true);
        state.aliveCount = state.n;
        state.current = state.n - 1; // counting begins at person 1
        state.count = 0;
        state.eliminated = [];
        state.done = false;

        buildCircle();
        updateOutList();
        setCentre('', '');
        setStatus('Press <strong>Play</strong> or <strong>Step</strong> to begin.');
        el.guess.max = String(state.n);
        updatePlayButton();
        updateShortcut();
    }

    function nextAlive(from) {
        let i = from;
        do {
            i = (i + 1) % state.n;
        } while (!state.alive[i]);
        return i;
    }

    function finishRun() {
        const winner = state.alive.indexOf(true);
        state.done = true;
        state.current = -1;
        state.nodes.forEach((node) => node.classList.remove('current'));
        state.nodes[winner].classList.add('survivor');
        setCentre('★', `Person ${winner + 1} survives`);

        let message = `<strong>Person ${winner + 1}</strong> is the survivor.`;
        const guess = Number(el.guess.value);
        if (el.guess.value !== '' && Number.isInteger(guess)) {
            message += guess === winner + 1
                ? ` Your prediction of ${guess} was correct.`
                : ` You predicted ${guess}.`;
        }
        setStatus(message);
        stop();
    }

    // One count: the next person in the circle says the next number. Returns true if that person was eliminated.
    function tick() {
        if (state.done) return false;

        const prev = state.current;
        if (state.nodes[prev]) state.nodes[prev].classList.remove('current');

        state.current = nextAlive(prev);
        state.count += 1;
        const person = state.current + 1;
        const node = state.nodes[state.current];

        if (state.count < state.k) {
            node.classList.add('current');
            setCentre(String(state.count), `Person ${person} says “${state.count}”`);
            return false;
        }

        state.alive[state.current] = false;
        state.aliveCount -= 1;
        state.eliminated.push(person);
        state.count = 0;
        node.classList.add('out');
        updateOutList();

        if (state.aliveCount === 1) {
            setCentre(String(state.k), `Person ${person} is out`);
            finishRun();
        } else {
            node.classList.add('current');
            setCentre(String(state.k), `Person ${person} is out`);
            setStatus(`Person <strong>${person}</strong> is out. ${state.aliveCount} left in the circle.`);
        }
        return true;
    }

    function schedule() {
        state.timer = setTimeout(() => {
            state.timer = null;
            if (!state.playing) return;
            tick();
            if (state.playing && !state.done) schedule();
        }, intervalMs());
    }

    function play() {
        if (state.playing) {
            stop();
            return;
        }
        if (state.done) reset();
        state.playing = true;
        updatePlayButton();
        schedule();
    }

    function stepOnce() {
        if (state.playing) stop();
        if (state.done) reset();
        tick();
    }

    function skipToEnd() {
        stop();
        if (state.done) reset();
        let guard = state.n * state.k + 10;
        while (!state.done && guard-- > 0) tick();
    }

    /* ---------- Shortcut readout and table ---------- */

    function updateShortcut() {
        if (state.k !== 2) {
            el.shortcut.textContent = 'The 2L + 1 rule is for k = 2. Set k back to 2 to see it for this many people.';
            return;
        }
        const n = state.n;
        let power = 1;
        while (power * 2 <= n) power *= 2;
        const extra = n - power;
        el.shortcut.innerHTML = `n = ${n} = ${power} + ${extra}, so L = ${extra}.<br>Survivor = 2 × ${extra} + 1 = <strong>${2 * extra + 1}</strong>.`;
    }

    function buildTable() {
        for (let n = 1; n <= 32; n++) {
            const isPower = (n & (n - 1)) === 0;
            const head = document.createElement('td');
            head.textContent = String(n);
            const value = document.createElement('td');
            value.textContent = String(survivorOf(n, 2));
            if (isPower) {
                head.className = 'pow';
                value.className = 'pow';
            }
            el.rowN.appendChild(head);
            el.rowJ.appendChild(value);
        }
    }

    /* ---------- Wiring ---------- */

    function onSizeChange() {
        el.nOut.textContent = el.n.value;
        el.kOut.textContent = el.k.value;
        reset();
    }

    el.n.addEventListener('input', onSizeChange);
    el.k.addEventListener('input', onSizeChange);
    el.speed.addEventListener('input', () => { el.speedOut.textContent = speedLabel(); });
    el.play.addEventListener('click', play);
    el.step.addEventListener('click', stepOnce);
    el.finish.addEventListener('click', skipToEnd);
    el.reset.addEventListener('click', reset);
    el.preset.addEventListener('click', () => {
        el.n.value = '41';
        el.k.value = '3';
        onSizeChange();
    });

    el.speedOut.textContent = speedLabel();
    el.nOut.textContent = el.n.value;
    el.kOut.textContent = el.k.value;
    buildTable();
    reset();
})();
