/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#0a0e17',
        },
        brand: {
          cyan: '#06b6d4',
          'cyan-glow': 'rgba(6, 182, 212, 0.25)',
          blue: '#3b82f6',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#ef4444',
          purple: '#8b5cf6',
        },
        status: {
          authentic: '#10b981',
          expired: '#f59e0b',
          recalled: '#ec4899',
          'dead-batch': '#ef4444',
          suspicious: '#f97316',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.25)',
        'glow-rose': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.25)',
        'card-dark': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-danger': 'pulse-danger 2s infinite',
      },
      keyframes: {
        'pulse-danger': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
          '50%': { boxShadow: '0 0 16px 4px rgba(239, 68, 68, 0.6)' },
        },
      }
    },
  },
  plugins: [],
}
