/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Parchment theme colors
        parchment: {
          50: '#fefdfb',
          100: '#fdf9f0',
          200: '#f9f0dc',
          300: '#f4e4c1',
          400: '#e8d098',
          500: '#d9b86c',
          600: '#c49a4a',
          700: '#a67c3b',
          800: '#876335',
          900: '#6e512f',
          950: '#3d2a17',
        },
        ink: {
          50: '#f6f5f4',
          100: '#e7e4e1',
          200: '#d1cbc5',
          300: '#b5aca2',
          400: '#9a8d7f',
          500: '#857869',
          600: '#72655a',
          700: '#5d524a',
          800: '#4f4640',
          900: '#443d38',
          950: '#26211e',
        },
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        terrain: {
          grass: '#7cb342',
          forest: '#558b2f',
          desert: '#d4a056',
          snow: '#eceff1',
          mountain: '#78909c',
          water: '#4fc3f7',
          deepwater: '#0277bd',
          sand: '#ffe082',
          swamp: '#8d6e63',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        map: ['IM Fell English', 'serif'],
        handwritten: ['Caveat', 'cursive'],
      },
      spacing: {
        'toolbar': '48px',
        'panel': '280px',
        'panel-collapsed': '48px',
      },
      zIndex: {
        'canvas': '0',
        'overlay': '10',
        'toolbar': '20',
        'panel': '30',
        'modal': '40',
        'tooltip': '50',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'slide-in-left': 'slideInLeft 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
