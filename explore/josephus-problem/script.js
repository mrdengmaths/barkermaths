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
        fx: $('jos-fx'),
        count: $('jos-count'),
        countLabel: $('jos-count-label'),
        n: $('jos-n'),
        nOut: $('jos-n-out'),
        speed: $('jos-speed'),
        speedOut: $('jos-speed-out'),
        sound: $('jos-sound'),
        guess: $('jos-guess'),
        play: $('jos-play'),
        step: $('jos-step'),
        finish: $('jos-finish'),
        reset: $('jos-reset'),
        status: $('jos-status'),
        outList: $('jos-out'),
        outEmpty: $('jos-out-empty'),
        shortcut: $('jos-shortcut-text'),
        rowN: $('jos-row-n'),
        rowJ: $('jos-row-j'),
        fast: $('jos-fast'),
        clear: $('jos-clear'),
        tableNote: $('jos-table-note')
    };

    if (!el.people) return;

    /* ---------- State ---------- */

    const state = {
        n: 41,
        alive: [],
        aliveCount: 0,
        swinger: 0,
        eliminated: [],
        done: false,
        playing: false,
        timer: null,
        run: 0,
        nodes: [],
        positions: []
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
        state.positions = [];

        const spacing = n === 1 ? Infinity : 2 * RING * Math.sin(Math.PI / n);
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
            state.positions.push({ x, y });
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
        state.run += 1;
        el.fx.textContent = '';
        state.n = Number(el.n.value);
        state.alive = new Array(state.n).fill(true);
        state.aliveCount = state.n;
        state.swinger = 0; // person 1 swings first
        state.eliminated = [];
        state.done = false;

        buildCircle();
        state.nodes[0].classList.add('current');
        updateOutList();
        setCentre(String(state.n), state.n === 1 ? 'person' : 'people');
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

    function showFinish(winner) {
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
        recordRun(state.n, winner + 1);
    }

    /* ---------- Sword animation and sound ---------- */

    let audioCtx = null;
    let noiseBuffer = null;

    function ensureAudio() {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtx = new Ctx();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSwingSound(durationMs) {
        if (!audioCtx || !el.sound.checked) return;
        const t = audioCtx.currentTime;
        const dur = Math.max(0.12, durationMs / 1000);

        if (!noiseBuffer) {
            noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }

        // Whoosh: noise through a band-pass filter that sweeps upwards, then fades.
        const whoosh = audioCtx.createBufferSource();
        whoosh.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.4;
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(3600, t + dur * 0.62);
        filter.frequency.exponentialRampToValueAtTime(1200, t + dur);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.55, t + dur * 0.55);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        whoosh.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        whoosh.start(t);
        whoosh.stop(t + dur + 0.05);

        // A short metallic ring as the blade lands.
        const hit = t + dur * 0.62;
        const ring = audioCtx.createOscillator();
        ring.type = 'triangle';
        ring.frequency.setValueAtTime(1800, hit);
        ring.frequency.exponentialRampToValueAtTime(1100, hit + 0.18);
        const ringGain = audioCtx.createGain();
        ringGain.gain.setValueAtTime(0.0001, hit);
        ringGain.gain.exponentialRampToValueAtTime(0.18, hit + 0.01);
        ringGain.gain.exponentialRampToValueAtTime(0.0001, hit + 0.2);
        ring.connect(ringGain);
        ringGain.connect(audioCtx.destination);
        ring.start(hit);
        ring.stop(hit + 0.22);
    }

    // A sword drawn pointing along +x, 50 units long, with the hand at the origin.
    function buildSword() {
        const sword = svgEl('g', { class: 'sword' });
        sword.appendChild(svgEl('rect', { class: 'sword-grip', x: -9, y: -2, width: 11, height: 4, rx: 1.5 }));
        sword.appendChild(svgEl('rect', { class: 'sword-guard', x: 2, y: -6.5, width: 3.5, height: 13, rx: 1 }));
        sword.appendChild(svgEl('polygon', { class: 'sword-blade', points: '5.5,-3 42,-3 51,0 42,3 5.5,3' }));
        return sword;
    }

    function swingSword(from, to, durationMs) {
        const a = state.positions[from];
        const b = state.positions[to];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const base = Math.atan2(dy, dx) * 180 / Math.PI;
        const length = Math.max(34, Math.min(80, Math.hypot(dx, dy) * 0.95));

        const holder = svgEl('g', { transform: `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)})` });
        const sword = buildSword();
        holder.appendChild(sword);
        el.fx.appendChild(holder);

        const start = performance.now();
        const scale = length / 50;
        function frame(now) {
            if (!holder.isConnected) return;
            const t = Math.min(1, (now - start) / durationMs);
            const eased = t * t * (3 - 2 * t);
            const angle = base - 85 + 120 * eased;
            sword.setAttribute('transform', `rotate(${angle.toFixed(1)}) scale(${scale.toFixed(3)})`);
            holder.setAttribute('opacity', t > 0.8 ? ((1 - t) / 0.2).toFixed(2) : '1');
            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                holder.remove();
            }
        }
        requestAnimationFrame(frame);
    }

    /* ---------- Simulation steps ---------- */

    // One swing: the person holding the sword strikes the next person on their left, then the sword
    // passes to whoever is next in the circle. durationMs of 0 means no animation.
    function tick(durationMs) {
        if (state.done) return;
        const run = state.run;

        if (state.aliveCount === 1) {
            state.done = true;
            stop();
            showFinish(state.alive.indexOf(true));
            return;
        }

        const swinger = state.swinger;
        const victim = nextAlive(swinger);
        state.alive[victim] = false;
        state.aliveCount -= 1;
        state.eliminated.push(victim + 1);

        const last = state.aliveCount === 1;
        const next = last ? swinger : nextAlive(victim);
        state.swinger = next;
        if (last) {
            state.done = true;
            stop();
        }

        const apply = () => {
            if (run !== state.run) return;
            state.nodes[swinger].classList.remove('current');
            state.nodes[victim].classList.add('out');
            updateOutList();
            if (last) {
                showFinish(swinger);
                return;
            }
            state.nodes[next].classList.add('current');
            setCentre(String(state.aliveCount), 'left');
            setStatus(`Person <strong>${swinger + 1}</strong> struck down person <strong>${victim + 1}</strong>. ${state.aliveCount} left in the circle.`);
        };

        if (durationMs >= 90) {
            swingSword(swinger, victim, durationMs);
            playSwingSound(durationMs);
            setTimeout(apply, durationMs * 0.62);
        } else {
            apply();
        }
    }

    function schedule() {
        state.timer = setTimeout(() => {
            state.timer = null;
            if (!state.playing) return;
            tick(Math.min(450, intervalMs() * 0.85));
            if (state.playing && !state.done) schedule();
        }, intervalMs());
    }

    function play() {
        ensureAudio();
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
        ensureAudio();
        if (state.playing) stop();
        if (state.done) reset();
        tick(450);
    }

    function skipToEnd() {
        stop();
        if (state.done) reset();
        let guard = state.n + 5;
        while (!state.done && guard-- > 0) tick(0);
    }

    /* ---------- Shortcut readout and table ---------- */

    function updateShortcut() {
        const n = state.n;
        let power = 1;
        while (power * 2 <= n) power *= 2;
        const extra = n - power;
        el.shortcut.innerHTML = `n = ${n} = ${power} + ${extra}, so L = ${extra}.<br>Survivor = 2 × ${extra} + 1 = <strong>${2 * extra + 1}</strong>.`;
    }

    const TABLE_MAX = 50;
    const tableCells = [];

    function buildTable() {
        for (let n = 1; n <= TABLE_MAX; n++) {
            const head = document.createElement('td');
            head.textContent = String(n);
            const value = document.createElement('td');
            el.rowN.appendChild(head);
            el.rowJ.appendChild(value);
            tableCells[n] = { head, value };
        }
    }

    function fillCell(n, survivor) {
        const cell = tableCells[n];
        if (!cell) return;
        cell.value.textContent = String(survivor);
        const isPower = (n & (n - 1)) === 0;
        cell.head.classList.toggle('pow', isPower);
        cell.value.classList.toggle('pow', isPower);
    }

    function filledCount() {
        return tableCells.filter((cell) => cell && cell.value.textContent !== '').length;
    }

    function setTableNote(text) {
        el.tableNote.textContent = text;
    }

    // Plays out the whole circle by actually eliminating every second person, with no animation.
    function simulateInstantly(n) {
        const circle = Array.from({ length: n }, (_, i) => i + 1);
        let index = 0;
        while (circle.length > 1) {
            index = (index + 1) % circle.length;
            circle.splice(index, 1);
        }
        return circle[0];
    }

    function fillTableFast() {
        for (let n = 1; n <= TABLE_MAX; n++) fillCell(n, simulateInstantly(n));
        setTableNote(`Filled n = 1 to ${TABLE_MAX}.`);
    }

    function clearTable() {
        for (let n = 1; n <= TABLE_MAX; n++) {
            const cell = tableCells[n];
            cell.value.textContent = '';
            cell.head.classList.remove('pow');
            cell.value.classList.remove('pow');
        }
        setTableNote('');
    }

    function recordRun(n, survivor) {
        fillCell(n, survivor);
        setTableNote(`Added n = ${n}. ${filledCount()} of ${TABLE_MAX} entries filled.`);
    }

    /* ---------- Wiring ---------- */

    function onSizeChange() {
        el.nOut.textContent = el.n.value;
        reset();
    }

    el.n.addEventListener('input', onSizeChange);
    el.speed.addEventListener('input', () => { el.speedOut.textContent = speedLabel(); });
    el.play.addEventListener('click', play);
    el.step.addEventListener('click', stepOnce);
    el.finish.addEventListener('click', skipToEnd);
    el.reset.addEventListener('click', reset);
    el.fast.addEventListener('click', fillTableFast);
    el.clear.addEventListener('click', clearTable);

    el.speedOut.textContent = speedLabel();
    el.nOut.textContent = el.n.value;
    buildTable();
    reset();
})();
