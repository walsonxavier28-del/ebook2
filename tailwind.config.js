/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#121826",
        "night-soft": "#1a2336",
        electric: "#388bfd",
        "electric-soft": "#70b5ff",
      },
      boxShadow: {
        glow: "0 2px 8px -1px rgba(56, 139, 253, 0.25)",
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
