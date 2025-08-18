/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {pattern: /(bg|text|top|left)-./}
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease forwards',
      },
      fontFamily: {
        'press-start': ['Press Start 2P', 'cursive'],
        'Mulish': ['Mulish', 'sans-serif'],
      },
      colors:{
        'customgreen':'#5BA491',
        'customgray':'#F6F5F8',
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
  variants: {
    scrollbar: ['rounded']
  }
};
