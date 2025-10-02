/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-soft": "bounce-soft 2s infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%": {
            transform: "scale(0.8)",
            opacity: "1",
          },
          "100%": {
            transform: "scale(2.4)",
            opacity: "0",
          },
        },
        "bounce-soft": {
          "0%, 100%": {
            transform: "translateY(0)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(-5px)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
      },
      boxShadow: {
        ring: "0 0 0 3px rgba(59, 130, 246, 0.3)",
        "ring-red": "0 0 0 3px rgba(239, 68, 68, 0.3)",
        "ring-green": "0 0 0 3px rgba(34, 197, 94, 0.3)",
      },
    },
  },
  plugins: [],
};
