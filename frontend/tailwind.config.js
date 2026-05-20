/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — healthcare green
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Healthcare accent palette
        health: {
          blue:      '#1e40af',
          'blue-lt': '#dbeafe',
          teal:      '#0d9488',
          'teal-lt': '#ccfbf1',
          green:     '#16a34a',
          'green-lt':'#dcfce7',
          amber:     '#d97706',
          'amber-lt':'#fef3c7',
          red:       '#dc2626',
          'red-lt':  '#fee2e2',
          purple:    '#7c3aed',
          'purple-lt':'#ede9fe',
        },
        // Sidebar
        sidebar: {
          bg:      '#0f172a',
          hover:   '#1e293b',
          active:  '#1d4ed8',
          text:    '#94a3b8',
          'text-active': '#ffffff',
          border:  '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        sidebar: '4px 0 24px 0 rgb(0 0 0 / 0.15)',
        toast:   '0 8px 24px -4px rgb(0 0 0 / 0.18)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-in':   'slideIn 0.25s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':    'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
      },
      transitionDuration: {
        250: '250ms',
      },
    },
  },
  plugins: [],
}
