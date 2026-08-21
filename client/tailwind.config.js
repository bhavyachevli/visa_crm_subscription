/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          deep: "#020617",     // Slate 950
          emerald: "#10b981",  // Emerald 500
          mint: "#34d399",     // Mint 400
          dark: "#0b1329",     // Slate-dark background
        },
        pangaea: {
          deep: "#f8fafc",     // Clean white/light text headers for dark mode
          sea: "#10b981",      // Emerald green for links, buttons, and badges
          sand: "#0f172a",     // Dark slate-900 card backgrounds replacing light gray
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
