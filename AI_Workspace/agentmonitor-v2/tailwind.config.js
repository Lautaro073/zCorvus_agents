/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        state: {
          idle: {
            DEFAULT: "hsl(var(--state-idle))",
            foreground: "hsl(var(--state-idle-foreground))",
          },
          active: {
            DEFAULT: "hsl(var(--state-active))",
            foreground: "hsl(var(--state-active-foreground))",
          },
          "in-progress": {
            DEFAULT: "hsl(var(--state-in-progress))",
            foreground: "hsl(var(--state-in-progress-foreground))",
          },
          blocked: {
            DEFAULT: "hsl(var(--state-blocked))",
            foreground: "hsl(var(--state-blocked-foreground))",
          },
          completed: {
            DEFAULT: "hsl(var(--state-completed))",
            foreground: "hsl(var(--state-completed-foreground))",
          },
          failed: {
            DEFAULT: "hsl(var(--state-failed))",
            foreground: "hsl(var(--state-failed-foreground))",
          },
          pending: {
            DEFAULT: "hsl(var(--state-pending))",
            foreground: "hsl(var(--state-pending-foreground))",
          },
          incident: {
            DEFAULT: "hsl(var(--state-incident))",
            foreground: "hsl(var(--state-incident-foreground))",
          },
        },
      },
      boxShadow: {
        "glow-active": "var(--shadow-glow-active)",
        "glow-blocked": "var(--shadow-glow-blocked)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
