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
        pageBg: '#F8F7FC',
        cardBg: '#FFFFFF',
        cardBorder: '#E2E8F0',
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#312E81',
        },
        accentViolet: '#7C3AED',
        accentCoral: '#F43F5E',
        accentPink: '#FB7185',
        textMain: '#0F172A',
        textMuted: '#64748B',
      },
    },
  },
  plugins: [],
}
