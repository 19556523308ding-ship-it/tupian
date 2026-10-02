/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                // 动图坊 蓝紫渐变品牌色系
                brand: {
                    50: '#f0f5ff',
                    100: '#e0eaff',
                    200: '#c7d8fe',
                    300: '#a5bdfc',
                    400: '#7f97f8',
                    500: '#5b6ef2',
                    600: '#4f46e5', // 主品牌色（靛蓝）
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                violet: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                },
                cyan: {
                    50: '#ecfeff',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                },
            },
            backgroundImage: {
                'brand-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a78bfa 100%)',
                'brand-gradient-hover': 'linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #8b5cf6 100%)',
            },
            boxShadow: {
                'brand': '0 8px 24px -6px rgba(79, 70, 229, 0.35)',
                'brand-lg': '0 16px 40px -10px rgba(79, 70, 229, 0.45)',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography')
    ],
};
