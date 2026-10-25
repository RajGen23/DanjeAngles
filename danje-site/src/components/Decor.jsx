// Decorative SVGs used across the pages (crown, dragonfly, stars, trails, dividers).
import { useId } from "react";

export function Crown({ size = 22, className = "", style }) {
  const g = useId();
  return (
    <svg className={className} style={style} width={size} height={size * 0.78} viewBox="0 0 32 25" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset=".55" stopColor="#f2b631" />
          <stop offset="1" stopColor="#d48a12" />
        </linearGradient>
      </defs>
      <path d="M3 8.5l6.2 5.2L16 4l6.8 9.7L29 8.5l-2.6 11.8H5.6z" fill={`url(#${g})`} stroke="#c98510" strokeWidth=".6" strokeLinejoin="round" />
      <rect x="5.4" y="20.6" width="21.2" height="3" rx="1" fill={`url(#${g})`} stroke="#c98510" strokeWidth=".6" />
      <circle cx="3" cy="7.6" r="2" fill={`url(#${g})`} />
      <circle cx="16" cy="3" r="2.2" fill={`url(#${g})`} />
      <circle cx="29" cy="7.6" r="2" fill={`url(#${g})`} />
      <circle cx="16" cy="15.2" r="1.6" fill="#f06aa6" />
      <circle cx="10" cy="16.6" r="1.1" fill="#9c6ad6" />
      <circle cx="22" cy="16.6" r="1.1" fill="#9c6ad6" />
    </svg>
  );
}

export function GoldStar({ size = 18, className = "", style }) {
  const g = useId();
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <radialGradient id={g} cx=".45" cy=".4" r=".7">
          <stop offset="0" stopColor="#fff2b8" />
          <stop offset=".5" stopColor="#f6c845" />
          <stop offset="1" stopColor="#dc9a1c" />
        </radialGradient>
      </defs>
      <path d="M12 1.8l2.9 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.3 5.7 21l1.6-7.1L1.9 9.1l7.2-.7z" fill={`url(#${g})`} stroke="#e1a52a" strokeWidth=".5" strokeLinejoin="round" />
    </svg>
  );
}

export function Sparkle({ size = 14, className = "", style, color = "#fff" }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 0c.6 5.2 4.8 9.4 10 10-5.2.6-9.4 4.8-10 10-.6-5.2-4.8-9.4-10-10C5.2 9.4 9.4 5.2 10 0z" fill={color} />
    </svg>
  );
}

export function Dragonfly({ size = 70, className = "", style, flip = false }) {
  const w = useId();
  return (
    <svg
      className={className}
      style={{ ...style, transform: `${style?.transform || ""} ${flip ? "scaleX(-1)" : ""}` }}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={w} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efe4ff" stopOpacity=".95" />
          <stop offset=".5" stopColor="#b9cff7" stopOpacity=".9" />
          <stop offset="1" stopColor="#c3a6ee" stopOpacity=".85" />
        </linearGradient>
      </defs>
      <g transform="rotate(-38 50 50)">
        <path d="M48 41 C 36 30, 14 26, 7 32 C 3 37, 18 44, 48 44 Z" fill={`url(#${w})`} stroke="#8a9fdc" strokeWidth=".9" />
        <path d="M52 41 C 64 30, 86 26, 93 32 C 97 37, 82 44, 52 44 Z" fill={`url(#${w})`} stroke="#8a9fdc" strokeWidth=".9" />
        <path d="M48 47 C 38 50, 20 58, 15 64 C 13 69, 30 64, 48 50 Z" fill={`url(#${w})`} stroke="#8a9fdc" strokeWidth=".9" />
        <path d="M52 47 C 62 50, 80 58, 85 64 C 87 69, 70 64, 52 50 Z" fill={`url(#${w})`} stroke="#8a9fdc" strokeWidth=".9" />
        <path d="M14 33 L46 42 M86 33 L54 42 M20 62 L47 49 M80 62 L53 49" stroke="#ffffff" strokeOpacity=".8" strokeWidth=".7" />
        <path d="M50 40 L50 92" stroke="#3d5a9e" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="4 1.2" />
        <ellipse cx="50" cy="41" rx="4.2" ry="6" fill="#4a6fb8" />
        <circle cx="50" cy="33" r="4.2" fill="#3d5a9e" />
        <circle cx="48.4" cy="32" r="1.1" fill="#bcd2ff" />
      </g>
    </svg>
  );
}

/** Dotted golden flight path. `d` is an SVG path in a 0..w x 0..h box. */
export function Trail({ d, w = 120, h = 80, className = "", style }) {
  return (
    <svg className={className} style={style} width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <path d={d} stroke="#e2b54c" strokeWidth="1.4" strokeDasharray="1.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

export function HeartGem({ size = 14, className = "", style }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 22" aria-hidden="true">
      <path d="M12 21S1.5 14.3 1.5 7.4A5.4 5.4 0 0 1 12 4.6a5.4 5.4 0 0 1 10.5 2.8C22.5 14.3 12 21 12 21z" fill="#ef5f9e" />
      <path d="M6.4 5.2c-1.6.4-2.6 1.8-2.6 3.3" stroke="#ffd1e5" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Gold hairline with a small gold heart in the middle (About page). */
export function GoldDivider({ width = 140, className = "" }) {
  return (
    <span className={`dj-gold-divider ${className}`} style={{ width }} aria-hidden="true">
      <i />
      <svg width="12" height="11" viewBox="0 0 24 22"><path d="M12 21S1.5 14.3 1.5 7.4A5.4 5.4 0 0 1 12 4.6a5.4 5.4 0 0 1 10.5 2.8C22.5 14.3 12 21 12 21z" fill="#e7b343" /></svg>
      <i />
    </span>
  );
}

export function ButterflyIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 7v12" strokeLinecap="round" />
      <path d="M12 9C10 5 4 2.5 3 5c-.9 2.3 1.2 5.6 5 6.4C5 12.4 4.6 16.5 7 17c2 .4 4-2.4 5-5" />
      <path d="M12 9c2-4 8-6.5 9-4 .9 2.3-1.2 5.6-5 6.4 3 1 3.4 5.1 1 5.6-2 .4-4-2.4-5-5" />
      <path d="M10.5 4.5L12 7l1.5-2.5" strokeLinecap="round" />
    </svg>
  );
}
