/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#FAFAFA",
        "surface-2": "#F4F4F5",
        border: "#E4E4E7",
        primary: "#18181B",
        accent: "#7C3AED",
        "accent-glow": "rgba(124, 58, 237, 0.08)",
        "text-primary": "#18181B",
        "text-secondary": "#71717A",
        "text-light": "#A1A1AA",
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
        'badge': '6px',
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06)",
        dropdown: "0 4px 16px rgba(0,0,0,0.08)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      transitionTimingFunction: {
        DEFAULT: "ease",
      },
    },
  },
  plugins: [],
}
