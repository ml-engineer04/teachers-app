/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        surface: {
          light: '#F6F8FC',
          lightAlt: '#EDF1FA',
          dark: '#090D18',
          darkCard: '#121A2D',
          darkElevated: '#1A243E',
          darkBorder: '#23304E',
        },
        school: {
          blue: {
            50: '#F0F5FA',
            100: '#E1ECF5',
            200: '#C2D9EB',
            300: '#94BEE0',
            400: '#5E9CD1',
            500: '#347DC0',
            600: '#2364A4',
            700: '#1C5085',
            800: '#18436D',
            900: '#0F2942', // Deep school blue primary
            950: '#091A2B',
          },
          yellow: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F59E0B', // Warm school yellow accent
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
          },
          surface: {
            light: '#F4F7FB',
            card: 'rgba(255, 255, 255, 0.85)',
            cardDark: 'rgba(19, 34, 56, 0.85)',
            borderLight: 'rgba(255, 255, 255, 0.6)',
            borderDark: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
        elevated: '0 12px 32px -4px rgba(15, 23, 42, 0.12)',
        glow: '0 10px 28px -6px rgba(79, 70, 229, 0.35)',
        'glass': '0 8px 32px 0 rgba(15, 41, 66, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.8)',
        'glass-hover': '0 14px 40px 0 rgba(15, 41, 66, 0.14), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'pill': '0 10px 25px -5px rgba(245, 158, 11, 0.4), 0 8px 10px -6px rgba(245, 158, 11, 0.3)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
};
