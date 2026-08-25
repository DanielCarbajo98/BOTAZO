'use client';

import { useEffect, useState } from 'react';
import { site } from '@/config/site';

/**
 * Intro de marca: un globo girando con el avión del logo orbitando.
 *
 * Se renderiza en el servidor y ya sale visible, así que nunca hay un salto de
 * contenido. Se retira sola en cuanto la página está lista (con un mínimo de
 * tiempo en pantalla para que no dé un parpadeo feo), y como respaldo la propia
 * CSS la esconde a los 2 s: si el JavaScript fallara, nadie se queda atrapado.
 *
 * Solo aparece en cargas completas de página. Al navegar entre secciones el
 * layout no se vuelve a montar, así que no se repite.
 */
export function BrandLoader() {
  const [state, setState] = useState<'visible' | 'leaving' | 'gone'>('visible');

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minimumOnScreen = reduced ? 0 : 950;
    const mountedAt = performance.now();
    let leaveTimer = 0;
    let removeTimer = 0;

    const leave = () => {
      const waited = performance.now() - mountedAt;
      leaveTimer = window.setTimeout(
        () => {
          setState('leaving');
          removeTimer = window.setTimeout(() => setState('gone'), reduced ? 0 : 620);
        },
        Math.max(0, minimumOnScreen - waited),
      );
    };

    if (document.readyState === 'complete') leave();
    else window.addEventListener('load', leave, { once: true });

    return () => {
      window.removeEventListener('load', leave);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (state === 'gone') return null;

  return (
    <div
      className={`brand-loader${state === 'leaving' ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Cargando ${site.name}`}
    >
      <div className="brand-loader__stage">
        <Globe />
        <p className="brand-loader__word">{site.name}</p>
        <p className="brand-loader__tagline">{site.tagline}</p>
        <span className="brand-loader__bar" aria-hidden />
      </div>
    </div>
  );
}

function Globe() {
  return (
    <svg viewBox="0 0 240 240" className="brand-loader__globe" aria-hidden focusable="false">
      <defs>
        {/* Puntos que hacen de continentes: al desplazarse dentro del círculo, gira */}
        <pattern id="al-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.8" fill="currentColor" />
          <circle cx="7" cy="7" r="1.1" fill="currentColor" opacity="0.6" />
        </pattern>
        <clipPath id="al-sphere">
          <circle cx="120" cy="120" r="62" />
        </clipPath>
        <radialGradient id="al-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#4bd6c8" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#0a8375" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#03201f" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id="al-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4bd6c8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#14bfae" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Esfera */}
      <g clipPath="url(#al-sphere)">
        <circle cx="120" cy="120" r="62" fill="#04292a" />
        <g className="brand-loader__dots" color="#8ff5e6">
          <rect x="-160" y="50" width="720" height="142" fill="url(#al-dots)" opacity="0.85" />
        </g>
        <circle cx="120" cy="120" r="62" fill="url(#al-shade)" />
      </g>

      {/* Paralelos y meridianos: la retícula que hace que se lea como una esfera */}
      <g stroke="#7fe9dc" fill="none" strokeWidth="0.85" opacity="0.34">
        <ellipse cx="120" cy="120" rx="62" ry="16" />
        <ellipse cx="120" cy="94" rx="56" ry="13" />
        <ellipse cx="120" cy="146" rx="56" ry="13" />
      </g>
      <g stroke="#7fe9dc" fill="none" strokeWidth="0.85" opacity="0.22">
        <ellipse cx="120" cy="120" rx="22" ry="62" />
        <ellipse cx="120" cy="120" rx="44" ry="62" />
        <line x1="120" y1="58" x2="120" y2="182" />
      </g>
      <circle cx="120" cy="120" r="62" fill="none" stroke="#4bd6c8" strokeWidth="1.4" opacity="0.75" />

      {/* Órbita del avión */}
      <path
        id="al-orbit"
        className="brand-loader__orbit"
        d="M 120 32 A 88 88 0 1 1 119.9 32"
        fill="none"
        stroke="url(#al-ring)"
        strokeWidth="1.3"
        strokeDasharray="3 7"
        strokeLinecap="round"
      />

      {/* Avión del logo, recorriendo la órbita */}
      <g className="brand-loader__plane">
        <path
          d="M9.8 -10.6 L-1.1 -4.9 a1 1 0 0 0 -.1 1.7 l3.2 2.2 -.5 4.6 a.6.6 0 0 0 1 .5 l2.3 -2.6 3.6 2 a1 1 0 0 0 1.5 -.7 l1.6 -11.9 a1 1 0 0 0 -1.7 -.9Z"
          fill="#ffffff"
          transform="translate(-8 5) scale(1.35)"
        />
      </g>
    </svg>
  );
}
