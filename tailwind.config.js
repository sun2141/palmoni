/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
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
        // Dark Premium Palette
        gold: {
          DEFAULT: "#C9A84C",
          light: "#E0BE6A",
          dim: "rgba(201, 168, 76, 0.12)",
        },
        surface: {
          1: "#1A1D26",
          2: "#1E2130",
          3: "#242838",
        },
        navy: {
          DEFAULT: "#0D0F14",
          mid: "#111318",
          light: "#141720",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Noto Serif KR', 'Georgia', 'serif'],
        prayer: ['Noto Serif KR', 'Playfair Display', 'Georgia', 'serif'],
        mono: ['Space Mono', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(160deg, #0D0F14 0%, #111318 40%, #141720 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C9A84C 0%, #E0BE6A 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(30, 33, 48, 1) 0%, rgba(26, 29, 38, 1) 100%)',
        'gradient-hero': 'radial-gradient(ellipse at 50% 0%, rgba(201, 168, 76, 0.12) 0%, transparent 60%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201, 168, 76, 0.2)',
        'gold-lg': '0 0 40px rgba(201, 168, 76, 0.3)',
        'card-dark': '0 2px 12px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)',
        'card-dark-hover': '0 8px 24px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'gold-pulse': 'goldPulse 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}
