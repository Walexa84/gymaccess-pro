/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        volt: {
          DEFAULT: '#ccff00',
          hover: '#b5e600',
          muted: 'rgba(204, 255, 0, 0.12)',
        },
        sport: {
          orange: '#ff5722',
          'orange-hover': '#f4511e',
          'orange-muted': 'rgba(255, 87, 34, 0.12)',
          blue: '#2563eb',
        },
        cyber: {
          dark: '#0a0b0e',
          card: '#12141a',
          card2: '#181b22',
          border: '#232834',
          accent: '#ccff00',
          cyan: '#00f0ff',
        },
      },
      boxShadow: {
        'volt-glow': '0 0 25px -4px rgba(204, 255, 0, 0.3)',
        'orange-glow': '0 0 25px -4px rgba(255, 87, 34, 0.25)',
        'clean-card': '0 4px 25px -2px rgba(0, 0, 0, 0.06), 0 2px 8px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
