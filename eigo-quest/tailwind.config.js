/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito"', '"M PLUS Rounded 1c"', '"Hiragino Maru Gothic ProN"', '"Yu Gothic"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-10px)' },
          '40%': { transform: 'translateX(10px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        bobble: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        ring: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        flame: {
          '0%,100%': { transform: 'rotate(-4deg) scale(1)' },
          '50%': { transform: 'rotate(4deg) scale(1.12)' },
        },
        confetti: {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(540deg)', opacity: '0.8' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        pop: 'pop 0.35s ease-out',
        'slide-up': 'slideUp 0.28s cubic-bezier(.2,.9,.3,1.1)',
        bobble: 'bobble 1.4s ease-in-out infinite',
        ring: 'ring 1.6s ease-out infinite',
        flame: 'flame 1.2s ease-in-out infinite',
        confetti: 'confetti 3s linear infinite',
      },
    },
  },
  plugins: [],
};