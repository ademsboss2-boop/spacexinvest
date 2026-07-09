/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: '#0D0D0D',
        primaryText: '#FFFFFF',
        secondaryText: '#B8B8B8',
        borderColor: 'rgba(255,255,255,0.1)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
