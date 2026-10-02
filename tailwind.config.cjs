/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#c8a97a',
        ink: '#090d12',
      },
      boxShadow: {
        panel: '0 24px 60px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
}
