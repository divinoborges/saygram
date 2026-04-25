import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Layout-only utility classes are kept; visual properties (color, typography,
  // radius, shadow) come from M3 token CSS variables, not Tailwind extensions.
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
