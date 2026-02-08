/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'cursor-bg': '#0d1117',
                'cursor-sidebar': '#161b22',
                'cursor-border': '#30363d',
                'cursor-accent': '#58a6ff',
                'cursor-text': '#c9d1d9',
                'cursor-muted': '#8b949e',
            },
        },
    },
    plugins: [],
}
