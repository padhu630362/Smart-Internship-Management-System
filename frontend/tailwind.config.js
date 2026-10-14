/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Signature Royal Burgundy Palette
        burgundy: {
          50: '#fbf5f6',
          100: '#f7e8ea',
          200: '#f0d3d7',
          300: '#e2b0b8',
          400: '#cc7e8e',
          500: '#ab4a60',
          600: '#8a2c42',
          700: '#742236',
          800: '#5f1e2e',
          900: '#4d1a27',
          950: '#2c0a13',
        },
        // Shimmering Champagne Gold Palette
        champagne: {
          50: '#fcfaf4',
          100: '#f7f1e2',
          200: '#ede0c2',
          300: '#dfc798',
          400: '#cfad6e',
          500: '#be934c',
          600: '#a6783d',
          700: '#875b33',
          800: '#6f492e',
          900: '#5c3d28',
          950: '#331e13',
        },
        // Unified Brand Theme: Regal Burgundy
        brand: {
          50: '#fbf5f6',
          100: '#f7e8ea',
          200: '#f0d3d7',
          300: '#e2b0b8',
          400: '#ab4a60',
          500: '#8a2c42',
          600: '#742236',
          700: '#5f1e2e',
          800: '#4d1a27',
          900: '#3d141e',
          950: '#220910',
        },
        // Harmonized Aliases to ensure complete compatibility across existing pages
        peach: {
          50: '#fcfaf4',
          100: '#f7f1e2',
          200: '#ede0c2',
          300: '#dfc798',
          400: '#cfad6e',
          500: '#be934c', // rich champagne gold
          600: '#a6783d',
          700: '#875b33',
          800: '#6f492e',
          900: '#5c3d28',
          950: '#331e13',
        },
        blush: {
          50: '#fbf5f6',
          100: '#f7e8ea',
          200: '#f0d3d7',
          300: '#e2b0b8',
          400: '#cc7e8e',
          500: '#ab4a60', // bordeaux wine
          600: '#8a2c42',
          700: '#742236',
          800: '#5f1e2e',
          900: '#4d1a27',
          950: '#2c0a13',
        },
        // Deep obsidian dark surfaces with velvet wine undertones
        stone: {
          750: '#261b1e',
          850: '#1a1114',
        },
        slate: {
          850: '#181216',
        },
        warmdark: {
          700: '#2c1e22',
          750: '#24171b',
          800: '#1d1216',
          850: '#170d11',
          900: '#12090d',
          950: '#0c0508',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'burgundy': '0 10px 25px -5px rgba(116, 34, 54, 0.35)',
        'champagne': '0 10px 25px -5px rgba(190, 147, 76, 0.3)',
        'glow': '0 0 25px -2px rgba(138, 44, 66, 0.35)',
      },
    },
  },
  plugins: [],
}
