/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0B0F19",
        "night-soft": "#111729",
        electric: "#3b82f6",
        "electric-soft": "#93c5fd",
      },
      boxShadow: {
        glow: "0 0 60px rgba(59, 130, 246, 0.35)",
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      keyframes: {
        "book-open": {
          "0%": { transform: "rotateY(0deg) scale(0.9)" },
          "60%": { transform: "rotateY(-180deg) scale(1.05)" },
          "100%": { transform: "rotateY(-165deg) scale(1)" },
        },
        "fade-slide-up": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.9)" },
          "50%": { opacity: "0.85", transform: "scale(1.15)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(2deg)" },
        },
        "shine": {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
      animation: {
        "book-open": "book-open 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "fade-slide-up": "fade-slide-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
        "shine": "shine 3s linear infinite",
      },
    },
  },
  plugins: [],
};
