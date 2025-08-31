/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F1A',
        panel: '#111827',
        text: '#E5E7EB',
        secondary: '#9CA3AF',
        primary: '#22D3EE',
        revenue: '#22c55e',
        driverpay: '#f59e0b',
        profit: '#06b6d4'
      }
    }
  },
  plugins: []
};
