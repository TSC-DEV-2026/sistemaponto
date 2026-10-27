/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        brand: {
          ink: "#0A0A0A",
          paper: "#F4F4F5",
          panel: "#F3F4F6",
          muted: "#52525B",
          quiet: "#71717A",
          placeholder: "#9CA3AF",
          cta: "#1E8A3A",
          "cta-hover": "#219440",
          "cta-deep": "#187432",
          line: "#222222",
          accent: "#7CCF12",
          danger: "#EF5350",
        },
      },
    },
  },
  plugins: [],
}
