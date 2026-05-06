/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',
        success: '#34a853',
        danger: '#ea4335',
        surface: '#ffffff',
        muted: '#f8f9fa',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.12)',
        float: '0 4px 12px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        card: '8px',
        large: '16px',
      },
    },
  },
  plugins: [],
};
