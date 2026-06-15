/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './resources/**/*.blade.php',
        './resources/**/*.js',
        './resources/**/*.vue',
    ],
    theme: {
        extend: {
            // AD.FACTORY design tokens (design_handoff_adfactory/theme.css).
            // Mapped to CSS variables so dark/light themes + densities switch via
            // [data-theme] / [data-density] on <html>.
            colors: {
                'surface-0': 'var(--surface-0)',
                'surface-1': 'var(--surface-1)',
                'surface-2': 'var(--surface-2)',
                'surface-2b': 'var(--surface-2b)',
                'surface-3': 'var(--surface-3)',
                'surface-inset': 'var(--surface-inset)',
                'border-soft': 'var(--border)',
                'border-strong': 'var(--border-strong)',
                divider: 'var(--divider)',
                ink: 'var(--text-1)',
                'ink-2': 'var(--text-2)',
                'ink-3': 'var(--text-3)',
                'on-accent': 'var(--text-on-accent)',
                accent: 'var(--accent)',
                'accent-hover': 'var(--accent-hover)',
                'accent-soft': 'var(--accent-soft)',
                link: 'var(--link)',
                danger: 'var(--danger)',
                'danger-soft': 'var(--danger-soft)',
                warning: 'var(--warning)',
                success: 'var(--success)',
                info: 'var(--info)',
                'brand-mint': 'var(--brand-mint)',
                'brand-teal': 'var(--brand-teal)',
                'brand-blue': 'var(--brand-blue)',
                'brand-yellow': 'var(--brand-yellow)',
            },
            borderRadius: {
                card: 'var(--r-card)',
                md: 'var(--r-md)',
                input: 'var(--r-input)',
                chip: 'var(--r-chip)',
                pill: 'var(--r-pill)',
            },
            boxShadow: {
                card: 'var(--shadow-card)',
                pop: 'var(--shadow-pop)',
            },
            fontFamily: {
                sans: ['var(--app-font)'],
                mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
            },
        },
    },
    // The existing AD.FACTORY / Growth Portal pages ship their own CSS; keep
    // Tailwind's global reset OFF so utilities are purely opt-in and don't
    // restyle those pages. The design's own reset lives under `.af-app`.
    corePlugins: { preflight: false },
    plugins: [],
};
