/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm Light Theme Palette
        light: {
          bg: '#F8F7F4',
          surface: '#FFFFFF',
          subtle: '#F1F0EC',
          text: '#202522',
          muted: '#68716B',
          border: '#E5E7E2',
          accent: '#315F50',
          accentHover: '#24493D',
          positive: '#247A5A',
          negative: '#B5504F',
        },
        // Refined Dark Theme Palette
        dark: {
          bg: '#141917',
          surface: '#1C2420',
          subtle: '#252E29',
          text: '#ECEFEA',
          muted: '#A3AEA6',
          border: '#354039',
          accent: '#9FC9B0',
          accentHover: '#B8DBC5',
          positive: '#48A37E',
          negative: '#D97371',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        dropdown: '0 4px 12px 0 rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
