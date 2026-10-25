// Every 15 seconds one of the cartoon angels flies across the screen, small, leaving
// a trail of magic sparkles. Hovering her pauses the flight and shows her name and
// virtue ("DanJe' · Protection Angel"); clicking opens her product page.
// Skipped entirely for visitors who turn on reduced motion.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { family } from "../data/angels.js";

const INTERVAL = 15000;
const DURATION = 9000;
const SPARKS = ["#ffd34d", "#ff8cc6", "#b98bff", "#7cc4ff", "#ffffff"];

function flightPath(w, h) {
  // random gentle wave across the screen, left→right or right→left
  const ltr = Math.random() < 0.5;
  const y0 = h * (0.15 + Math.random() * 0.55);
  const amp = h * (0.06 + Math.random() * 0.1);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = ltr ? -90 + t * (w + 180) : w + 90 - t * (w + 180);
    const y = y0 + Math.sin(t * Math.PI * 2.2) * amp - t * h * 0.08;
    pts.push({ x, y, t });
  }
  return { pts, ltr };
}

export default function FlyingAngels() {
  const [angel, setAngel] = useState(null);
  const [hover, setHover] = useState(false);
  const elRef = useRef(null);
  const layerRef = useRef(null);
  const animRef = useRef(null);
  const idx = useRef(Math.floor(Math.random() * family.length));
  const navigate = useNavigate();

  // schedule flights
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const launch = () => {
      if (document.hidden) return;
      idx.current = (idx.current + 1) % family.length;
      setAngel({ ...family[idx.current], key: Date.now() });
    };
    const first = setTimeout(launch, 4000);
    const timer = setInterval(launch, INTERVAL);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);

  // run one flight
  useEffect(() => {
    const el = elRef.current;
    const layer = layerRef.current;
    if (!angel || !el || !layer) return;
    const { pts, ltr } = flightPath(window.innerWidth, window.innerHeight);
    const frames = pts.map((p) => ({
      transform: `translate(${p.x}px, ${p.y}px) rotate(${(ltr ? 1 : -1) * Math.sin(p.t * Math.PI * 4.4) * 9}deg)`,
    }));
    el.classList.toggle("is-rtl", !ltr);
    const anim = el.animate(frames, { duration: DURATION, easing: "linear", fill: "forwards" });
    animRef.current = anim;
    const sparkTimer = setInterval(() => {
      if (anim.playState !== "running") return;
      const r = el.getBoundingClientRect();
      for (let i = 0; i < 2; i++) {
        const s = document.createElement("span");
        s.className = "dj-flyer__spark";
        const size = 3 + Math.random() * 5;
        s.style.cssText = `left:${r.left + r.width * (ltr ? 0.2 : 0.8) + (Math.random() - 0.5) * 14}px;top:${r.top + r.height * 0.6 + (Math.random() - 0.5) * 14}px;width:${size}px;height:${size}px;background:${SPARKS[(Math.random() * SPARKS.length) | 0]}`;
        layer.appendChild(s);
        setTimeout(() => s.remove(), 1400);
      }
    }, 70);
    anim.onfinish = () => { clearInterval(sparkTimer); setAngel(null); setHover(false); };
    return () => { clearInterval(sparkTimer); anim.cancel(); };
  }, [angel]);

  const pause = () => { animRef.current?.pause(); setHover(true); };
  const resume = () => { animRef.current?.play(); setHover(false); };

  return (
    <div className="dj-flyers" ref={layerRef} aria-hidden={!angel}>
      {angel && (
        <button
          key={angel.key}
          ref={elRef}
          className={`dj-flyer ${hover ? "is-hover" : ""}`}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
          onClick={() => navigate(`/product/${angel.slug}`)}
          aria-label={`${angel.name}, ${angel.virtue} Angel`}
        >
          <img src={angel.art} alt="" draggable="false" />
          <span className={`dj-flyer__tip dj-tone--${angel.tone}`}>
            <strong>{angel.name}</strong>
            <span>{angel.virtue} Angel</span>
          </span>
        </button>
      )}
    </div>
  );
}
