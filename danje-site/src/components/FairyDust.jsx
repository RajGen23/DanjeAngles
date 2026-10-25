// Little glowing fairies that drift around a section, leaving a trail of sparkling
// fairy dust. Hovering an angel card inside the same section makes it burst with sparkles.
// Respects prefers-reduced-motion (fairies stay still, no dust) and pauses off-screen.
import { useEffect, useRef } from "react";

const FAIRIES = [
  { dress: "#f06aa6", wing: "#ffd1e8", hair: "#7b3fd0", ax: 0.42, ay: 0.32, w1: 0.23, w2: 0.37, p: 0.0, cy: 0.42, size: 96 },
  { dress: "#4fa3ff", wing: "#d7ecff", hair: "#6a2fc0", ax: 0.38, ay: 0.36, w1: 0.19, w2: 0.31, p: 2.1, cy: 0.55, size: 86 },
  { dress: "#f6c23e", wing: "#fff1c4", hair: "#7b3fd0", ax: 0.44, ay: 0.28, w1: 0.17, w2: 0.43, p: 4.2, cy: 0.35, size: 80 },
];
const DUST = ["245,184,46", "236,96,160", "160,110,230", "255,206,84", "255,140,190", "120,170,255"];

function FairySprite({ f, i }) {
  const g = `fairy-glow-${i}`;
  const w = `fairy-wing-${i}`;
  return (
    <svg viewBox="0 0 64 64" width={f.size} height={f.size} aria-hidden="true">
      <defs>
        <radialGradient id={g}>
          <stop offset="0" stopColor="#fff8d6" stopOpacity=".95" />
          <stop offset=".45" stopColor="#ffe3f3" stopOpacity=".45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={w} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset="1" stopColor={f.wing} stopOpacity=".75" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${g})`} className="dj-fairy__glow" />
      <g className="dj-fairy__wings">
        <g className="dj-fairy__wing dj-fairy__wing--l">
          <ellipse cx="22" cy="24" rx="11" ry="7" fill={`url(#${w})`} stroke="#ffffff" strokeOpacity=".9" strokeWidth=".8" transform="rotate(-30 22 24)" />
          <ellipse cx="23" cy="35" rx="8" ry="5" fill={`url(#${w})`} stroke="#ffffff" strokeOpacity=".9" strokeWidth=".8" transform="rotate(25 23 35)" />
        </g>
        <g className="dj-fairy__wing dj-fairy__wing--r">
          <ellipse cx="42" cy="24" rx="11" ry="7" fill={`url(#${w})`} stroke="#ffffff" strokeOpacity=".9" strokeWidth=".8" transform="rotate(30 42 24)" />
          <ellipse cx="41" cy="35" rx="8" ry="5" fill={`url(#${w})`} stroke="#ffffff" strokeOpacity=".9" strokeWidth=".8" transform="rotate(-25 41 35)" />
        </g>
      </g>
      {/* dress */}
      <path d="M32 27 C 27 33, 25 41, 27 47 Q 32 50 37 47 C 39 41, 37 33, 32 27 Z" fill={f.dress} />
      <path d="M27 47 L 29 44 L 31 48 L 33 44 L 35 48 L 37 47" fill="none" stroke="#ffffff" strokeOpacity=".6" strokeWidth=".8" />
      {/* arms + wand */}
      <path d="M30 31 L 25 36" stroke="#c9844a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M34 31 L 40 26" stroke="#c9844a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M40 26 L 45 19" stroke="#fff3c4" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M45 15.5 l1 2.3 2.5.2-1.9 1.6.6 2.4-2.2-1.3-2.2 1.3.6-2.4-1.9-1.6 2.5-.2z" fill="#ffd34d" className="dj-fairy__star" />
      {/* head + hair */}
      <circle cx="32" cy="22" r="5.6" fill={f.hair} />
      <circle cx="32" cy="23.2" r="4.2" fill="#d99158" />
      <path d="M27.6 21 Q 32 15.5 36.4 21 Q 34 18.6 32 19.6 Q 30 18.6 27.6 21Z" fill={f.hair} />
      <circle cx="30.6" cy="23.2" r=".55" fill="#3a2440" />
      <circle cx="33.4" cy="23.2" r=".55" fill="#3a2440" />
      <path d="M31 25.2 Q 32 26 33 25.2" stroke="#b84a6a" strokeWidth=".6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function FairyDust() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fairyRefs = useRef([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const section = wrap?.parentElement;
    if (!wrap || !canvas || !section) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, running = false, last = performance.now(), t = Math.random() * 100;
    const parts = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = section.clientWidth; H = section.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const emit = (x, y, n, spread = 0.6, speed = 30) => {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = Math.random() * speed;
        parts.push({
          x, y,
          vx: Math.cos(a) * v * spread, vy: Math.sin(a) * v * spread + 12,
          life: 0, max: 0.9 + Math.random() * 1.3,
          r: 1.1 + Math.random() * 2.4,
          c: DUST[(Math.random() * DUST.length) | 0],
          star: Math.random() < 0.28,
          spin: Math.random() * Math.PI,
        });
      }
    };

    const drawStar = (x, y, r, rot) => {
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const rr = k % 2 ? r * 0.35 : r;
        const a = rot + (k * Math.PI) / 4;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    };

    const place = (time) => {
      FAIRIES.forEach((f, i) => {
        const el = fairyRefs.current[i];
        if (!el) return;
        const x = W * (0.5 + f.ax * Math.sin(time * f.w1 + f.p)) ;
        const y = H * (f.cy + f.ay * Math.sin(time * f.w2 + f.p * 1.7)) * 0.9;
        const dx = Math.cos(time * f.w1 + f.p);
        const tilt = Math.cos(time * f.w2 + f.p * 1.7) * 8;
        el.style.transform = `translate(${x - f.size / 2}px, ${y - f.size / 2}px) scaleX(${dx >= 0 ? 1 : -1}) rotate(${tilt}deg)`;
        el._x = x; el._y = y + f.size * 0.2;
      });
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      place(t);
      fairyRefs.current.forEach((el) => el && emit(el._x, el._y, 3, 0.5, 26));
      ctx.clearRect(0, 0, W, H);
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(k, 1); continue; }
        p.vy += 6 * dt; p.vx *= 0.98; p.x += p.vx * dt; p.y += p.vy * dt; p.spin += dt * 2;
        const a = 1 - p.life / p.max;
        ctx.fillStyle = `rgba(${p.c},${Math.min(1, a * 1.1).toFixed(3)})`;
        ctx.shadowColor = `rgba(${p.c},${a.toFixed(3)})`; ctx.shadowBlur = 10;
        if (p.star) drawStar(p.x, p.y, p.r * 2.4 * (0.6 + a * 0.4), p.spin);
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.shadowBlur = 0;
      if (parts.length > 900) parts.splice(0, parts.length - 900);
      raf = requestAnimationFrame(frame);
    };

    const start = () => { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    place(t);
    const ro = new ResizeObserver(() => { resize(); place(t); });
    ro.observe(section);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "100px" });
    io.observe(section);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    // sparkle burst when an angel card is hovered or focused
    const cards = [...section.querySelectorAll(".dj-angel")];
    const burst = (e) => {
      if (reduce) return;
      const r = e.currentTarget.getBoundingClientRect();
      const s = section.getBoundingClientRect();
      emit(r.left - s.left + r.width / 2, r.top - s.top + r.height * 0.32, 46, 1.6, 90);
    };
    cards.forEach((c) => { c.addEventListener("pointerenter", burst); c.addEventListener("focus", burst); });

    return () => {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cards.forEach((c) => { c.removeEventListener("pointerenter", burst); c.removeEventListener("focus", burst); });
    };
  }, []);

  return (
    <div className="dj-fairies" ref={wrapRef} aria-hidden="true">
      <canvas ref={canvasRef} className="dj-fairies__dust" />
      {FAIRIES.map((f, i) => (
        <div key={i} className="dj-fairy" ref={(el) => (fairyRefs.current[i] = el)} style={{ "--flap": `${0.22 + i * 0.03}s` }}>
          <FairySprite f={f} i={i} />
        </div>
      ))}
    </div>
  );
}
