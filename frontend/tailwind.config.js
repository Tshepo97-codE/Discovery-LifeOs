/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          teal:   '#0D9488',
          coral:  '#E05A3A',
          amber:  '#D97706',
          purple: '#7C6FF7',
          dark:   '#0B1120',
          card:   '#111827',
          border: '#1F2937',
        }
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: []
}