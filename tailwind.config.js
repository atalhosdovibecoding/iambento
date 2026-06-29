/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#111111",
        ink: "#050505",
        coal: "#1a1818",
        smoke: "#bdb7ae",
        bone: "#f2eee6",
        wine: "#4a0711",
        gold: "#ff2a3d"
      },
      boxShadow: {
        premium: "0 24px 80px rgba(0, 0, 0, 0.52)",
        gold: "0 18px 58px rgba(255, 42, 61, 0.22)"
      },
      fontFamily: {
        sans: ["Inter", "Aptos", "Segoe UI", "Arial", "sans-serif"],
        display: ["Satoshi", "Inter", "Aptos", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
