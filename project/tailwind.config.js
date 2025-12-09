/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#77bc2c',
          50: '#f2f9eb',
          100: '#e3f2d4',
          200: '#c7e5aa',
          300: '#a9d67f',
          400: '#8bc854',
          500: '#77bc2c',
          600: '#5e9523',
          700: '#4a7c1f',
          800: '#3b621a',
          900: '#2f4e15',
          950: '#1a2c0c'
        },
        accent: {
          DEFAULT: '#f2a900',
          50: '#fff9eb',
          100: '#ffefc7',
          200: '#ffdd8a',
          300: '#ffc54d',
          400: '#ffa71f',
          500: '#f2a900',
          600: '#cc8100',
          700: '#a65c00',
          800: '#884a04',
          900: '#723d0a',
          950: '#421f00'
        },
        background: '#f5f5f5',
        text: '#333333'
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      maxWidth: {
        '8xl': '1400px',
      },
      spacing: {
        '18': '4.5rem',
        '112': '28rem',
        '128': '32rem',
      },
      fontSize: {
        'xxs': '0.625rem',
      },
    },
  },
  plugins: [],
};