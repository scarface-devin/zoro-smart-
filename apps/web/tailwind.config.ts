import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f7fa',
          100: '#e7eaf2',
          200: '#c9d0e0',
          300: '#a1adc4',
          400: '#7386a6',
          500: '#54668c',
          600: '#3e4f73',
          700: '#2c3a57',
          800: '#1d2740',
          900: '#101728',
          950: '#080b16',
        },
        sun: {
          300: '#fff1a1',
          400: '#ffd86b',
          500: '#ffb938',
          600: '#e69917',
        },
        leaf: {
          400: '#7ce19c',
          500: '#3fc06a',
          600: '#1f9a4b',
        },
        ember: {
          400: '#ff8a73',
          500: '#ff5d3c',
          600: '#e33818',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(255, 217, 107, 0.18), 0 0 42px rgba(63, 192, 106, 0.10)',
        card: '0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(8, 11, 22, 0.45)',
      },
      backgroundImage: {
        'sun-grid':
          "radial-gradient(circle at 20% 10%, rgba(255,185,56,0.15), transparent 40%), radial-gradient(circle at 80% 100%, rgba(63,192,106,0.10), transparent 45%)",
        'panel-grid':
          "linear-gradient(115deg, rgba(255,217,107,0.06) 1px, transparent 1px), linear-gradient(245deg, rgba(63,192,106,0.06) 1px, transparent 1px)",
      },
      animation: {
        'pulse-slow': 'pulse 3.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.4s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
