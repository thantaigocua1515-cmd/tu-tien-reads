/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        gold: '0 10px 25px rgba(245, 158, 11, 0.18)',
      },
      colors: {
        night: '#07141d',
        jade: '#0ea5a4',
        gold: '#f8d977',
        ember: '#f59e0b',
        mist: '#dfe7ef',
      },
      backgroundImage: {
        'cultivation-bg': 'radial-gradient(circle at top, rgba(14,165,164,0.15), transparent 30%), linear-gradient(180deg, #07141d 0%, #020b10 100%)',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(248, 217, 119, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(248, 217, 119, 0.6)' },
        },
      },
      animation: {
        glow: 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
