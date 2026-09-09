export const HotelArt = ({ variant }: { variant: number }) => {
  if (variant === 1) return (
    <svg viewBox="0 0 200 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="180" fill="#DCE9FA" />
      <rect x="22" y="34" width="70" height="146" fill="#B9D2F0" />
      <rect x="100" y="58" width="80" height="122" fill="#9CBFE8" />
      <g fill="#EAF2FC">
        <rect x="32" y="46" width="14" height="16" /><rect x="54" y="46" width="14" height="16" /><rect x="76" y="46" width="8" height="16" />
        <rect x="32" y="74" width="14" height="16" /><rect x="54" y="74" width="14" height="16" /><rect x="76" y="74" width="8" height="16" />
        <rect x="32" y="102" width="14" height="16" /><rect x="54" y="102" width="14" height="16" /><rect x="76" y="102" width="8" height="16" />
        <rect x="112" y="72" width="16" height="18" /><rect x="138" y="72" width="16" height="18" /><rect x="164" y="72" width="10" height="18" />
        <rect x="112" y="104" width="16" height="18" /><rect x="138" y="104" width="16" height="18" /><rect x="164" y="104" width="10" height="18" />
      </g>
      <rect y="152" width="200" height="28" fill="#7FA9DC" />
    </svg>
  );
  if (variant === 2) return (
    <svg viewBox="0 0 200 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="180" fill="#E3EDFB" />
      <rect x="18" y="86" width="120" height="54" rx="6" fill="#9CBFE8" />
      <rect x="18" y="66" width="120" height="26" rx="8" fill="#B9D2F0" />
      <rect x="30" y="70" width="44" height="18" rx="5" fill="#EAF2FC" />
      <rect x="82" y="70" width="44" height="18" rx="5" fill="#EAF2FC" />
      <rect x="10" y="40" width="136" height="24" rx="4" fill="#7FA9DC" />
      <circle cx="170" cy="70" r="11" fill="#B9D2F0" />
      <rect x="167" y="80" width="6" height="50" fill="#9CBFE8" />
      <rect y="138" width="200" height="42" fill="#CBDFF5" />
    </svg>
  );
  if (variant === 3) return (
    <svg viewBox="0 0 200 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="180" fill="#DCE9FA" />
      <path d="M0 118L52 56l40 46 30-28 78 68v38H0z" fill="#B9D2F0" />
      <path d="M96 138l44-40 60 52v30H96z" fill="#9CBFE8" />
      <circle cx="156" cy="42" r="16" fill="#EAF2FC" />
      <rect y="150" width="200" height="30" fill="#7FA9DC" />
      <path d="M0 150c26-8 48 8 74 0s52-10 74 0 34 4 52 0v30H0z" fill="#6D9DD6" />
    </svg>
  );
  return (
    <svg viewBox="0 0 200 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="180" fill="#EAF2FC" />
      <rect width="200" height="64" fill="#CBDFF5" />
      <rect y="58" width="200" height="8" fill="#B9D2F0" />
      <rect x="22" y="98" width="156" height="70" rx="8" fill="#7FA9DC" />
      <path d="M32 118c16-7 28 7 44 0s28-7 44 0 26 5 42-2" stroke="#A7C9EC" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M32 140c16-7 28 7 44 0s28-7 44 0 26 5 42-2" stroke="#A7C9EC" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="26" y="76" width="44" height="9" rx="4.5" fill="#DCE9FA" />
      <rect x="26" y="68" width="16" height="10" rx="4" fill="#DCE9FA" />
      <rect x="82" y="76" width="44" height="9" rx="4.5" fill="#DCE9FA" />
      <rect x="82" y="68" width="16" height="10" rx="4" fill="#DCE9FA" />
      <rect x="158" y="40" width="5" height="48" rx="2" fill="#9CBFE8" />
      <path d="M136 44h50l-25-20z" fill="#B9D2F0" />
    </svg>
  );
};

export const CarArt = ({ variant }: { variant: number }) => {
  if (variant === 2) return (
    <svg viewBox="0 0 170 84" fill="none" aria-hidden="true">
      <path d="M12 60V52c0-5 3-8 8-9l20-4 14-15c3-3 7-4 11-4h48c5 0 8 2 10 5l10 14 18 4c6 1 9 4 9 9v8z" fill="#DCE9FA" stroke="#0F52BA" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M58 26l-14 14h84l-9-12c-2-2-4-2-6-2H58z" fill="#fff" />
      <path d="M80 25v15M106 25v15" stroke="#0F52BA" strokeWidth="2" />
      <path d="M12 60h138" stroke="#0F52BA" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="48" cy="60" r="11" fill="#08213D" /><circle cx="48" cy="60" r="4" fill="#fff" />
      <circle cx="126" cy="60" r="11" fill="#08213D" /><circle cx="126" cy="60" r="4" fill="#fff" />
    </svg>
  );
  if (variant === 3) return (
    <svg viewBox="0 0 170 84" fill="none" aria-hidden="true">
      <path d="M16 58V44c0-5 3-8 8-9l18-3 12-14c3-3 7-4 11-4h34c5 0 9 2 12 5l12 13 20 3c6 1 9 4 9 9v14z" fill="#DCE9FA" stroke="#0F52BA" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M60 18l-12 14h70l-11-12c-2-2-4-2-6-2H60z" fill="#fff" />
      <path d="M84 17v15" stroke="#0F52BA" strokeWidth="2" />
      <path d="M16 58h130" stroke="#0F52BA" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="52" cy="60" r="13" fill="#08213D" /><circle cx="52" cy="60" r="5" fill="#fff" />
      <circle cx="124" cy="60" r="13" fill="#08213D" /><circle cx="124" cy="60" r="5" fill="#fff" />
    </svg>
  );
  return (
    <svg viewBox="0 0 170 84" fill="none" aria-hidden="true">
      <path d="M16 60V52c0-5 3-8 8-9l22-4 14-15c3-3 7-4 11-4h30c5 0 9 2 12 5l13 14 20 4c6 1 9 4 9 9v8z" fill="#DCE9FA" stroke="#0F52BA" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M62 26l-14 14h68l-11-12c-2-2-4-2-6-2H62z" fill="#fff" />
      <path d="M84 25v15" stroke="#0F52BA" strokeWidth="2" />
      <path d="M16 60h130" stroke="#0F52BA" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="52" cy="60" r="11" fill="#08213D" /><circle cx="52" cy="60" r="4" fill="#fff" />
      <circle cx="124" cy="60" r="11" fill="#08213D" /><circle cx="124" cy="60" r="4" fill="#fff" />
    </svg>
  );
};
