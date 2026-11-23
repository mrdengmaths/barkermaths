const { useState, useRef, useEffect } = React;

// --- Constants ---
const T_MAX = 30;            // seconds per run
const MIN_TURNS = 3;
const MAX_TURNS = 7;
const W = 800, H = 480;
const M = { top: 25, right: 30, bottom: 55, left: 65 };
const GW = W - M.left - M.right;
const GH = H - M.top - M.bottom;
const COUNTDOWN = 3;
const SAMPLE = 0.05;         // record a point every 0.05 s
const REPLAY_SPEED = 5;      // replay runs 5x faster than real time

// --- Helpers ---
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

const distAt = (data, t) => {
  if (!data || data.length === 0) return null;
  if (t <= data[0].time) return data[0].distance;
  const last = data[data.length - 1];
  if (t >= last.time) return last.distance;
  const i = d3.bisectLeft(data.map(d => d.time), t);
  const p0 = data[i - 1], p1 = data[i];
  if (p1.time === p0.time) return p1.distance;
  return p0.distance + ((t - p0.time) / (p1.time - p0.time)) * (p1.distance - p0.distance);
};

const direction = (speed, still) =>
  speed > still ? 'away' : speed < -still ? 'towards' : 'still';

const DIR = {
  away:    { icon: '►',  text: 'Move away from Home' },
  towards: { icon: '◄',  text: 'Move towards Home' },
  still:   { icon: '❚❚', text: 'Stay still' },
};

const describeSegment = (a, b) => {
  const speed = (b.distance - a.distance) / (b.time - a.time);
  const s = Math.abs(speed).toFixed(1);
  if (speed > 0.01) return `${a.time}–${b.time} s: positive gradient. Moving away from Home at ${s} m/s.`;
  if (speed < -0.01) return `${a.time}–${b.time} s: negative gradient. Moving towards Home at ${s} m/s.`;
  return `${a.time}–${b.time} s: zero gradient. Standing still at ${b.distance} m.`;
};

// Random target graph: starts at Home, times on 0.5 s steps, whole-metre distances,
// at least one "stay still" section and no impossibly steep sections.
const makeTarget = () => {
  const maxD = Math.round(rand(50, 150) / 10) * 10;
  const n = Math.floor(rand(MIN_TURNS + 1, MAX_TURNS + 2)); // number of sections
  const w = Array.from({ length: n }, () => rand(0.6, 1.4));
  const total = w.reduce((a, b) => a + b, 0);
  const times = [0];
  let acc = 0;
  for (let i = 0; i < n - 1; i++) { acc += w[i]; times.push(Math.round((acc / total) * T_MAX * 2) / 2); }
  times.push(T_MAX);

  const stillIdx = Math.floor(rand(1, n));      // never the first section
  const maxSpeed = maxD / 4;                    // cross the whole bar in no less than 4 s
  const pts = [{ time: 0, distance: 0 }];
  for (let i = 1; i <= n; i++) {
    const prev = pts[i - 1].distance;
    const dt = times[i] - times[i - 1];
    let d;
    if (i - 1 === stillIdx) d = prev;
    else {
      const reach = Math.min(maxD, dt * maxSpeed);
      let tries = 0;
      do { d = clamp(prev + rand(-reach, reach), 0, maxD); tries++; }
      while (Math.abs(d - prev) < 0.15 * maxD && tries < 20);
      d = Math.round(d);
    }
    pts.push({ time: times[i], distance: d });
  }
  return { points: pts, maxD };
};

// Compare the run with the target
const analyse = (target, user, maxD) => {
  const end = Math.min(user[user.length - 1].time, T_MAX);
  let sq = 0, abs = 0, count = 0;
  for (let t = 0; t <= end + 1e-9; t += 0.1) {
    const diff = distAt(user, t) - distAt(target, t);
    sq += diff * diff; abs += Math.abs(diff); count++;
  }
  const rms = Math.sqrt(sq / count);
  const score = Math.round(Math.max(0, 100 * (1 - (rms / maxD) * 1.5)));

  const still = maxD * 0.015;
  const sections = [];
  for (let i = 0; i < target.length - 1; i++) {
    const a = target[i], b = target[i + 1];
    const dt = b.time - a.time;
    const tSpeed = (b.distance - a.distance) / dt;
    const uSpeed = (distAt(user, b.time) - distAt(user, a.time)) / dt;
    let gap = 0, k = 0;
    for (let t = a.time; t <= b.time; t += 0.1) { gap += distAt(user, t) - distAt(target, t); k++; }
    sections.push({
      a, b,
      target: direction(tSpeed, 0.01),
      user: direction(uSpeed, still),
      gap: gap / k,
    });
  }
  sections.forEach(s => { s.match = s.target === s.user; });

  const worst = sections.reduce((w, s) => (Math.abs(s.gap) > Math.abs(w.gap) ? s : w), sections[0]);
  let tip = '';
  if (Math.abs(worst.gap) > maxD * 0.05) {
    tip = `Biggest gap: ${worst.a.time}–${worst.b.time} s. You were about ${Math.round(Math.abs(worst.gap))} m ` +
          `${worst.gap > 0 ? 'further from' : 'closer to'} Home than the target.`;
  }

  const feedback =
    score >= 95 ? 'Incredible! A perfect match!' :
    score >= 85 ? 'Excellent trace!' :
    score >= 70 ? 'Great job! Very close!' :
    score >= 50 ? 'Good effort! Keep practising!' :
                  'Keep practising to improve your score!';

  return {
    score, feedback, tip, sections,
    avgGap: (abs / count).toFixed(1),
    matched: sections.filter(s => s.match).length,
    userFinal: user[user.length - 1].distance.toFixed(1),
    targetFinal: target[target.length - 1].distance.toFixed(1),
    userFar: Math.max(...user.map(p => p.distance)).toFixed(1),
    targetFar: Math.max(...target.map(p => p.distance)).toFixed(1),
  };
};

// --- App ---
const App = () => {
  const [phase, setPhase] = useState('idle'); // idle | countdown | recording | analysis
  const [{ points: target, maxD }, setGraph] = useState(makeTarget);
  const [user, setUser] = useState([]);
  const [pos, setPos] = useState(0);           // current car position (m)
  const [time, setTime] = useState(0);
  const [count, setCount] = useState(COUNTDOWN);
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(() => Number(localStorage.getItem('bestScore')) || 0);
  const [newBest, setNewBest] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [guide, setGuide] = useState(() => localStorage.getItem('showGuide') === '1');
  const [help, setHelp] = useState(() => !localStorage.getItem('seenHelp'));

  const svgRef = useRef(null);
  const barRef = useRef(null);
  const posRef = useRef(0);
  const bestRef = useRef(best);

  const busy = phase === 'countdown' || phase === 'recording';
  const fmt = (v) => (Number.isInteger(v) ? v : v.toFixed(1));

  // --- Actions ---
  const start = () => {
    setTooltip(null); setReplaying(false); setResult(null); setNewBest(false);
    setUser([]); setTime(0); setTimeline(0);
    setCount(COUNTDOWN); setPhase('countdown');
  };
  const stop = () => { setPhase('idle'); setUser([]); setTime(0); };
  const newGraph = () => {
    setGraph(makeTarget()); setPhase('idle'); setUser([]); setResult(null);
    setTime(0); setTimeline(0); setReplaying(false); setTooltip(null);
  };
  const closeHelp = () => { setHelp(false); localStorage.setItem('seenHelp', '1'); };
  const toggleGuide = () => setGuide(g => { localStorage.setItem('showGuide', g ? '0' : '1'); return !g; });

  // --- Pointer tracking (mouse, pen or touch) while getting ready / recording ---
  const moveTo = (clientX) => {
    if (!barRef.current) return;
    const r = barRef.current.getBoundingClientRect();
    const d = (clamp(clientX - r.left, 0, r.width) / r.width) * maxD;
    posRef.current = d; setPos(d);
  };
  useEffect(() => {
    if (!busy) return;
    const onMove = (e) => moveTo(e.clientX);
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [busy, maxD]);

  // --- Countdown ---
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) { setPhase('recording'); return; }
    const id = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, count]);

  // --- Recording loop ---
  useEffect(() => {
    if (phase !== 'recording') return;
    const t0 = performance.now();
    const data = [{ time: 0, distance: posRef.current }];
    let raf;
    const tick = () => {
      const t = Math.min((performance.now() - t0) / 1000, T_MAX);
      if (t - data[data.length - 1].time >= SAMPLE || t === T_MAX) data.push({ time: t, distance: posRef.current });
      setTime(t); setUser(data.slice());
      if (t >= T_MAX) {
        const res = analyse(target, data, maxD);
        setResult(res);
        if (res.score > bestRef.current) {
          bestRef.current = res.score; setBest(res.score); setNewBest(true);
          localStorage.setItem('bestScore', res.score);
        }
        setTimeline(0);
        setPhase('analysis');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, target, maxD]);

  // --- Replay ---
  useEffect(() => {
    if (!replaying) return;
    let raf, last = performance.now();
    const step = (now) => {
      const dt = ((now - last) / 1000) * REPLAY_SPEED; last = now;
      setTimeline(v => Math.min(T_MAX, v + dt));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [replaying]);
  useEffect(() => { if (replaying && timeline >= T_MAX) setReplaying(false); }, [timeline, replaying]);

  const toggleReplay = () => {
    if (replaying) { setReplaying(false); return; }
    if (timeline >= T_MAX - 0.05) setTimeline(0);
    setReplaying(true);
  };

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' && /text|number|search/.test(e.target.type)) return;
      if (help) { if (e.key === 'Escape' || e.key === 'Enter') closeHelp(); return; }
      if (e.code === 'Space') { e.preventDefault(); if (!busy) start(); }
      else if (e.key === 'Escape' && busy) stop();
      else if ((e.key === 'n' || e.key === 'N') && !busy) newGraph();
      else if (e.key === 'h' || e.key === 'H' || e.key === '?') setHelp(true);
      else if ((e.key === 'r' || e.key === 'R') && phase === 'analysis') toggleReplay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // --- Scrub the timeline by hovering / dragging on the graph after a run ---
  const scrub = (e) => {
    if (phase !== 'analysis' || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W - M.left;
    if (x < 0 || x > GW) return;
    setReplaying(false);
    setTimeline(Math.round((x / GW) * T_MAX * 10) / 10);
  };

  // --- Draw graph ---
  let activeIdx = -1;
  if (phase === 'recording') {
    activeIdx = target.findIndex((p, i) => i < target.length - 1 && time >= p.time && time < target[i + 1].time);
    if (activeIdx < 0) activeIdx = target.length - 2;
  }
  const currentDir = activeIdx >= 0
    ? direction((target[activeIdx + 1].distance - target[activeIdx].distance), 0.01)
    : null;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const x = d3.scaleLinear().domain([0, T_MAX]).range([0, GW]);
    const y = d3.scaleLinear().domain([0, maxD]).range([GH, 0]);
    const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

    // Grid
    g.append('g').attr('class', 'grid').attr('transform', `translate(0,${GH})`)
      .call(d3.axisBottom(x).ticks(T_MAX / 2).tickSize(-GH).tickFormat(''));
    g.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(maxD / 10).tickSize(-GW).tickFormat(''));

    // Axes
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${GH})`).call(d3.axisBottom(x).ticks(T_MAX / 5))
      .append('text').attr('fill', 'currentColor').attr('x', GW / 2).attr('y', 42)
      .attr('text-anchor', 'middle').attr('class', 'axis-label').text('Time (s)');
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(maxD / 10))
      .append('text').attr('fill', 'currentColor').attr('transform', 'rotate(-90)')
      .attr('x', -GH / 2).attr('y', -48).attr('text-anchor', 'middle').attr('class', 'axis-label').text('Distance from Home (m)');

    const line = d3.line().x(d => x(d.time)).y(d => y(d.distance));

    // Gap between your line and the target
    if (phase === 'analysis' && user.length > 1) {
      const ts = Array.from(new Set([...target.map(p => p.time), ...user.map(p => p.time)])).sort((a, b) => a - b);
      const area = d3.area().x(d => x(d)).y0(d => y(distAt(target, d))).y1(d => y(distAt(user, d)));
      g.append('path').datum(ts).attr('fill', 'rgba(244,63,94,0.18)').attr('d', area);
    }

    // Target
    g.append('path').datum(target).attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round').attr('d', line);
    if (activeIdx >= 0) {
      g.append('path').datum([target[activeIdx], target[activeIdx + 1]]).attr('fill', 'none')
        .attr('stroke', '#1d4ed8').attr('stroke-width', 6).attr('stroke-linecap', 'round').attr('d', line);
    }
    g.selectAll('.pt').data(target).enter().append('circle')
      .attr('cx', d => x(d.time)).attr('cy', d => y(d.distance)).attr('r', 4).attr('fill', '#1d4ed8');

    // Your line
    if (user.length > 1) {
      g.append('path').datum(user).attr('fill', 'none').attr('stroke', '#e11d48').attr('stroke-width', 2.5)
        .attr('stroke-linejoin', 'round').attr('d', line);
    }

    // "Now" line while recording
    if (phase === 'recording') {
      g.append('line').attr('x1', x(time)).attr('x2', x(time)).attr('y1', 0).attr('y2', GH)
        .attr('stroke', '#94a3b8').attr('stroke-dasharray', '3 3');
      g.append('circle').attr('cx', x(time)).attr('cy', y(posRef.current)).attr('r', 5).attr('fill', '#e11d48');
    }

    // Timeline marker after a run
    if (phase === 'analysis' && timeline > 0) {
      const tx = x(timeline);
      const td = distAt(target, timeline), ud = distAt(user, timeline);
      g.append('line').attr('x1', tx).attr('x2', tx).attr('y1', 0).attr('y2', GH)
        .attr('stroke', '#7c3aed').attr('stroke-width', 1.5).attr('stroke-dasharray', '4');
      const flip = tx > GW - 110;
      const lx = flip ? tx - 6 : tx + 6, anchor = flip ? 'end' : 'start';
      const uAbove = ud >= td;
      g.append('circle').attr('cx', tx).attr('cy', y(td)).attr('r', 5).attr('fill', '#1d4ed8');
      g.append('circle').attr('cx', tx).attr('cy', y(ud)).attr('r', 5).attr('fill', '#e11d48');
      g.append('text').attr('class', 'marker-label').attr('x', lx).attr('y', y(td) + (uAbove ? 16 : -8))
        .attr('text-anchor', anchor).attr('fill', '#1d4ed8').text(`Target ${td.toFixed(1)} m`);
      g.append('text').attr('class', 'marker-label').attr('x', lx).attr('y', y(ud) + (uAbove ? -8 : 16))
        .attr('text-anchor', anchor).attr('fill', '#e11d48').text(`You ${ud.toFixed(1)} m`);
    }

    // Hover / tap a blue section for its gradient
    if (phase === 'analysis' || phase === 'idle') {
      for (let i = 0; i < target.length - 1; i++) {
        const seg = [target[i], target[i + 1]];
        const show = (e) => setTooltip({ x: e.clientX, y: e.clientY, text: describeSegment(seg[0], seg[1]) });
        g.append('path').datum(seg).attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 16)
          .attr('d', line).style('cursor', 'help')
          .on('mousemove', (a) => show(a && a.clientX != null ? a : d3.event))
          .on('click', (a) => show(a && a.clientX != null ? a : d3.event))
          .on('mouseout', () => setTooltip(null));
      }
    }
  }, [target, user, phase, maxD, timeline, time, activeIdx]);

  // --- Bar markers ---
  const showT = phase === 'analysis' ? timeline : time;
  const youAt = phase === 'analysis' ? distAt(user, timeline) : busy ? pos : null;
  const targetAt = (phase === 'analysis' && timeline > 0) || (busy && guide) ? distAt(target, showT) : null;
  const pct = (d) => `${(d / maxD) * 100}%`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxD));

  const status =
    phase === 'idle' ? 'Study the blue graph, then press Start.' :
    phase === 'countdown' ? 'Get ready: put your car at Home.' :
    phase === 'recording' ? DIR[currentDir].text :
    null;

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-100 text-slate-800 p-2 sm:p-4">
      <header className="w-full max-w-4xl mb-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-sky-700">Distance vs. Time Graph Explorer</h1>
          <p className="text-sm text-slate-600">Match the blue graph by moving your car along the Home–Destination bar.</p>
        </div>
        <div className="text-sm font-semibold text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1 rounded-lg whitespace-nowrap">
          Best: {best}%
        </div>
        <button onClick={() => setHelp(true)} title="How to play (H)"
          className="bg-sky-100 text-sky-700 hover:bg-sky-200 font-bold w-9 h-9 shrink-0 rounded-full border border-sky-200">?</button>
      </header>

      {help && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeHelp}>
          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-3 text-sky-700">How to play</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>Study the <b className="text-blue-600">blue graph</b>. Tap or hover a section to see its speed.</li>
              <li>Press <b className="text-green-600">START</b>. During the countdown, put your car at <b>Home</b>.</li>
              <li>Move your mouse (or drag your finger) left and right along the bar. Your trip draws the <b className="text-rose-600">red line</b>.</li>
              <li>Follow the <b>thick blue section</b> – the bar tells you which way to go.</li>
              <li>The run lasts {T_MAX} seconds. Then check your score, replay the trip, and see where the gap was biggest.</li>
            </ol>
            <p className="mt-4 text-sm text-slate-500">Shortcuts: <kbd>Space</kbd> start · <kbd>Esc</kbd> stop · <kbd>N</kbd> new graph · <kbd>R</kbd> replay</p>
            <button onClick={closeHelp} className="mt-5 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg w-full">Got it!</button>
          </div>
        </div>
      )}

      <main className="w-full max-w-4xl bg-white p-3 sm:p-5 rounded-xl shadow-xl">
        {/* Status / result line */}
        <div className="min-h-[56px] flex items-center justify-center text-center mb-2">
          {phase === 'analysis' && result ? (
            <div className="score-animation">
              <p className="font-semibold">{result.feedback} {newBest && <span className="ml-1 text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full align-middle">NEW BEST</span>}</p>
              <p className="text-2xl font-bold text-sky-600">Similarity: {result.score}%</p>
            </div>
          ) : (
            <p className={`text-lg font-semibold ${phase === 'recording' ? 'text-blue-700' : 'text-slate-600'}`}>
              {phase === 'recording' && <span className="mr-2">{DIR[currentDir].icon}</span>}{status}
            </p>
          )}
        </div>

        {/* Graph */}
        <div className="relative">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onPointerMove={scrub} onPointerDown={scrub}
            className={`w-full h-auto border border-slate-200 rounded-lg bg-slate-50 ${phase === 'analysis' ? 'cursor-crosshair touch-none' : ''}`} />
          {phase === 'recording' && (
            <div className="absolute top-2 right-2 font-mono text-lg text-rose-600 bg-white/85 px-2 py-0.5 rounded-md shadow">
              {time.toFixed(1)} / {T_MAX}s
            </div>
          )}
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg pointer-events-none">
              <div key={count} className="text-8xl font-bold text-sky-700 animate-pingOnce">{count}</div>
            </div>
          )}
          {phase === 'recording' && time < 0.7 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-7xl font-bold text-green-600 animate-pingOnce">GO!</div>
            </div>
          )}
          {phase === 'recording' && (
            <div className="absolute left-0 bottom-0 h-1 bg-rose-500 rounded-b-lg" style={{ width: `${(time / T_MAX) * 100}%` }} />
          )}
        </div>

        {tooltip && (
          <div className="fixed bg-slate-800 text-white text-xs p-2 rounded-md shadow-lg pointer-events-none z-50"
            style={{ left: Math.min(tooltip.x + 14, window.innerWidth - 230), top: tooltip.y + 14, maxWidth: 220 }}>
            {tooltip.text}
          </div>
        )}

        {/* After a run: timeline, replay and breakdown */}
        {phase === 'analysis' && result && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <button onClick={toggleReplay} title="Replay (R)"
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-1.5 px-3 rounded-lg text-sm whitespace-nowrap w-24">
                {replaying ? '❚❚ Pause' : '► Replay'}
              </button>
              <input type="range" min="0" max={T_MAX} step="0.1" value={timeline}
                onChange={e => { setReplaying(false); setTimeline(parseFloat(e.target.value)); }}
                className="flex-1 accent-violet-600 cursor-pointer" aria-label="Timeline" />
              <span className="font-mono text-sm w-14 text-right">{timeline.toFixed(1)}s</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="grid grid-cols-3 gap-y-1">
                  <span className="text-slate-500"></span>
                  <span className="font-semibold text-rose-600 text-center">You</span>
                  <span className="font-semibold text-blue-600 text-center">Target</span>
                  <span className="text-slate-600">Furthest</span>
                  <span className="text-center">{result.userFar} m</span>
                  <span className="text-center">{result.targetFar} m</span>
                  <span className="text-slate-600">Finish</span>
                  <span className="text-center">{result.userFinal} m</span>
                  <span className="text-center">{result.targetFinal} m</span>
                </div>
                <p className="mt-2 text-slate-600">Average gap: <b>{result.avgGap} m</b></p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-slate-600 mb-2">Right direction in <b>{result.matched} of {result.sections.length}</b> sections:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.sections.map((s, i) => (
                    <button key={i} onClick={() => { setReplaying(false); setTimeline((s.a.time + s.b.time) / 2); }}
                      title={`${s.a.time}–${s.b.time} s · target: ${DIR[s.target].text.toLowerCase()} · you: ${DIR[s.user].text.toLowerCase()}`}
                      className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${s.match ? 'bg-green-50 border-green-400 text-green-700' : 'bg-rose-50 border-rose-400 text-rose-700'}`}>
                      {i + 1} {DIR[s.target].icon} {s.match ? '✓' : '✗'}
                    </button>
                  ))}
                </div>
                {result.tip && <p className="mt-2 text-slate-700">💡 {result.tip}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Home–Destination bar */}
        <div className="mt-4 select-none">
          <div ref={barRef}
            onPointerDown={e => { if (busy) { e.preventDefault(); moveTo(e.clientX); } }}
            className={`relative w-full h-14 rounded-lg bg-slate-300 flex items-center justify-between px-3 touch-none ${busy ? 'car-cursor ring-2 ring-sky-400' : ''}`}>
            <span className="font-bold text-slate-800 z-10">🏠 Home</span>
            {phase === 'recording' && (
              <span className="absolute left-1/2 -translate-x-1/2 text-2xl text-sky-700 pointer-events-none">{DIR[currentDir].icon}</span>
            )}
            <span className="font-bold text-slate-800 z-10">Destination 🏁</span>
            {targetAt != null && (
              <div className="bar-marker border-2 border-blue-600 bg-blue-200/60" style={{ left: pct(targetAt) }} title="Target" />
            )}
            {youAt != null && (
              <div className="bar-marker bg-rose-600 border-2 border-white shadow" style={{ left: pct(youAt) }} title="You" />
            )}
          </div>
          <div className="relative h-5 text-xs text-slate-500">
            {ticks.map((t, i) => (
              <span key={i} className="absolute whitespace-nowrap"
                style={{ left: pct(t), transform: `translateX(${i === 0 ? 0 : i === ticks.length - 1 ? -100 : -50}%)` }}>{t} m</span>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {busy ? (
            <button onClick={stop} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg text-lg">■ STOP</button>
          ) : (
            <button onClick={start} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg text-lg">
              {phase === 'analysis' ? '↺ TRY AGAIN' : '► START'}
            </button>
          )}
          <button onClick={newGraph} disabled={busy}
            className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-semibold py-3 rounded-lg text-lg">» NEW GRAPH</button>
          <label className="flex items-center justify-center gap-2 text-sm text-slate-700 cursor-pointer px-2">
            <input type="checkbox" checked={guide} onChange={toggleGuide} className="w-4 h-4 accent-blue-600" />
            Show target on bar
          </label>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400 hidden sm:block">Space start · Esc stop · N new graph · R replay · H help</p>
      </main>

      <footer className="mt-5 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Distance vs. Time Graph Explorer. For educational fun!
      </footer>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
