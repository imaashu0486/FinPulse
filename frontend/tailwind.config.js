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
        brand: {
          50: '#EEF2FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#1E1B4B',
        },
        dark: {
          950: '#070A12',
          900: '#0B0F19',
          850: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        gain: '#10B981',
        loss: '#F43F5E',
      },
    },
  },
  plugins: [],
};
