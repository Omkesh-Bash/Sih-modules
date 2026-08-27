/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 1px 2px rgb(15 23 42 / 0.08), 0 10px 30px rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};
