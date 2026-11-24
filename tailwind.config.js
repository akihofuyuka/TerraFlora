import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx,vue}',
    './components/**/*.{ts,tsx,vue}',
    './app/**/*.{ts,tsx,vue}',
    './src/**/*.{ts,tsx,vue}',
  ],
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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#739CBF',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F9D6DB',
          foreground: '#4A3F3D',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: '#EFE7E2',
          foreground: '#8E807C',
        },
        accent: {
          DEFAULT: '#F9D6DB',
          foreground: '#4A3F3D',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#4A3F3D',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#4A3F3D',
        },
        sakura: {
          bg: '#FFF7F2',
          card: '#FFFFFF',
          border: '#EADFD9',
          slot: '#EFE7E2',
          primary: '#739CBF',
          accent: '#F9D6DB',
          highlight: '#E598A3',
          badge: '#A0D8E8',
          text: '#4A3F3D',
          sub: '#8E807C',
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};
