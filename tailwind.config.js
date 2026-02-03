
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Noto Sans TC', 'Inter', 'sans-serif'],
      },
      colors: {
        'botanical-green': '#2D5A27',
      },
    },
  },
  plugins: [],
}
