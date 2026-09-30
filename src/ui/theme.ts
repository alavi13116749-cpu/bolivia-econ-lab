import { useEffect, useState } from 'react';

const KEYS = ['ink', 'muted', 'line', 'grid', 'surface', 'accent', 'teal', 'gold', 'good', 'bad', 'series-1', 'series-2', 'series-3', 'series-4'] as const;
export type ThemeColors = Record<(typeof KEYS)[number], string>;

function read(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(KEYS.map((k) => [k, cs.getPropertyValue(`--${k}`).trim() || '#888'])) as ThemeColors;
}

/** Colores resueltos del tema (Recharts necesita valores, no var()). Se actualiza al cambiar de tema. */
export function useThemeColors(): ThemeColors {
  const [c, setC] = useState<ThemeColors>(read);
  useEffect(() => {
    const update = () => setC(read());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => {
      mq.removeEventListener('change', update);
      mo.disconnect();
    };
  }, []);
  return c;
}

export const SERIES = ['series-1', 'series-2', 'series-3', 'series-4'] as const;
