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
        pageBg: '#F7F4EE',
        pageBgDark: '#F4F1EA',
        cardBg: '#FFFFFF',
        cardSurface: '#FAF8F5',
        cardBorder: '#EAE7DF',
        cardBorderHover: '#D1CDC2',
        
        // Primary Text & Muted
        textPrimary: '#202321',
        textSecondary: '#666B67',
        textMuted: '#949A95',

        // Primary Accent: Teal / Muted Green
        teal: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },

        // Controlled Small Accents
        accentCoral: '#F43F5E',
        accentOrange: '#F97316',
        accentWarmYellow: '#EAB308',
        accentSky: '#0284C7',
        accentSage: '#D1FAE5',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
