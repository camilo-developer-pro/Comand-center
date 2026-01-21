import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class', // This is required for next-themes to work with class attribute
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};

export default config;
