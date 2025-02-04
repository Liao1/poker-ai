/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'poker-green': {
          light: '#35654d',
          DEFAULT: '#2c4c3e',
          dark: '#1a332b',
        },
        'poker-brown': {
          light: '#6d4c3d',
          DEFAULT: '#4a3728',
          dark: '#2a1f17',
        }
      },
      animation: {
        'deal': 'dealCard 0.3s ease-out forwards',
        'fade-in': 'modalFadeIn 0.3s ease-out forwards',
        'slide-in': 'toastSlideIn 0.3s ease-out forwards',
      },
      boxShadow: {
        'inner-lg': 'inset 0 0 100px rgba(0, 0, 0, 0.5)',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      borderRadius: {
        'poker': '200px',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      transitionProperty: {
        'transform': 'transform',
      },
      scale: {
        '85': '.85',
        '95': '.95',
      }
    },
  },
  plugins: [],
}
