import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: 'var(--bg)', sf: 'var(--sf)', sb: 'var(--sb)', th: 'var(--th)', ln: 'var(--ln)', tx: 'var(--tx)', mu: 'var(--mu)',
        ac: 'var(--ac)', acfg: 'var(--acfg)', hv: 'var(--hv)',
        ok: 'var(--ok)', okb: 'var(--okb)', wn: 'var(--wn)', wnb: 'var(--wnb)', er: 'var(--er)', erb: 'var(--erb)',
      },
      borderRadius: { DEFAULT: '6px' },
    },
  },
  plugins: [],
} satisfies Config;
