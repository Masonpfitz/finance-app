import type { Config } from "tailwindcss";

// Every colour is an "R G B" triplet defined in src/app/theme.css, accent.css and globals.css,
// so each maps as rgb(var(--x) / <alpha-value>) and opacity modifiers (bg-card/60) keep working.
const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

// Radii are base values times --sq-k (1.73 where corner-shape is supported, 1.23 elsewhere).
const sq = (v: string) => `calc(var(--r-${v}) * var(--sq-k))`;

const config: Config = {
  // Pinned to "class": Tailwind 3 defaults to "media", which would make every dark: utility follow the
  // OS setting instead of the in-page Light/Dark switch.
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // The accent. `brand` is the fill (text on it is brand-ink), brand-text is the accent used as
        // text, and brand-pale is for chips and tracks.
        brand: {
          DEFAULT: c("accent"),
          hi: c("accent-hi"),
          lo: c("accent-lo"),
          ink: c("accent-ink"),
          text: c("accent-text"),
          pale: c("accent-pale"),
        },
        // Neutrals.
        tray: { DEFAULT: c("tray"), 2: c("inset-soft") },
        card: { DEFAULT: c("card"), foreground: c("ink") },
        pop: c("pop"),
        inset: { DEFAULT: c("inset"), soft: c("inset-soft") },
        track: { DEFAULT: c("track"), on: c("track-on") },
        ink: { DEFAULT: c("ink"), 2: c("ink-2"), 3: c("ink-3") },
        // Fixed inks for text on a coloured fill; they do not flip with the theme.
        "on-dark": c("on-dark"),
        "on-light": c("on-light"),
        tooltip: { DEFAULT: c("tooltip-bg"), ink: c("tooltip-ink") },
        line: c("line"),
        // Already translucent in the kit, so no opacity modifier on these two.
        "hover-fill": "var(--hover-fill)",
        scrim: "var(--scrim)",

        // Quiet green for chart hatching.
        sage: { DEFAULT: c("sage"), pale: c("sage-pale") },
        // The alert colour. `rust` is for text and tints (it lightens in dark);
        // `rust-fill` is the solid fill that carries white text in both themes.
        rust: { DEFAULT: c("bad"), fill: c("bad-fill") },

        // Status. Each pairs a pale fill with a saturated same-hue foreground.
        st: {
          idle: c("st-idle"), "idle-bg": c("st-idle-bg"),
          pending: c("st-pending"), "pending-bg": c("st-pending-bg"),
          info: c("st-info"), "info-bg": c("st-info-bg"),
          done: c("st-done"), "done-bg": c("st-done-bg"),
          alert: c("st-alert"), "alert-bg": c("st-alert-bg"),
        },

        // Category ramp, by spend rank. cat-0 is the biggest spender.
        cat: {
          0: c("cat-0"), 1: c("cat-1"), 2: c("cat-2"), 3: c("cat-3"),
          4: c("cat-4"), 5: c("cat-5"), 6: c("cat-6"), 7: c("cat-7"),
        },

        // shadcn-shaped aliases, kept so the older panels (chat, bank update, person
        // switcher) resolve to the same tokens in both themes.
        border: c("line"),
        input: c("line"),
        ring: c("accent-text"),
        background: c("card"),
        foreground: c("ink"),
        primary: { DEFAULT: c("accent"), foreground: c("accent-ink") },
        secondary: { DEFAULT: c("sage-pale"), foreground: c("ink") },
        destructive: { DEFAULT: c("bad-fill"), foreground: c("on-dark") },
        muted: { DEFAULT: c("inset-soft"), foreground: c("ink-2") },
        accent: { DEFAULT: c("sage-pale"), foreground: c("ink") },
        popover: { DEFAULT: c("pop"), foreground: c("ink") },
      },
      boxShadow: {
        // Each is a full elevation: top-edge light, hairline ring, shadow.
        card: "var(--elev-card)",
        raised: "var(--elev-raised)",
        pop: "var(--elev-pop)",
      },
      borderRadius: {
        surface: sq("surface"),
        panel: sq("card"),
        section: sq("section"),
        control: sq("control"),
        pill: "var(--r-pill)",
        // shadcn aliases
        lg: sq("control"),
        md: `calc(${sq("control")} - 4px)`,
        sm: `calc(${sq("control")} - 8px)`,
      },
      fontFamily: {
        // System font stack: SF Pro on a Mac, Segoe UI on Windows, nothing downloaded.
        sans: ["var(--font-sans)"],
        // Code-like values only. Figures use the sans with tabular-nums (.tnum).
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        // The scale. Anything outside this is a one-off and should be questioned.
        label: ["12px", { lineHeight: "1.35" }],
        body: ["13px", { lineHeight: "1.45" }],
        lead: ["15px", { lineHeight: "1.4" }],
        title: ["18px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "figure-sm": ["26px", { lineHeight: "1.1", letterSpacing: "-0.01em", fontWeight: "600" }],
        figure: ["44px", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};
export default config;
