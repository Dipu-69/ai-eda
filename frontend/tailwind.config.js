/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#6C5CE7",
          600: "#5b4bd1"
        }
      }
    }
  },
  plugins: []
};