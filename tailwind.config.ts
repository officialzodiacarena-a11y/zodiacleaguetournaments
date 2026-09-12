import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#060810',
          base: '#0D0E1A',
        },
        surface: {
          card: '#121424',
          sub: '#1A1D36',
        },
        zodiac: {
          gold: '#E8B429',
          cyan: '#00D4FF',
          emerald: '#4ADE80',
          rose: '#F87171',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Space Grotesk', 'monospace'],
        sans: ['Inter', 'Kanit', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px rgba(232, 180, 41, 0.35)',
        'cyan-glow': '0 0 25px rgba(0, 212, 255, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
