/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 20px 60px -24px rgba(15, 23, 42, 0.18)",
      },
      backgroundImage: {
        "page-radial":
          "radial-gradient(circle at top, rgba(59, 130, 246, 0.14), transparent 35%), radial-gradient(circle at right, rgba(15, 23, 42, 0.08), transparent 28%)",
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "float-in": "floatIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
