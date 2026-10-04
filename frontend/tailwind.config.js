/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens via CSS variables
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          raised: 'rgb(var(--c-surface-raised) / <alpha-value>)',
          overlay: 'rgb(var(--c-surface-overlay) / <alpha-value>)',
          inset: 'rgb(var(--c-surface-inset) / <alpha-value>)',
        },
        edge: {
          DEFAULT: 'rgb(var(--c-edge) / <alpha-value>)',
          soft: 'rgb(var(--c-edge-soft) / <alpha-value>)',
          strong: 'rgb(var(--c-edge-strong) / <alpha-value>)',
        },
        txt: {
          primary: 'rgb(var(--c-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--c-text-muted) / <alpha-value>)',
          faint: 'rgb(var(--c-text-faint) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          soft: 'rgb(var(--c-brand-soft) / <alpha-value>)',
          dim: 'rgb(var(--c-brand-dim) / <alpha-value>)',
        },
        ok: {
          DEFAULT: 'rgb(var(--c-ok) / <alpha-value>)',
          soft: 'rgb(var(--c-ok-soft) / <alpha-value>)',
          dim: 'rgb(var(--c-ok-dim) / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'rgb(var(--c-warn) / <alpha-value>)',
          soft: 'rgb(var(--c-warn-soft) / <alpha-value>)',
          dim: 'rgb(var(--c-warn-dim) / <alpha-value>)',
        },
        alert: {
          DEFAULT: 'rgb(var(--c-alert) / <alpha-value>)',
          soft: 'rgb(var(--c-alert-soft) / <alpha-value>)',
          dim: 'rgb(var(--c-alert-dim) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.9rem' }],
      },
    },
  },
  plugins: [],
};
